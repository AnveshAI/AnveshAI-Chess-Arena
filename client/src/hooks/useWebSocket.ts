import { useEffect, useRef } from 'react';
import { wsManager } from '@/lib/websocket';

export function useWebSocket() {
  const isConnected = useRef(false);

  useEffect(() => {
    if (!isConnected.current) {
      wsManager.connect();
      isConnected.current = true;
    }

    return () => {
      wsManager.disconnect();
      isConnected.current = false;
    };
  }, []);

  const joinGame = (gameId: string, userId: string, isAdmin: boolean = false) => {
    wsManager.send('join_game', { gameId, userId, isAdmin });
  };

  const spectateGame = (gameId: string) => {
    wsManager.send('spectate_game', { gameId });
  };

  const broadcastGameUpdate = (gameState: any) => {
    wsManager.send('game_update', { gameState });
  };

  const subscribe = (event: string, callback: Function) => {
    wsManager.on(event, callback);
    return () => wsManager.off(event, callback);
  };

  return {
    joinGame,
    spectateGame,
    broadcastGameUpdate,
    subscribe,
  };
}
