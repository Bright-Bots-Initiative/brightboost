
import React from 'react';

interface WordGameCardProps {
  title: string;
  letters: string[];
  word: string;
  robotImage?: string;
}

const WordGameCard: React.FC<WordGameCardProps> = ({ 
  title,
  letters,
  word,
  robotImage
}) => {
  return (
    <div className="game-card overflow-hidden">
      <div className="bg-brightboost-blue text-white p-4 rounded-t-xl">
        <h2 className="text-xl font-bold">{title}</h2>
      </div>
      
      <div className="p-6 bg-white rounded-b-xl flex flex-col items-center">
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {letters.map((letter, index) => (
            <div 
              key={index} 
              className="w-14 h-14 rounded-full bg-brightboost-lightblue flex items-center justify-center text-brightboost-navy text-2xl font-bold shadow-md"
            >
              {letter}
            </div>
          ))}
        </div>
        
        <div className="mb-6 flex items-center space-x-2">
          {word.split('').map((_, index) => (
            <div key={index} className="w-8 h-1 bg-brightboost-navy rounded"></div>
          ))}
        </div>
        
        {robotImage && (
          <div className="mt-4 flex justify-center">
            <img src={robotImage} alt="Helper Robot" className="h-16" />
          </div>
        )}
      </div>
    </div>
  );
};

export default WordGameCard;
