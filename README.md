
# AnveshAI Chess Arena

A full-stack chess application that allows users to play against an AI opponent powered by the Stockfish chess engine. Features a modern React frontend, Express.js backend with WebSocket support, and PostgreSQL database for data persistence.

![Chess Arena](https://img.shields.io/badge/Chess-Arena-blue)
![React](https://img.shields.io/badge/React-18.3.1-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6.3-blue)
![Express](https://img.shields.io/badge/Express-4.21.2-green)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)

## Features

- 🤖 **AI Opponent**: Play against AnveshAI powered by Stockfish engine with adjustable difficulty levels
- 📊 **Deep Game Analysis**: Get detailed post-game analysis with move classifications and improvement suggestions
- ⚡ **Real-time Evaluation**: See position evaluation and best moves as you play
- 👥 **Spectator Mode**: Admin users can watch active games in real-time
- 🔐 **Authentication**: Replit Auth integration with session management
- 📱 **Responsive Design**: Modern UI built with shadcn/ui components and Tailwind CSS

## Tech Stack

### Frontend
- **React** with TypeScript and Vite
- **shadcn/ui** components built on Radix UI primitives
- **Tailwind CSS** for styling
- **TanStack React Query** for state management
- **Wouter** for client-side routing
- **chess.js** for game logic and move validation

### Backend
- **Express.js** with TypeScript
- **WebSocket** server for real-time communication
- **Stockfish** chess engine integration
- **Drizzle ORM** with PostgreSQL
- **Replit Auth** with session management

### Database
- **PostgreSQL** with the following schema:
  - Users table for authentication and profiles
  - Games table for game state and metadata
  - Moves table for complete game history
  - Analyses table for post-game analysis
  - Sessions table for authentication persistence

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 16
- Stockfish chess engine

### Installation

1. Clone the repository:
```bash
git clone https://github.com/AnveshAI/AnveshAI-Chess-Arena
cd anveshai-chess-arena
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Database connection
DATABASE_URL=your_postgresql_connection_string

# Session secret
SESSION_SECRET=your_session_secret

```

4. Push database schema:
```bash
npm run db:push
```

5. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5000`.

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run check` - Type checking
- `npm run db:push` - Push database schema changes

## Game Features

### Difficulty Levels
- **Beginner**: Stockfish depth 1-3
- **Intermediate**: Stockfish depth 4-6
- **Advanced**: Stockfish depth 7-10
- **Expert**: Stockfish depth 11+

### Analysis Features
- Move-by-move position evaluation
- Best move suggestions
- Tactical pattern recognition
- Game result classification (win/loss/draw reasons)

### Real-time Features
- Live game updates via WebSocket
- Spectator mode for admin users
- Automatic reconnection with exponential backoff
- Game broadcasting to connected clients

## API Endpoints

### Games
- `GET /api/games` - List games
- `POST /api/games` - Create new game
- `GET /api/games/:id` - Get game details
- `POST /api/games/:id/moves` - Make a move
- `GET /api/games/:id/moves` - Get game moves
- `POST /api/games/:id/analyze` - Analyze game

### Authentication
- `GET /api/auth/user` - Get current user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout

## WebSocket Events

### Client to Server
- `join_game` - Join a game room
- `leave_game` - Leave a game room
- `spectate_game` - Watch a game (admin only)

### Server to Client
- `game_update` - Game state changed
- `move_made` - New move made
- `game_ended` - Game finished
- `analysis_complete` - Analysis ready

## Architecture

### Frontend Architecture
```
client/src/
├── components/        # Reusable UI components
│   ├── ui/           # shadcn/ui components
│   ├── ChessBoard.tsx
│   ├── GameControls.tsx
│   └── ...
├── hooks/            # Custom React hooks
├── lib/              # Utility functions
├── pages/            # Route components
└── App.tsx           # Main application
```

### Backend Architecture
```
server/
├── services/         # Business logic
│   ├── chess.ts      # Chess game logic
│   └── stockfish.ts  # AI engine integration
├── db.ts             # Database connection
├── routes.ts         # API routes
├── replitAuth.ts     # Authentication
└── index.ts          # Server entry point
```

## Database Schema

```sql
-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  replit_id VARCHAR UNIQUE,
  username VARCHAR,
  display_name VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Games table
CREATE TABLE games (
  id VARCHAR PRIMARY KEY,
  white_player_id INTEGER REFERENCES users(id),
  black_player_id INTEGER REFERENCES users(id),
  status VARCHAR,
  fen VARCHAR,
  pgn TEXT,
  difficulty VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Moves table
CREATE TABLE moves (
  id VARCHAR PRIMARY KEY,
  game_id VARCHAR REFERENCES games(id),
  move_number INTEGER,
  san VARCHAR,
  fen VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Stockfish](https://stockfishchess.org/) - The powerful chess engine
- [chess.js](https://github.com/jhlywa/chess.js) - Chess game logic library
- [shadcn/ui](https://ui.shadcn.com/) - Beautiful UI components

## Support

- **Issues**: [GitHub Issues](https://github.com/AnveshAI/AnveshAI-Chess-Arena/issues)

## Show Your Support

If you find this project helpful, please consider giving it a ⭐ on GitHub!

---

**Made with ❤️ by the AnveshAI team**
