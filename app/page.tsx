"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { getClient, Session, Settings } from "@/lib/supabase";
import { totalHours, thisWeekSessions, progressPct, fmt } from "@/lib/hours";
import TapeProgress from "@/components/TapeProgress";
import SessionCard from "@/components/SessionCard";
import SessionForm from "@/components/SessionForm";
import { Plus } from "lucide-react";

export default function Dashboard() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [settings, setSettings] = useState<Settings>({ required_hours: 486, start_date: "2026-07-13" });
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [{ data: sess }, { data: cfg }] = await Promise.all([
      getClient().from("sessions").select("*").order("work_date", { ascending: false }),
      getClient().from("settings").select("*").eq("id", 1).single(),
    ]);
    if (sess) setSessions(sess);
    if (cfg)  setSettings(cfg);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(values: Omit<Session, "id" | "created_at">) {
    const { error } = await getClient().from("sessions").insert([values]);
    if (error) throw new Error(error.message);
    setShowForm(false);
    load();
  }

  async function handleUpdate(id: number, values: Omit<Session, "id" | "created_at">) {
    const { error } = await getClient().from("sessions").update(values).eq("id", id);
    if (error) throw new Error(error.message);
    load();
  }

  async function handleDelete(id: number) {
    const { error } = await getClient().from("sessions").delete().eq("id", id);
    if (error) throw new Error(error.message);
    load();
  }

  const logged   = totalHours(sessions);
  const week     = thisWeekSessions(sessions);
  const weekHrs  = totalHours(week);
  const pct      = progressPct(logged, settings.required_hours);
  const remaining = Math.max(0, settings.required_hours - logged);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted font-mono text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* hero stamp card */}
      <div className="bg-surface border border-border rounded-2xl p-5">
        <p className="text-xs font-mono text-muted uppercase tracking-widest mb-3">Total logged</p>
        <div className="flex items-end gap-3 flex-wrap">
          <span className="font-mono font-semibold text-5xl text-text leading-none">
            {fmt(logged)}
          </span>
          <span className="font-mono text-muted text-lg pb-1">
            / {fmt(settings.required_hours)} hrs
          </span>
          <span className={`ml-auto text-xs font-mono px-3 py-1.5 rounded-full border
            ${pct >= 100
              ? "text-success border-success/40 bg-success/10"
              : "text-accent border-accent/40 bg-accent/10"}`}>
            {pct >= 100 ? "✓ Done" : `${pct.toFixed(1)}% complete`}
          </span>
        </div>

        <TapeProgress pct={pct} />

        <div className="mt-4 flex gap-4 text-sm">
          <div>
            <span className="text-muted text-xs font-mono block">Remaining</span>
            <span className="font-mono font-medium">{fmt(remaining)} hrs</span>
          </div>
          <div className="border-l border-border pl-4">
            <span className="text-muted text-xs font-mono block">This week</span>
            <span className="font-mono font-medium">{fmt(weekHrs)} hrs · {week.length} session{week.length !== 1 ? "s" : ""}</span>
          </div>
        </div>
      </div>

      {/* log session */}
      {showForm ? (
        <SessionForm onSave={handleAdd} onCancel={() => setShowForm(false)} />
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          <Plus size={16} />
          Log session
        </button>
      )}

      {/* this week */}
      <section>
        <h2 className="text-xs font-mono text-muted uppercase tracking-widest mb-3">This week</h2>
        {week.length === 0 ? (
          <p className="text-muted text-sm text-center py-8 border border-dashed border-border rounded-xl">
            No sessions this week yet.
          </p>
        ) : (
          <div className="space-y-2">
            {week.map(s => (
              <SessionCard
                key={s.id}
                session={s}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
