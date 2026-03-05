// src/pages/ShowcaseMode.tsx
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Presentation, Printer } from "lucide-react";
import ShowcaseStats from "@/components/teacher/ShowcaseStats";
import TakeHomeCards from "@/components/teacher/TakeHomeCards";

const TOTAL_SLIDES = 6;

export default function ShowcaseMode() {
  const { t } = useTranslation();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showTakeHome, setShowTakeHome] = useState(false);
  const [classCode] = useState(
    () => localStorage.getItem("bb_last_showcase_code") || "STARS1",
  );

  // Keyboard navigation
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        setCurrentSlide((c) => Math.min(c + 1, TOTAL_SLIDES - 1));
      } else if (e.key === "ArrowLeft") {
        setCurrentSlide((c) => Math.max(c - 1, 0));
      } else if (e.key === "Escape") {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isFullscreen]);

  const startShowcase = useCallback(() => {
    setCurrentSlide(0);
    setIsFullscreen(true);
  }, []);

  // Pre-showcase setup screen
  if (!isFullscreen) {
    return (
      <div className="w-full space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-brightboost-navy">
            {t("showcase.title")}
          </h1>
          <p className="text-sm text-gray-500">
            Full-screen bilingual presentation for families
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-8 text-center max-w-lg mx-auto">
          <Presentation className="w-16 h-16 mx-auto text-brightboost-blue mb-4" />
          <h2 className="text-xl font-bold text-brightboost-navy mb-2">
            Ready to present?
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            6 bilingual slides with student achievements.
            <br />
            Use arrow keys to navigate, ESC to exit.
          </p>

          <div className="space-y-3">
            <button
              onClick={startShowcase}
              className="w-full px-6 py-3 bg-brightboost-blue text-white font-bold rounded-xl hover:bg-brightboost-navy transition-all text-lg"
            >
              {t("showcase.startShowcase")}
            </button>
            <button
              onClick={() => setShowTakeHome(true)}
              className="w-full px-6 py-3 bg-purple-100 text-purple-700 font-semibold rounded-xl hover:bg-purple-200 transition-all flex items-center justify-center gap-2"
            >
              <Printer className="w-5 h-5" />
              {t("showcase.takeHomeCards")}
            </button>
          </div>
        </div>

        {showTakeHome && (
          <TakeHomeCards
            classCode={classCode}
            onClose={() => setShowTakeHome(false)}
          />
        )}
      </div>
    );
  }

  // Fullscreen showcase
  const slides = [
    // Slide 1: Welcome
    <div key="s1" className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 text-white px-8">
      <motion.h1
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-5xl md:text-7xl font-bold text-center mb-4"
      >
        {t("showcase.slide1Title")}
      </motion.h1>
      <motion.p
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-2xl md:text-3xl text-blue-200 text-center"
      >
        ¡Bienvenidos a la Noche Familiar STEAM!
      </motion.p>
      <motion.p
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-lg text-blue-300 mt-4"
      >
        {t("showcase.slide1Subtitle")}
      </motion.p>
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.9, type: "spring" }}
        className="text-8xl mt-8"
      >
        🚀
      </motion.div>
    </div>,

    // Slide 2: What We Learned
    <div key="s2" className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-green-900 via-emerald-900 to-teal-900 text-white px-8">
      <motion.h1
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="text-4xl md:text-6xl font-bold text-center mb-2"
      >
        {t("showcase.slide2Title")}
      </motion.h1>
      <motion.p
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-xl text-green-200 mb-8"
      >
        Lo Que Aprendimos
      </motion.p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl">
        {[
          { emoji: "🎵", label: "Rhyme & Ride / Rimas" },
          { emoji: "🌿", label: "Bounce & Buds / Ciencia" },
          { emoji: "⚙️", label: "Gotcha Gears / Estrategia" },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 + i * 0.15 }}
            className="text-center bg-white/10 rounded-xl p-6"
          >
            <span className="text-5xl">{item.emoji}</span>
            <p className="text-sm mt-2 font-medium">{item.label}</p>
          </motion.div>
        ))}
      </div>
    </div>,

    // Slide 3: Student Achievements
    <div key="s3" className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-purple-900 via-violet-900 to-fuchsia-900 text-white px-8">
      <motion.h1
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-4xl md:text-6xl font-bold text-center mb-2"
      >
        {t("showcase.slide3Title")}
      </motion.h1>
      <motion.p
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-xl text-purple-200 mb-8"
      >
        Logros de los Estudiantes
      </motion.p>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <ShowcaseStats />
      </motion.div>
    </div>,

    // Slide 4: Live Demo
    <div key="s4" className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-orange-900 via-red-900 to-rose-900 text-white px-8">
      <motion.h1
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-4xl md:text-6xl font-bold text-center mb-2"
      >
        {t("showcase.slide4Title")}
      </motion.h1>
      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-xl text-orange-200 mb-8"
      >
        Demostración en Vivo
      </motion.p>
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.4, type: "spring" }}
        className="bg-white/10 rounded-2xl p-8 text-center"
      >
        <span className="text-7xl block mb-4">🎮</span>
        <p className="text-2xl font-bold">{t("showcase.slide4Subtitle")}</p>
        <p className="text-lg text-orange-200 mt-2">¡Pruébalo tú mismo!</p>
        <div className="mt-6 bg-white/20 rounded-xl px-6 py-3">
          <p className="text-sm text-orange-100">Class Code / Código:</p>
          <p className="text-3xl font-mono font-bold tracking-widest">
            {classCode}
          </p>
        </div>
      </motion.div>
    </div>,

    // Slide 5: Family Activities
    <div key="s5" className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-cyan-900 via-blue-900 to-indigo-900 text-white px-8">
      <motion.h1
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-4xl md:text-6xl font-bold text-center mb-2"
      >
        {t("showcase.slide5Title")}
      </motion.h1>
      <motion.p
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-xl text-cyan-200 mb-8"
      >
        Actividades Familiares
      </motion.p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full">
        {[
          { emoji: "🧱", key: "familyActivity1" },
          { emoji: "🔢", key: "familyActivity2" },
          { emoji: "🎨", key: "familyActivity3" },
          { emoji: "🗂️", key: "familyActivity4" },
        ].map((item, i) => (
          <motion.div
            key={item.key}
            initial={{ x: i % 2 === 0 ? -40 : 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 + i * 0.15 }}
            className="bg-white/10 rounded-xl p-5 flex items-start gap-3"
          >
            <span className="text-3xl">{item.emoji}</span>
            <p className="text-sm md:text-base">
              {t(`showcase.${item.key}`)}
            </p>
          </motion.div>
        ))}
      </div>
    </div>,

    // Slide 6: Thank You
    <div key="s6" className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-yellow-800 via-amber-900 to-orange-900 text-white px-8">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", damping: 10 }}
        className="text-8xl mb-6"
      >
        🎉
      </motion.div>
      <motion.h1
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-5xl md:text-7xl font-bold text-center mb-2"
      >
        {t("showcase.slide6Title")}
      </motion.h1>
      <motion.p
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-2xl text-amber-200 mb-4"
      >
        ¡Gracias!
      </motion.p>
      <motion.p
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="text-lg text-amber-300"
      >
        {t("showcase.slide6Subtitle")}
      </motion.p>
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="mt-8 bg-white/10 rounded-xl px-8 py-4 text-center"
      >
        <p className="text-sm text-amber-200">
          {t("showcase.continueAtHome")} / ¡Continúa aprendiendo en casa!
        </p>
        <p className="text-2xl font-mono font-bold tracking-widest mt-2">
          {classCode}
        </p>
      </motion.div>
    </div>,
  ];

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            {slides[currentSlide]}
          </motion.div>
        </AnimatePresence>

        {/* Navigation arrows */}
        {currentSlide > 0 && (
          <button
            onClick={() => setCurrentSlide((c) => c - 1)}
            className="fixed left-4 top-1/2 -translate-y-1/2 z-50 p-3 bg-white/20 rounded-full hover:bg-white/30 text-white transition-colors"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
        )}
        {currentSlide < TOTAL_SLIDES - 1 && (
          <button
            onClick={() => setCurrentSlide((c) => c + 1)}
            className="fixed right-4 top-1/2 -translate-y-1/2 z-50 p-3 bg-white/20 rounded-full hover:bg-white/30 text-white transition-colors"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        )}

        {/* Bottom bar: dots + controls */}
        <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-black/50">
          {/* Slide dots */}
          <div className="flex gap-2">
            {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`w-3 h-3 rounded-full transition-all ${
                  i === currentSlide
                    ? "bg-white scale-125"
                    : "bg-white/40 hover:bg-white/60"
                }`}
              />
            ))}
          </div>

          {/* Slide counter + exit */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-white/60">
              {t("showcase.slideOf", {
                current: currentSlide + 1,
                total: TOTAL_SLIDES,
              })}
            </span>
            <button
              onClick={() => setIsFullscreen(false)}
              className="px-4 py-1.5 bg-white/20 text-white text-sm rounded-md hover:bg-white/30 transition-colors"
            >
              {t("showcase.exitShowcase")}
            </button>
          </div>
        </div>

        {/* ESC hint */}
        <div className="fixed top-4 right-4 z-50">
          <p className="text-xs text-white/40">
            {t("showcase.pressEscToExit")}
          </p>
        </div>
      </div>
    </>
  );
}
