
import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface CardFlipProps {
  front: React.ReactNode;
  back: React.ReactNode;
  className?: string;
}

const CardFlip = ({ front, back, className }: CardFlipProps) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <div 
      className={cn("h-full w-full perspective-1000", className)}
      onClick={handleFlip}
    >
      <div 
        className={cn(
          "relative w-full h-full duration-500 transform-style-3d transition-all cursor-pointer",
          isFlipped ? "rotate-y-180" : ""
        )}
      >
        <div className="absolute w-full h-full backface-hidden">
          {front}
        </div>
        <div className="absolute w-full h-full backface-hidden rotate-y-180">
          {back}
        </div>
      </div>
    </div>
  );
};

export default CardFlip;

// Add this to your CSS
document.head.appendChild(document.createElement('style')).innerHTML = `
  .perspective-1000 {
    perspective: 1000px;
  }

  .transform-style-3d {
    transform-style: preserve-3d;
  }

  .backface-hidden {
    backface-visibility: hidden;
  }

  .rotate-y-180 {
    transform: rotateY(180deg);
  }
`;
