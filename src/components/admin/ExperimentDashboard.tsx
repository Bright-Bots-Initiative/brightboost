/**
 * Internal A/B Testing dashboard — team tool, not student-facing.
 * Lists experiments, creates new ones, inspects side-by-side results,
 * and allows completing an experiment with a written conclusion.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "@/services/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/components/ui/use-toast.ts";

// ── Types ───────────────────────────────────────────────────────────────

type ExperimentStatus = "draft" | "running" | "completed" | "archived";

interface Experiment {
  id: string;
  slug: string;
  name: string;
  hypothesis: string;
  metric: string;
  status: ExperimentStatus;
  trafficSplit: number;
  createdBy: string;
  createdAt: string;
  completedAt?: string | null;
  conclusion?: string | null;
  _count?: { assignments: number; events: number };
}

interface ResultsSide {
  users: number;
  events: Record<string, number>;
  avgMetricPerUser: number;
  avgMetricValue: number | null;
}

interface ResultsResponse {
  experiment: Omit<Experiment, "_count" | "createdBy" | "createdAt">;
  control: ResultsSide;
  variant: ResultsSide;
}

// ── Helpers ─────────────────────────────────────────────────────────────

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 100);

const statusVariant = (
  status: ExperimentStatus,
): "default" | "secondary" | "outline" | "destructive" => {
  switch (status) {
    case "running":
      return "default";
    case "completed":
      return "secondary";
    case "archived":
      return "destructive";
    default:
      return "outline";
  }
};

// ── Comparison bar ──────────────────────────────────────────────────────

function ComparisonBar({
  label,
  controlValue,
  variantValue,
  format = (n) => n.toFixed(2),
}: {
  label: string;
  controlValue: number;
  variantValue: number;
  format?: (n: number) => string;
}) {
  const max = Math.max(controlValue, variantValue, 0.0001);
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-slate-700">{label}</div>
      <div className="grid grid-cols-[70px_1fr_90px] items-center gap-2">
        <span className="text-xs text-slate-500">Control</span>
        <div className="h-5 rounded bg-slate-100">
          <div
            className="h-full rounded bg-slate-400 transition-all"
            style={{ width: `${(controlValue / max) * 100}%` }}
          />
        </div>
        <span className="text-xs font-mono text-right">{format(controlValue)}</span>
      </div>
      <div className="grid grid-cols-[70px_1fr_90px] items-center gap-2">
        <span className="text-xs text-slate-500">Variant</span>
        <div className="h-5 rounded bg-slate-100">
          <div
            className="h-full rounded bg-indigo-500 transition-all"
            style={{ width: `${(variantValue / max) * 100}%` }}
          />
        </div>
        <span className="text-xs font-mono text-right">{format(variantValue)}</span>
      </div>
    </div>
  );
}

// ── Create form ─────────────────────────────────────────────────────────

function NewExperimentForm({
  onCreated,
  onCancel,
}: {
  onCreated: (e: Experiment) => void;
  onCancel: () => void;
}) {
  const api = useApi();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [hypothesis, setHypothesis] = useState("");
  const [metric, setMetric] = useState("");
  const [trafficSplit, setTrafficSplit] = useState(50);
  const [slugTouched, setSlugTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const effectiveSlug = slugTouched ? slug : slugify(name);

  const submit = async () => {
    if (!name || !hypothesis || !metric || !effectiveSlug) {
      toast({ title: "Missing fields", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const created = await api.post("/experiments", {
        slug: effectiveSlug,
        name,
        hypothesis,
        metric,
        trafficSplit,
      });
      onCreated(created);
      toast({ title: "Experiment created" });
    } catch (err) {
      toast({
        title: "Failed to create experiment",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="space-y-4">
      <h3 className="text-lg font-semibold">New Experiment</h3>
      <div className="space-y-2">
        <Label htmlFor="exp-name">Name</Label>
        <Input
          id="exp-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Maze Maps: Observation Phase Before Play"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="exp-slug">Slug (kebab-case)</Label>
        <Input
          id="exp-slug"
          value={effectiveSlug}
          onChange={(e) => {
            setSlug(e.target.value);
            setSlugTouched(true);
          }}
          placeholder="maze-maps-observation-phase"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="exp-hypothesis">Hypothesis</Label>
        <Textarea
          id="exp-hypothesis"
          value={hypothesis}
          onChange={(e) => setHypothesis(e.target.value)}
          placeholder="Adding a 3-sec observation phase reduces collisions by 30%"
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="exp-metric">Primary metric event name</Label>
        <Input
          id="exp-metric"
          value={metric}
          onChange={(e) => setMetric(e.target.value)}
          placeholder="sweeper_collision"
        />
      </div>
      <div className="space-y-2">
        <Label>Traffic split: {trafficSplit}% variant / {100 - trafficSplit}% control</Label>
        <Slider
          value={[trafficSplit]}
          min={0}
          max={100}
          step={5}
          onValueChange={(v) => setTrafficSplit(v[0] ?? 50)}
        />
      </div>
      <div className="flex gap-2">
        <Button onClick={submit} disabled={submitting}>
          {submitting ? "Creating..." : "Create"}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}

// ── Detail view ─────────────────────────────────────────────────────────

function ExperimentDetail({
  experiment,
  onUpdated,
  onBack,
}: {
  experiment: Experiment;
  onUpdated: (e: Experiment) => void;
  onBack: () => void;
}) {
  const api = useApi();
  const [results, setResults] = useState<ResultsResponse | null>(null);
  const [completing, setCompleting] = useState(false);
  const [conclusion, setConclusion] = useState(experiment.conclusion ?? "");

  const loadResults = useCallback(() => {
    api
      .get(`/experiments/${experiment.id}/results`)
      .then((r: ResultsResponse) => setResults(r))
      .catch(() => setResults(null));
  }, [api, experiment.id]);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  const setStatus = async (status: ExperimentStatus, extra?: Record<string, unknown>) => {
    try {
      const updated = await api.put(`/experiments/${experiment.id}`, { status, ...extra });
      onUpdated(updated);
    } catch (err) {
      toast({
        title: "Update failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const complete = async () => {
    if (!conclusion.trim()) {
      toast({ title: "Please write a conclusion first", variant: "destructive" });
      return;
    }
    await setStatus("completed", { conclusion });
    setCompleting(false);
  };

  const metricEventName = experiment.metric;
  const controlMetric = results?.control.events[metricEventName] ?? 0;
  const variantMetric = results?.variant.events[metricEventName] ?? 0;

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={onBack}>
        ← Back to experiments
      </Button>

      <Card className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">{experiment.name}</h2>
            <code className="text-xs text-slate-500">{experiment.slug}</code>
          </div>
          <Badge variant={statusVariant(experiment.status)}>{experiment.status}</Badge>
        </div>
        <div className="text-sm text-slate-700">
          <strong>Hypothesis:</strong> {experiment.hypothesis}
        </div>
        <div className="text-sm text-slate-700">
          <strong>Primary metric:</strong> <code>{experiment.metric}</code>
        </div>
        <div className="text-sm text-slate-700">
          <strong>Traffic split:</strong> {experiment.trafficSplit}% variant
        </div>
        <div className="text-sm text-slate-500">
          Created by {experiment.createdBy} on{" "}
          {new Date(experiment.createdAt).toLocaleDateString()}
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          {experiment.status === "draft" && (
            <Button onClick={() => setStatus("running")}>Start experiment</Button>
          )}
          {experiment.status === "running" && !completing && (
            <Button onClick={() => setCompleting(true)}>Complete experiment</Button>
          )}
          {experiment.status !== "archived" && (
            <Button variant="outline" onClick={() => setStatus("archived")}>
              Archive
            </Button>
          )}
        </div>

        {completing && (
          <div className="space-y-2 pt-2 border-t">
            <Label htmlFor="conclusion">Conclusion</Label>
            <Textarea
              id="conclusion"
              value={conclusion}
              onChange={(e) => setConclusion(e.target.value)}
              placeholder="Variant B reduced collisions by 34%. Shipping B."
              rows={3}
            />
            <div className="flex gap-2">
              <Button onClick={complete}>Save & complete</Button>
              <Button variant="outline" onClick={() => setCompleting(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {experiment.conclusion && (
          <div className="pt-2 border-t text-sm">
            <strong>Conclusion:</strong> {experiment.conclusion}
          </div>
        )}
      </Card>

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Live results</h3>
          <Button variant="outline" onClick={loadResults}>
            Refresh
          </Button>
        </div>

        {!results ? (
          <p className="text-sm text-slate-500">Loading results...</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-semibold">Control</h4>
              <div className="text-3xl font-bold">{results.control.users}</div>
              <div className="text-sm text-slate-500">users assigned</div>
              <ul className="text-sm space-y-1 pt-2">
                {Object.entries(results.control.events).map(([name, count]) => (
                  <li key={name}>
                    <code>{name}</code>: {count}
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Variant</h4>
              <div className="text-3xl font-bold">{results.variant.users}</div>
              <div className="text-sm text-slate-500">users assigned</div>
              <ul className="text-sm space-y-1 pt-2">
                {Object.entries(results.variant.events).map(([name, count]) => (
                  <li key={name}>
                    <code>{name}</code>: {count}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {results && (
          <div className="space-y-4 pt-4 border-t">
            <ComparisonBar
              label={`${metricEventName} (total)`}
              controlValue={controlMetric}
              variantValue={variantMetric}
              format={(n) => n.toFixed(0)}
            />
            <ComparisonBar
              label={`${metricEventName} per user`}
              controlValue={results.control.avgMetricPerUser}
              variantValue={results.variant.avgMetricPerUser}
            />
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────

export default function ExperimentDashboard() {
  const api = useApi();
  const [experiments, setExperiments] = useState<Experiment[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    api
      .get("/experiments")
      .then((data: Experiment[]) => setExperiments(data))
      .catch(() => setExperiments([]));
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  const selected = useMemo(
    () => experiments?.find((e) => e.id === selectedId) ?? null,
    [experiments, selectedId],
  );

  const handleUpdated = (updated: Experiment) => {
    setExperiments((prev) =>
      prev ? prev.map((e) => (e.id === updated.id ? { ...e, ...updated } : e)) : prev,
    );
  };

  const handleCreated = (created: Experiment) => {
    setExperiments((prev) => (prev ? [created, ...prev] : [created]));
    setCreating(false);
  };

  if (selected) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <ExperimentDetail
          experiment={selected}
          onUpdated={handleUpdated}
          onBack={() => setSelectedId(null)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">A/B Experiments</h1>
          <p className="text-sm text-slate-500">
            Internal team dashboard for running lightweight tests on the platform.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/teacher/dashboard">
            <Button variant="outline">Teacher dashboard</Button>
          </Link>
          {!creating && <Button onClick={() => setCreating(true)}>New experiment</Button>}
        </div>
      </div>

      {creating && (
        <NewExperimentForm
          onCreated={handleCreated}
          onCancel={() => setCreating(false)}
        />
      )}

      {experiments === null ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : experiments.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">
            No experiments yet. Create one to get started.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {experiments.map((exp) => (
            <Card
              key={exp.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedId(exp.id)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{exp.name}</h3>
                    <Badge variant={statusVariant(exp.status)}>{exp.status}</Badge>
                  </div>
                  <code className="text-xs text-slate-500">{exp.slug}</code>
                  <p className="text-sm text-slate-700 mt-2 line-clamp-2">
                    {exp.hypothesis}
                  </p>
                </div>
                <div className="text-right text-sm text-slate-500 shrink-0">
                  <div>{exp._count?.assignments ?? 0} users</div>
                  <div>{exp._count?.events ?? 0} events</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
