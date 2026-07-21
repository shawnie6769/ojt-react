"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { getClient, Session } from "@/lib/supabase";
import { enrichCalendarWithSessions, fmt, nextMonth, previousMonth } from "@/lib/hours";
import { format, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function CalendarPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await getClient().from("sessions").select("*").order("work_date", { ascending: false });
    if (data) setSessions(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const calendar = enrichCalendarWithSessions(sessions, viewDate);
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const selectedSessions = sessions.filter(session => session.work_date === selectedDate);
  const selectedTotal = selectedSessions.reduce((sum, session) => sum + (session.lunch_minutes ? 0 : 0), 0);
  const selectedHours = selectedSessions.reduce((sum, session) => sum + (Number(session.time_out.split(":")[0]) * 60 + Number(session.time_out.split(":")[1]) - (Number(session.time_in.split(":")[0]) * 60 + Number(session.time_in.split(":")[1])) - session.lunch_minutes) / 60, 0);

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
          <h1 className="text-xl font-semibold">Calendar</h1>
          <p className="text-xs font-mono text-muted mt-0.5">Your workdays by month</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewDate(previousMonth(viewDate))}
            className="rounded-full border border-border bg-surface p-2 text-muted"
            aria-label="Previous month"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="min-w-[120px] text-center font-mono text-sm text-text">
            {format(viewDate, "MMMM yyyy")}
          </span>
          <button
            type="button"
            onClick={() => setViewDate(nextMonth(viewDate))}
            className="rounded-full border border-border bg-surface p-2 text-muted"
            aria-label="Next month"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-3">
        <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-mono uppercase tracking-widest text-muted">
          {weekdays.map(day => (
            <div key={day}>{day}</div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-7 gap-2">
          {calendar.map(day => (
            <button
              key={day.date}
              type="button"
              onClick={() => setSelectedDate(day.date)}
              className={`flex min-h-[70px] flex-col rounded-xl border p-2 text-left ${day.hasWork ? "border-accent/40 bg-accent/10" : "border-border bg-bg/40"} ${!day.isCurrentMonth ? "opacity-50" : "opacity-100"}`}
            >
              <span className="text-xs font-semibold text-text">{day.label}</span>
              {day.hours > 0 ? <span className="mt-auto text-[10px] text-accent">{fmt(day.hours)}h</span> : null}
            </button>
          ))}
        </div>
      </div>

      {selectedDate ? (
        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-mono uppercase tracking-widest text-muted">Selected day</p>
              <p className="mt-1 text-sm font-semibold text-text">{format(parseISO(selectedDate), "EEE, MMM d yyyy")}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-mono uppercase tracking-widest text-muted">Hours</p>
              <p className="mt-1 text-sm font-semibold text-accent">{fmt(selectedHours)}h</p>
            </div>
          </div>

          {selectedSessions.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No sessions logged on this day.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {selectedSessions.map(session => (
                <div key={session.id} className="rounded-xl border border-border bg-bg/40 px-3 py-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-text">{session.time_in} – {session.time_out}</span>
                    <span className="text-accent">{fmt((Number(session.time_out.split(":")[0]) * 60 + Number(session.time_out.split(":")[1]) - (Number(session.time_in.split(":")[0]) * 60 + Number(session.time_in.split(":")[1])) - session.lunch_minutes) / 60)}h</span>
                  </div>
                  {session.notes ? <p className="mt-1 text-xs text-muted">{session.notes}</p> : null}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
