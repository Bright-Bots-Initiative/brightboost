import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Volume2 } from "lucide-react";

type Phase = "idle" | "playing" | "paused" | "ended" | "failed";
type Owner = { stop: () => void };
let active: Owner | undefined;

function languageKey(raw?: string) {
  const value = raw?.toLowerCase().replace(/_/g, "-") ?? "";
  if (/^zh(?:$|-)/.test(value))
    return /^zh(?:$|-(?:cn|sg|hans)(?:-|$))/.test(value)
      ? "zh-Hans"
      : undefined;
  const primary = value.split("-")[0];
  return ["en", "es", "vi"].includes(primary) ? primary : undefined;
}
export function localVoice(voices: SpeechSynthesisVoice[], language: string) {
  const key = languageKey(language);
  if (!key) return undefined;
  const matches = voices.filter(
    (v) => v.localService && languageKey(v.lang) === key,
  );
  return (
    matches.find((v) => v.lang.toLowerCase() === language.toLowerCase()) ??
    matches[0]
  );
}

// Only authored instructions reach this control. The browser's queue is shared
// by all panels, so replacing a speaker must invalidate its callbacks first.
export default function InstructionReadAloud({
  text,
  language,
  buttonClassName,
}: {
  text: string;
  language: string;
  buttonClassName?: string;
}) {
  const { t, i18n } = useTranslation();
  const selected = i18n.language || i18n.resolvedLanguage;
  const speech =
    typeof window !== "undefined" &&
    typeof window.SpeechSynthesisUtterance === "function"
      ? window.speechSynthesis
      : undefined;
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const spoken = useRef<SpeechSynthesisUtterance | null>(null);
  const owner = useRef<Owner | null>(null);
  const cursor = useRef(0);
  const voice =
    languageKey(selected) === languageKey(language)
      ? localVoice(voices, language)
      : undefined;
  const voiceId = voice && [voice.lang, voice.voiceURI, voice.name].join("|");
  useEffect(() => {
    if (!speech) return;
    const refresh = () => {
      try {
        setVoices(speech.getVoices());
      } catch {
        setVoices([]);
      }
    };
    refresh();
    speech.addEventListener?.("voiceschanged", refresh);
    return () => speech.removeEventListener?.("voiceschanged", refresh);
  }, [speech]);
  useEffect(() => {
    const self: Owner = {
      stop: () => {
        if (active === self) {
          active = undefined;
          spoken.current = null;
          speech?.cancel();
        }
        cursor.current = 0;
        setPhase("idle");
      },
    };
    owner.current = self;
    setPhase("idle");
    cursor.current = 0;
    return () => {
      if (active === self) {
        active = undefined;
        spoken.current = null;
        speech?.cancel();
      }
      owner.current = null;
    };
  }, [speech, language, selected, text, voiceId]);
  function play(repeat = false) {
    const self = owner.current;
    if (!speech || !voice || !self) return;
    if (active && active !== self) active.stop();
    if (repeat || phase !== "paused") cursor.current = 0;
    if (spoken.current) {
      spoken.current = null;
      speech.cancel();
    }
    const offset = cursor.current;
    active = self;
    try {
      const next = new SpeechSynthesisUtterance(text.slice(offset));
      spoken.current = next;
      next.voice = voice;
      next.lang = voice.lang;
      next.rate = 0.9;
      next.onboundary = (e) => {
        if (spoken.current === next) cursor.current = offset + e.charIndex;
      };
      next.onend = () => {
        if (spoken.current === next) {
          spoken.current = null;
          active = undefined;
          cursor.current = 0;
          setPhase("ended");
        }
      };
      next.onerror = () => {
        if (spoken.current === next) {
          spoken.current = null;
          active = undefined;
          setPhase("failed");
        }
      };
      setPhase("playing");
      speech.speak(next);
    } catch {
      spoken.current = null;
      active = undefined;
      setPhase("failed");
    }
  }
  function pause() {
    if (!speech || active !== owner.current) return;
    // Cancel + resume at the last announced word also works where native pause
    // behaves like cancel. Without boundary events, resume repeats the instruction.
    spoken.current = null;
    speech.cancel();
    setPhase("paused");
  }
  const button =
    buttonClassName ??
    "inline-flex min-h-[44px] items-center gap-2 rounded-lg border px-3 py-2 font-semibold focus-visible:outline focus-visible:outline-2";
  if (!text.trim()) return null;
  if (!voice) return <p className="text-sm">{t("narration.unavailable")}</p>;
  return (
    <div
      role="group"
      aria-label={t("narration.controls")}
      className="flex flex-wrap items-center gap-2"
    >
      <button
        type="button"
        className={button}
        onClick={() => (phase === "playing" ? pause() : play())}
      >
        <Volume2 aria-hidden="true" size={18} />
        {t(
          phase === "playing"
            ? "narration.pause"
            : phase === "paused"
              ? "narration.resume"
              : phase === "ended"
                ? "narration.repeat"
                : "narration.listen",
        )}
      </button>
      {(phase === "playing" || phase === "paused") && (
        <>
          <button type="button" className={button} onClick={() => play(true)}>
            {t("narration.repeat")}
          </button>
          <button
            type="button"
            className={button}
            onClick={() => owner.current?.stop()}
          >
            {t("narration.stop")}
          </button>
        </>
      )}
      {phase === "failed" && <p role="status">{t("narration.unavailable")}</p>}
    </div>
  );
}
