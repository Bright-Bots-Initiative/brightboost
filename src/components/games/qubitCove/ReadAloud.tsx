import { useEffect, useRef } from "react";
import { Volume2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import "./readAloud.css";

export default function ReadAloud({
  text,
  language,
}: {
  text: string;
  language?: string;
}) {
  const { t } = useTranslation();
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const supported =
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof window.SpeechSynthesisUtterance === "function";

  useEffect(() => {
    return () => {
      if (utterance.current) {
        window.speechSynthesis.cancel();
        utterance.current = null;
      }
    };
  }, [language, text]);

  if (!supported) return null;

  function read() {
    const speech = window.speechSynthesis;
    if (utterance.current) speech.cancel();
    const message = new SpeechSynthesisUtterance(text);
    if (language) message.lang = language;
    message.rate = 0.9;
    utterance.current = message;
    const clear = () => {
      if (utterance.current === message) utterance.current = null;
    };
    message.onend = clear;
    message.onerror = clear;
    speech.speak(message);
  }

  return (
    <button type="button" className="qubit-read-aloud" onClick={read}>
      <Volume2 size={18} aria-hidden="true" />
      {t("qubitCove.listen")}
    </button>
  );
}
