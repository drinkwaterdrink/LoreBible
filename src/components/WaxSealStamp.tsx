import React, { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

interface WaxSealStampProps {
  isActive: boolean;
  onComplete?: () => void;
  scenarioTitle?: string;
}

export const WaxSealStamp: React.FC<WaxSealStampProps> = ({
  isActive,
  onComplete,
  scenarioTitle,
}) => {
  useEffect(() => {
    if (isActive) {
      const timer = setTimeout(() => {
        if (onComplete) onComplete();
      }, 1600);
      return () => clearTimeout(timer);
    }
  }, [isActive, onComplete]);

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          id="wax-seal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center bg-black/35 backdrop-blur-[2px]"
        >
          {/* Shockwave ripple */}
          <motion.div
            initial={{ scale: 0.2, opacity: 0.8 }}
            animate={{ scale: 3.5, opacity: 0 }}
            transition={{ duration: 1.1, ease: "easeOut" }}
            className="absolute w-32 h-32 rounded-full border border-[var(--rubric)] pointer-events-none"
          />

          {/* Medallion Container */}
          <motion.div
            initial={{ scale: 2.2, rotate: -18, opacity: 0 }}
            animate={{ scale: 1, rotate: -2, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 22,
            }}
            className="relative flex flex-col items-center select-none"
          >
            {/* The Wax Seal Medallion */}
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-[#8a1c1c] via-[#611313] to-[#3a0909] p-1.5 shadow-[0_12px_36px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(255,255,255,0.25),inset_0_-3px_8px_rgba(0,0,0,0.8)] border-2 border-[#b83232]/40 relative flex items-center justify-center">
              {/* Deckle/wax irregular edge shadow ring */}
              <div className="absolute inset-1 rounded-full border border-[#d97706]/40 opacity-75" />
              
              {/* Circular Monogram § & Latin Motto */}
              <div className="w-full h-full rounded-full border border-[#8a1c1c] flex flex-col items-center justify-center relative overflow-hidden bg-[#571010]/80">
                {/* Monogram */}
                <span className="font-manuscript text-4xl sm:text-5xl text-[#fbbf24] font-bold drop-shadow-[0_2px_3px_rgba(0,0,0,0.9)] tracking-wider">
                  §
                </span>
                <span className="font-apparatus text-[8px] uppercase tracking-[0.25em] text-[#fde68a]/80 font-bold -mt-1">
                  SIGILLUM
                </span>
              </div>
            </div>

            {/* Inscribed label underneath */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.3 }}
              className="mt-3 px-3 py-1 bg-[var(--vellum-raised)]/95 border border-[var(--ink-soft)] rounded shadow-lg flex flex-col items-center"
            >
              <span className="text-[11px] font-apparatus uppercase tracking-widest text-[var(--rubric)] font-bold">
                Scriptum Inked & Sealed
              </span>
              {scenarioTitle && (
                <span className="text-[10px] font-manuscript text-[var(--graphite)] max-w-[200px] truncate">
                  {scenarioTitle}
                </span>
              )}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
