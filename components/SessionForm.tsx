"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Session } from "@/lib/supabase";
import { sessionHours } from "@/lib/hours";
import { X } from "lucide-react";

type FormValues = {
  work_date: string;
  time_in: string;
  time_out: string;
  lunch_minutes: number;
  notes: string;
};

interface Props {
  initial?: Session;
  onSave: (values: FormValues) => Promise<void>;
  onCancel: () => void;
}

const today = format(new Date(), "yyyy-MM-dd");

const defaults: FormValues = {
  work_date: today,
  time_in: "09:00",
  time_out: "18:00",
  lunch_minutes: 60,
  notes: "",
};

export default function SessionForm({ initial, onSave, onCancel }: Props) {
  const [values, setValues] = useState<FormValues>(
    initial
      ? {
          work_date: initial.work_date,
          time_in: initial.time_in,
          time_out: initial.time_out,
          lunch_minutes: initial.lunch_minutes,
          notes: initial.notes,
        }
      : defaults
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const preview = sessionHours({ ...values } as Session);

  function set<K extends keyof FormValues>(k: K, v: FormValues[K]) {
    setValues(prev => ({ ...prev, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onSave(values);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-surface border border-border rounded-xl p-5 space-y-4 animate-slide-up"
    >
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-sm text-soft uppercase tracking-widest">
          {initial ? "Edit session" : "Log session"}
        </h3>
        <button type="button" onClick={onCancel} className="text-muted hover:text-text transition-colors p-1 rounded">
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 flex flex-col gap-1">
          <label className="text-xs text-muted font-mono uppercase tracking-wider">Date</label>
          <input
            type="date"
            value={values.work_date}
            onChange={e => set("work_date", e.target.value)}
            required
            className="input"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted font-mono uppercase tracking-wider">Time in</label>
          <input
            type="time"
            value={values.time_in}
            onChange={e => set("time_in", e.target.value)}
            required
            className="input font-mono"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted font-mono uppercase tracking-wider">Time out</label>
          <input
            type="time"
            value={values.time_out}
            onChange={e => set("time_out", e.target.value)}
            required
            className="input font-mono"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted font-mono uppercase tracking-wider">Lunch (min)</label>
          <input
            type="number"
            min={0}
            step={5}
            value={values.lunch_minutes}
            onChange={e => set("lunch_minutes", Number(e.target.value))}
            required
            className="input font-mono"
          />
        </div>
        <div className="flex items-end pb-0.5">
          <span className="font-mono text-accent font-semibold text-lg">
            {preview.toFixed(1)}
            <span className="text-xs text-muted ml-1">hrs computed</span>
          </span>
        </div>

        <div className="col-span-2 flex flex-col gap-1">
          <label className="text-xs text-muted font-mono uppercase tracking-wider">Notes</label>
          <textarea
            rows={2}
            placeholder="what you worked on…"
            value={values.notes}
            onChange={e => set("notes", e.target.value)}
            className="input resize-none"
          />
        </div>
      </div>

      {error && <p className="text-danger text-sm">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={loading} className="btn-primary flex-1">
          {loading ? "Saving…" : initial ? "Save changes" : "Save session"}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost px-4">
          Cancel
        </button>
      </div>
    </form>
  );
}
