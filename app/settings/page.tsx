"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { getClient, Settings } from "@/lib/supabase";
import { format, parseISO } from "date-fns";
import { Check } from "lucide-react";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({ required_hours: 486, start_date: "2026-07-13" });
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState("");

  const load = useCallback(async () => {
    const { data } = await getClient().from("settings").select("*").eq("id", 1).single();
    if (data) setSettings(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    const { error } = await getClient()
      .from("settings")
      .update({ required_hours: settings.required_hours, start_date: settings.start_date } as never)
      .eq("id", 1);
    if (error) {
      setError(error.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted font-mono text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-xs font-mono text-muted mt-0.5">OJT parameters</p>
      </div>

      <form onSubmit={handleSave} className="bg-surface border border-border rounded-2xl p-5 space-y-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-mono text-muted uppercase tracking-wider">
            Required hours (target)
          </label>
          <input
            type="number"
            min={1}
            step={0.5}
            value={settings.required_hours}
            onChange={e => setSettings(s => ({ ...s, required_hours: parseFloat(e.target.value) }))}
            required
            className="input font-mono text-lg"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-mono text-muted uppercase tracking-wider">
            OJT start date
          </label>
          <input
            type="date"
            value={settings.start_date}
            onChange={e => setSettings(s => ({ ...s, start_date: e.target.value }))}
            required
            className="input font-mono"
          />
          <p className="text-xs text-muted mt-0.5">
            Currently set to {format(parseISO(settings.start_date), "MMMM d, yyyy")}
          </p>
        </div>

        {error && <p className="text-danger text-sm">{error}</p>}

        <button type="submit" disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
          {saved ? <><Check size={14} /> Saved</> : saving ? "Saving…" : "Save settings"}
        </button>
      </form>

      <div className="bg-surface border border-border rounded-2xl p-5 space-y-3">
        <h2 className="text-sm font-semibold">About your data</h2>
        <p className="text-xs text-muted leading-relaxed">
          All session data is stored in your Supabase database. Nothing is saved locally in the browser.
          To back up your data, go to your Supabase dashboard → Table Editor → Export as CSV.
        </p>
      </div>
    </div>
  );
}
