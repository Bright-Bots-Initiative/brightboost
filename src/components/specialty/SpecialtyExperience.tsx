import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  LockKeyhole,
  Sparkles,
  Telescope,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  SPECIALTIES,
  BIOTRAIL_PATH,
  type Specialty,
  type SpecialtyStatus,
} from "@/lib/specialty";
import "./specialty.css";

import { SPECIALTY_ICONS } from "./specialtyIcons";

export function SpecialtyExperience({
  data,
  onChoose,
  onPlay,
}: {
  data: SpecialtyStatus;
  onChoose: (choice: Specialty) => Promise<void>;
  onPlay?: () => void;
}) {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<Specialty>(
    data.specialty ?? "BIOTECH",
  );
  const [confirm, setConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const active = data.specialty ?? preview;
  const Icon = SPECIALTY_ICONS[active];
  const chosen = data.unlocked && data.specialty !== null;
  async function commit() {
    if (saving) return;
    setSaving(true);
    setError(false);
    try {
      await onChoose(preview);
      setConfirm(false);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="specialty-experience" data-specialty={active}>
      {!onPlay && (
        <Link className="specialty-back" to="/student/modules">
          <ArrowLeft size={18} />
          {t("specialty.back")}
        </Link>
      )}
      <div className="specialty-heading">
        <div>
          <p className="specialty-eyebrow">
            <Sparkles size={16} />
            {t(chosen ? "specialty.newChapter" : "specialty.milestone")}
          </p>
          <h1>
            {t(
              chosen ? `specialty.tracks.${active}.welcome` : "specialty.title",
            )}
          </h1>
          <p className="specialty-intro">
            {t(
              chosen
                ? `specialty.tracks.${active}.description`
                : "specialty.intro",
            )}
          </p>
        </div>
        <div className="specialty-companion">
          <img src="/robots/robot_explorer.png" alt="" />
          <span>
            <Icon size={21} />
            {t(`specialty.tracks.${active}.companion`)}
          </span>
        </div>
      </div>
      {!data.unlocked && (
        <div className="specialty-notice" role="status">
          <LockKeyhole size={22} />
          <div>
            <strong>{t("specialty.locked")}</strong>
            <p>
              {t("specialty.progress", {
                count: data.completed,
                total: data.required,
              })}
            </p>
          </div>
        </div>
      )}
      {!chosen ? (
        <>
          <fieldset className="specialty-cards">
            <legend className="sr-only">{t("specialty.chooseLabel")}</legend>
            {SPECIALTIES.map((track, i) => {
              const TrackIcon = SPECIALTY_ICONS[track];
              return (
                <label
                  key={track}
                  className="specialty-card"
                  data-specialty={track}
                  data-selected={preview === track}
                >
                  <input
                    type="radio"
                    name="specialty-preview"
                    value={track}
                    checked={preview === track}
                    onChange={() => {
                      setPreview(track);
                      setError(false);
                    }}
                    className="sr-only"
                  />
                  <div className="specialty-card-top">
                    <span className="specialty-number">0{i + 1}</span>
                    <span className="specialty-selection">
                      {preview === track && <Check size={18} />}
                    </span>
                  </div>
                  <div className="specialty-symbol">
                    <TrackIcon size={50} strokeWidth={1.5} />
                  </div>
                  <p className="specialty-card-kicker">
                    {t(`specialty.tracks.${track}.role`)}
                  </p>
                  <h2>{t(`specialty.tracks.${track}.name`)}</h2>
                  <p>{t(`specialty.tracks.${track}.description`)}</p>
                  <span className="specialty-card-footer">
                    {t(`specialty.tracks.${track}.verbs`)}
                    <ArrowRight size={18} />
                  </span>
                </label>
              );
            })}
          </fieldset>
          <div className="specialty-preview">
            <div className="specialty-preview-icon">
              <Icon size={34} />
            </div>
            <div className="flex-1">
              <p className="specialty-eyebrow">{t("specialty.previewLabel")}</p>
              <h2>{t(`specialty.tracks.${active}.previewTitle`)}</h2>
              <p>{t(`specialty.tracks.${active}.preview`)}</p>
            </div>
            <Button
              className="specialty-primary"
              disabled={!data.unlocked}
              onClick={() => setConfirm(true)}
            >
              {t("specialty.choose", {
                name: t(`specialty.tracks.${active}.name`),
              })}
              <ArrowRight size={18} />
            </Button>
          </div>
          <p className="specialty-footnote">{t("specialty.familiar")}</p>
        </>
      ) : (
        <div className="specialty-hub">
          <div className="specialty-mission">
            <p className="specialty-eyebrow">
              <Icon size={18} />
              {t(`specialty.tracks.${active}.name`)}
            </p>
            <h2>
              {t(
                active === "BIOTECH"
                  ? "biotrail.title"
                  : "specialty.comingTitle",
              )}
            </h2>
            <p>
              {t(
                active === "BIOTECH"
                  ? "biotrail.tagline"
                  : "specialty.comingDescription",
              )}
            </p>
            {active === "BIOTECH" ? (
              <>
                <div className="specialty-tags">
                  <span>{t("biotrail.tag1")}</span>
                  <span>{t("biotrail.tag2")}</span>
                  <span>{t("biotrail.tag3")}</span>
                </div>
                {onPlay ? (
                  <Button className="specialty-primary" onClick={onPlay}>
                    {t("specialty.play")}
                    <ArrowRight size={19} />
                  </Button>
                ) : (
                  <Link
                    className={`${buttonVariants()} specialty-primary`}
                    to={BIOTRAIL_PATH}
                  >
                    {t("specialty.play")}
                    <ArrowRight size={19} />
                  </Link>
                )}
              </>
            ) : !onPlay ? (
              <Link
                className={buttonVariants({ variant: "outline" })}
                to="/student/modules"
              >
                {t("specialty.revisit")}
              </Link>
            ) : null}
          </div>
          <aside className="specialty-field-note">
            <Telescope size={34} />
            <h3>{t("specialty.fieldNote")}</h3>
            <p>{t(`specialty.tracks.${active}.question`)}</p>
            <div className="specialty-badge">
              <Check size={20} />
              {t("specialty.setsComplete")}
            </div>
          </aside>
        </div>
      )}
      <Dialog
        open={confirm}
        onOpenChange={(open) => {
          if (!saving) setConfirm(open);
        }}
      >
        <DialogContent className="specialty-dialog" data-specialty={preview}>
          <DialogHeader>
            <DialogTitle>
              {t("specialty.confirmTitle", {
                name: t(`specialty.tracks.${preview}.name`),
              })}
            </DialogTitle>
            <DialogDescription>
              {t("specialty.confirmDescription")}
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p role="alert" className="text-red-700">
              {t("specialty.saveError")}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => setConfirm(false)}
            >
              {t("specialty.keepExploring")}
            </Button>
            <Button
              className="specialty-primary"
              disabled={saving}
              onClick={commit}
            >
              {t(saving ? "specialty.saving" : "specialty.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
