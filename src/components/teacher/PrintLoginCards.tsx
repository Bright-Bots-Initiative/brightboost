import React from "react";

interface LoginCard {
  name: string;
  icon: string;
  hasPin: boolean;
}

interface PrintLoginCardsProps {
  className: string;
  joinCode: string;
  cards: LoginCard[];
  onClose: () => void;
}

const PrintLoginCards: React.FC<PrintLoginCardsProps> = ({
  className,
  joinCode,
  cards,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-auto">
      {/* Screen-only controls */}
      <div className="print:hidden flex items-center justify-between p-4 bg-slate-100 border-b">
        <h2 className="text-lg font-bold text-slate-800">
          Login Cards — {className}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-brightboost-blue text-white rounded-md hover:bg-brightboost-navy"
          >
            Print
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>

      {/* Printable cards grid */}
      <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-4 print:grid-cols-3 print:gap-2 print:p-2">
        {cards.map((card, i) => (
          <div
            key={i}
            className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center text-center print:p-4 print:break-inside-avoid"
          >
            {/* Icon */}
            <span className="text-6xl mb-3 print:text-5xl">{card.icon}</span>
            {/* Name */}
            <p className="text-xl font-bold text-slate-800 mb-2 print:text-lg">
              {card.name}
            </p>
            {/* Class code */}
            <div className="bg-blue-50 rounded-lg px-4 py-2 mb-2">
              <p className="text-xs text-gray-500 uppercase tracking-wider">
                Class Code
              </p>
              <p className="text-2xl font-mono font-bold text-brightboost-blue tracking-widest print:text-xl">
                {joinCode}
              </p>
            </div>
            {/* PIN hint */}
            {card.hasPin && (
              <p className="text-xs text-gray-400 mt-1">
                Ask your teacher for your PIN
              </p>
            )}
            {/* Instructions */}
            <p className="text-xs text-gray-500 mt-2">
              Go to BrightBoost → "I'm a Student!" → Type the code → Find your icon
            </p>
          </div>
        ))}
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .fixed * { visibility: visible; }
          .fixed { position: static; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default PrintLoginCards;
