import { useCallback } from 'react';
import { ChessSquare } from '@/hooks/useChessGame';
import { cn } from '@/lib/utils';

interface ChessBoardProps {
  boardState: ChessSquare[];
  onSquareClick: (square: string) => void;
  isSquareSelected: (square: string) => boolean;
  isSquarePossibleMove: (square: string) => boolean;
  isSquareLight: (square: string) => boolean;
  playerColor: 'white' | 'black';
}

const pieceUnicode: { [key: string]: string } = {
  'wK': '♔', 'wQ': '♕', 'wR': '♖', 'wB': '♗', 'wN': '♘', 'wP': '♙',
  'bK': '♚', 'bQ': '♛', 'bR': '♜', 'bB': '♝', 'bN': '♞', 'bP': '♟'
};

export default function ChessBoard({
  boardState,
  onSquareClick,
  isSquareSelected,
  isSquarePossibleMove,
  isSquareLight,
  playerColor
}: ChessBoardProps) {
  
  const renderPiece = useCallback((piece: any) => {
    if (!piece) return null;
    const pieceKey = piece.color + piece.type.toUpperCase();
    const isWhite = piece.color === 'w';
    return (
      <span 
        className={cn(
          "chess-piece-symbol",
          isWhite ? "text-chess-white" : "text-chess-black"
        )}
      >
        {pieceUnicode[pieceKey] || ''}
      </span>
    );
  }, []);

  const getSquareClasses = useCallback((square: string) => {
    return cn(
      "chess-square relative cursor-pointer transition-all duration-200",
      "w-[60px] h-[60px] md:w-[70px] md:h-[70px]",
      isSquareLight(square) ? "bg-[#f0d9b5]" : "bg-[#b58863]",
      isSquareSelected(square) && "ring-4 ring-secondary",
      isSquarePossibleMove(square) && "ring-2 ring-primary ring-opacity-60",
      "hover:ring-2 hover:ring-primary hover:ring-opacity-40"
    );
  }, [isSquareLight, isSquareSelected, isSquarePossibleMove]);

  // Create board layout based on player color
  const createBoardLayout = useCallback(() => {
    const ranks = playerColor === 'white' ? ['8', '7', '6', '5', '4', '3', '2', '1'] : ['1', '2', '3', '4', '5', '6', '7', '8'];
    const files = playerColor === 'white' ? ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] : ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];
    
    return ranks.map(rank => 
      files.map(file => {
        const square = file + rank;
        const squareData = boardState.find(s => s.square === square);
        return { square, piece: squareData?.piece };
      })
    );
  }, [boardState, playerColor]);

  const boardLayout = createBoardLayout();
  const files = playerColor === 'white' ? ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] : ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];
  const ranks = playerColor === 'white' ? ['8', '7', '6', '5', '4', '3', '2', '1'] : ['1', '2', '3', '4', '5', '6', '7', '8'];

  return (
    <div className="bg-card border border-border rounded-lg p-6" data-testid="chess-board">
      {/* Board Coordinates - Top */}
      <div className="flex items-center space-x-2 mb-2">
        <div className="w-6"></div>
        <div className="grid grid-cols-8 gap-0">
          {files.map(file => (
            <div key={file} className="w-[60px] md:w-[70px] text-center text-sm text-muted-foreground font-mono">
              {file}
            </div>
          ))}
        </div>
      </div>

      {/* Chess Board */}
      <div className="border-2 border-border rounded-md overflow-hidden">
        {boardLayout.map((row, rowIndex) => (
          <div key={rowIndex} className="flex">
            {/* Rank label */}
            <div className="w-6 h-[60px] md:h-[70px] flex items-center justify-center text-sm text-muted-foreground font-mono bg-muted">
              {ranks[rowIndex]}
            </div>
            
            {/* Board squares */}
            {row.map(({ square, piece }) => (
              <div
                key={square}
                className={getSquareClasses(square)}
                onClick={() => onSquareClick(square)}
                data-testid={`square-${square}`}
              >
                {piece && (
                  <div className="chess-piece w-full h-full flex items-center justify-center user-select-none cursor-grab active:cursor-grabbing">
                    {renderPiece(piece)}
                  </div>
                )}
                
                {/* Possible move indicator */}
                {isSquarePossibleMove(square) && !piece && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-4 h-4 bg-primary rounded-full opacity-60"></div>
                  </div>
                )}
                
                {/* Attack indicator for possible moves with pieces */}
                {isSquarePossibleMove(square) && piece && (
                  <div className="absolute inset-0 border-4 border-destructive rounded-full opacity-60"></div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Mobile move input */}
      <div className="mt-4 md:hidden">
        <input 
          type="text" 
          placeholder="Enter move (e.g., e2e4)" 
          className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm font-mono"
          data-testid="input-move-mobile"
        />
      </div>
    </div>
  );
}
