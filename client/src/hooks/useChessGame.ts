import { useState, useCallback, useEffect } from 'react';
import { Chess } from 'chess.js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useWebSocket } from './useWebSocket';

export interface ChessPiece {
  type: string;
  color: 'w' | 'b';
}

export interface ChessSquare {
  piece: ChessPiece | null;
  square: string;
}

export function useChessGame(gameId?: string) {
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<string[]>([]);
  const [chess] = useState(() => new Chess());
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { broadcastGameUpdate } = useWebSocket();

  // Fetch game data
  const { data: game, isLoading } = useQuery({
    queryKey: ['/api/games', gameId],
    enabled: !!gameId,
  });

  // Fetch moves
  const { data: moves } = useQuery({
    queryKey: ['/api/games', gameId, 'moves'],
    enabled: !!gameId,
  });

  // Create new game mutation
  const createGameMutation = useMutation({
    mutationFn: async ({ playerColor, aiDifficulty }: { playerColor: string; aiDifficulty: number }) => {
      const res = await apiRequest('POST', '/api/games', { playerColor, aiDifficulty });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/games'] });
      toast({
        title: "Game Created",
        description: "New game started successfully!",
      });
      
      // Redirect to the new game
      if (data.id) {
        window.location.href = `/game/${data.id}`;
      }
    },
    onError: (error: any) => {
      console.error('Game creation error:', error);
      toast({
        title: "Error", 
        description: error?.message || "Failed to create game",
        variant: "destructive",
      });
    },
  });

  // Make move mutation
  const makeMoveMutation = useMutation({
    mutationFn: async ({ move }: { move: string }) => {
      const res = await apiRequest('POST', `/api/games/${gameId}/moves`, { move });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/games', gameId] });
      queryClient.invalidateQueries({ queryKey: ['/api/games', gameId, 'moves'] });
      
      // Broadcast update to other clients
      broadcastGameUpdate(data.gameState);
      
      if (data.gameOver) {
        toast({
          title: "Game Over",
          description: "The game has ended!",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Invalid Move",
        description: "That move is not allowed",
        variant: "destructive",
      });
    },
  });

  // Update chess position when game data changes
  useEffect(() => {
    if (game?.currentFen) {
      chess.load(game.currentFen);
    }
  }, [game?.currentFen, chess]);

  const handleSquareClick = useCallback((square: string) => {
    if (selectedSquare === square) {
      // Deselect
      setSelectedSquare(null);
      setPossibleMoves([]);
      return;
    }

    if (selectedSquare && possibleMoves.includes(square)) {
      // Make move
      const move = selectedSquare + square;
      makeMoveMutation.mutate({ move });
      setSelectedSquare(null);
      setPossibleMoves([]);
      return;
    }

    // Select new square
    const piece = chess.get(square as any);
    if (piece && piece.color === chess.turn()) {
      setSelectedSquare(square);
      const moves = chess.moves({ square: square as any, verbose: true });
      setPossibleMoves(moves.map(move => move.to));
    } else {
      setSelectedSquare(null);
      setPossibleMoves([]);
    }
  }, [selectedSquare, possibleMoves, chess, makeMoveMutation]);

  const getBoardState = useCallback(() => {
    const board: ChessSquare[] = [];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

    for (const rank of ranks) {
      for (const file of files) {
        const square = file + rank;
        const piece = chess.get(square as any);
        board.push({
          piece: piece || null,
          square,
        });
      }
    }

    return board;
  }, [chess]);

  const isSquareSelected = useCallback((square: string) => {
    return selectedSquare === square;
  }, [selectedSquare]);

  const isSquarePossibleMove = useCallback((square: string) => {
    return possibleMoves.includes(square);
  }, [possibleMoves]);

  const isSquareLight = useCallback((square: string) => {
    const file = square.charCodeAt(0) - 97; // a=0, b=1, etc.
    const rank = parseInt(square[1]) - 1; // 1=0, 2=1, etc.
    return (file + rank) % 2 === 0;
  }, []);

  return {
    game,
    moves,
    isLoading,
    selectedSquare,
    possibleMoves,
    createGame: createGameMutation.mutate,
    isCreatingGame: createGameMutation.isPending,
    makeMove: makeMoveMutation.mutate,
    isMakingMove: makeMoveMutation.isPending,
    handleSquareClick,
    getBoardState,
    isSquareSelected,
    isSquarePossibleMove,
    isSquareLight,
  };
}
