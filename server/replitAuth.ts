import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import MemoryStore from "memorystore";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  
  let sessionStore;
  if (process.env.DATABASE_URL) {
    console.log('Using PostgreSQL session storage');
    const pgStore = connectPg(session);
    sessionStore = new pgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
      ttl: sessionTtl,
      tableName: "sessions",
    });
  } else {
    console.log('Using memory session storage');
    const MemStore = MemoryStore(session);
    sessionStore = new MemStore({
      checkPeriod: 86400000, // prune expired entries every 24h
      ttl: sessionTtl,
    });
  }
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: true, // Allow sessions for guests
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Only secure in production
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};

// Optional authentication middleware - sets auth info if available, but allows guests to proceed
export const optionalAuth: RequestHandler = async (req, res, next) => {
  try {
    const user = req.user as any;
    console.log('[optionalAuth] Request received for:', req.method, req.url);
    console.log('[optionalAuth] isAuthenticated:', req.isAuthenticated ? req.isAuthenticated() : false);
    console.log('[optionalAuth] user:', !!user);
    console.log('[optionalAuth] sessionID:', req.sessionID);

    // If not authenticated, just proceed as guest
    if (!req.isAuthenticated() || !user?.expires_at) {
      // Set a flag to indicate this is a guest user
      (req as any).isGuest = true;
      (req as any).guestId = req.sessionID || `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('[optionalAuth] Proceeding as guest with ID:', (req as any).guestId);
      return next();
    }

    const now = Math.floor(Date.now() / 1000);
    if (now <= user.expires_at) {
      (req as any).isGuest = false;
      console.log('[optionalAuth] User authenticated and token valid');
      return next();
    }

    // Try to refresh token if expired
    const refreshToken = user.refresh_token;
    if (!refreshToken) {
      // Token refresh failed, treat as guest
      (req as any).isGuest = true;
      (req as any).guestId = req.sessionID || `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('[optionalAuth] No refresh token, proceeding as guest');
      return next();
    }

    try {
      const config = await getOidcConfig();
      const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
      updateUserSession(user, tokenResponse);
      (req as any).isGuest = false;
      console.log('[optionalAuth] Token refreshed successfully');
      return next();
    } catch (error) {
      // Token refresh failed, treat as guest
      (req as any).isGuest = true;
      (req as any).guestId = req.sessionID || `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('[optionalAuth] Token refresh failed, proceeding as guest');
      return next();
    }
  } catch (error) {
    console.error('[optionalAuth] Middleware error:', error);
    // On any error, default to guest access
    (req as any).isGuest = true;
    (req as any).guestId = req.sessionID || `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('[optionalAuth] Error occurred, proceeding as guest');
    return next();
  }
};
