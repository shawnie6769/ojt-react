"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { getClient, Session, Settings } from "@/lib/supabase";
import { totalHours } from "@/lib/hours";
import SessionCard from "@/components/SessionCard";
import SessionForm from "@/components/SessionForm";
import { Plus } from "lucide-react";

export default function HistoryPage() {
  const [sessions, setSessions]  = useState<Session[]>([]);
  const [settings, setSettings]  = useState<Settings>({ required_hours: 486, start_date: "2026-07-13" });
  const [showForm, setShowForm]  = useState(false);
  const [loading, setLoading]    = useState(true);

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

  const logged = totalHours(sessions);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted font-mono text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">History</h1>
          <p className="text-xs font-mono text-muted mt-0.5">
            {sessions.length} session{sessions.length !== 1 ? "s" : ""} · {logged.toFixed(1)} hrs logged
          </p>
        </div>
      </div>

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

      {sessions.length === 0 ? (
        <p className="text-muted text-sm text-center py-12 border border-dashed border-border rounded-xl">
          No sessions logged yet. Hit "+ Log session" above to start.
        </p>
      ) : (
        <div className="space-y-2">
          {sessions.map(s => (
            <SessionCard
              key={s.id}
              session={s}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
