// src/components/teacher/TakeHomeCards.tsx
import { useTranslation } from "react-i18next";

interface TakeHomeCardsProps {
  classCode: string;
  onClose: () => void;
}

export default function TakeHomeCards({ classCode, onClose }: TakeHomeCardsProps) {
  const { t } = useTranslation();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-auto">
      {/* Screen-only controls */}
      <div className="print:hidden flex items-center justify-between p-4 bg-slate-100 border-b">
        <h2 className="text-lg font-bold text-slate-800">
          {t("showcase.takeHomeCards")}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-brightboost-blue text-white rounded-md hover:bg-brightboost-navy"
          >
            {t("common.print")}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            {t("common.close")}
          </button>
        </div>
      </div>

      {/* Printable cards */}
      <div className="p-4 grid grid-cols-2 gap-6 print:gap-4 print:p-2">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center print:p-6 print:break-inside-avoid"
          >
            {/* Logo */}
            <h2 className="text-2xl font-bold text-brightboost-navy mb-1">
              Bright Boost
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Learn. Play. Explore!
            </p>

            {/* Bilingual message */}
            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <p className="text-base font-semibold text-blue-800">
                {t("showcase.continueAtHome")}
              </p>
              <p className="text-sm text-blue-600 mt-1">
                ¡Continúa aprendiendo en casa!
              </p>
            </div>

            {/* Class code */}
            <div className="mb-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider">
                Class Code / Código de Clase
              </p>
              <p className="text-3xl font-mono font-bold text-brightboost-blue tracking-widest">
                {classCode}
              </p>
            </div>

            {/* QR placeholder */}
            <div className="w-24 h-24 mx-auto border-2 border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 mb-3">
              <div className="text-center">
                <p className="text-3xl">📱</p>
                <p className="text-[8px] text-gray-400">{t("showcase.scanQr")}</p>
              </div>
            </div>

            {/* Visit URL */}
            <p className="text-xs text-gray-500">
              Visit: brightboost.app
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
}
