/** Developer-only product preview. No server calls or student progress mutations. */
import { useState } from "react";
import { SpecialtyExperience } from "@/components/specialty/SpecialtyExperience";
import BioTrailGame from "@/components/games/biotrail/BioTrailGame";
import type { Specialty } from "@/lib/specialty";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import LanguageToggle from "@/components/LanguageToggle";
export default function AdvancedPreview() {
  const { t } = useTranslation();
  const [specialty, setSpecialty] = useState<Specialty | null>(null);
  const [play, setPlay] = useState(false);
  const [locked, setLocked] = useState(false);
  return (
    <div className="min-h-screen bg-[#f6faf7] px-4 pb-12">
      <header className="max-w-6xl mx-auto flex flex-wrap gap-3 justify-between items-center py-4 border-b">
        <strong>BrightBoost · {t("specialty.previewMode")}</strong>
        <div className="flex gap-2 items-center">
          <LanguageToggle languages={["en", "es"]} />
          <Button
            variant="outline"
            onClick={() => {
              setSpecialty(null);
              setPlay(false);
            }}
          >
            {t("specialty.resetPreview")}
          </Button>
          <label className="text-sm">
            <input
              type="checkbox"
              checked={locked}
              onChange={(e) => {
                setLocked(e.target.checked);
                setSpecialty(null);
                setPlay(false);
              }}
            />
            {t("specialty.previewLocked")}
          </label>
        </div>
      </header>
      <main className="max-w-6xl mx-auto">
        {play ? (
          <>
            <Button
              className="my-4"
              variant="outline"
              onClick={() => setPlay(false)}
            >
              {t("specialty.previewBack")}
            </Button>
            <BioTrailGame storageScope="preview" />
          </>
        ) : (
          <SpecialtyExperience
            data={{
              unlocked: !locked,
              specialty,
              completed: locked ? 2 : 5,
              required: 5,
            }}
            onChoose={async (choice) => {
              setSpecialty(choice);
            }}
            onPlay={() => setPlay(true)}
          />
        )}
      </main>
    </div>
  );
}
