import { Session } from "./supabase";
import { parseISO, startOfWeek, endOfWeek, isWithinInterval, format } from "date-fns";

/** Worked hours for one session (excludes lunch). */
export function sessionHours(s: Session): number {
  const [inH, inM]   = s.time_in.split(":").map(Number);
  const [outH, outM] = s.time_out.split(":").map(Number);
  const totalMins = (outH * 60 + outM) - (inH * 60 + inM) - s.lunch_minutes;
  return Math.max(0, totalMins / 60);
}

export function totalHours(sessions: Session[]): number {
  return sessions.reduce((acc, s) => acc + sessionHours(s), 0);
}

export function thisWeekSessions(sessions: Session[]): Session[] {
  const now = new Date();
  const start = startOfWeek(now, { weekStartsOn: 1 }); // Monday
  const end   = endOfWeek(now,   { weekStartsOn: 1 });
  return sessions.filter(s =>
    isWithinInterval(parseISO(s.work_date), { start, end })
  );
}

export function fmt(h: number): string {
  return h.toFixed(1);
}

export function fmtDate(iso: string): string {
  return format(parseISO(iso), "EEE, MMM d yyyy");
}

export function progressPct(logged: number, required: number): number {
  if (!required) return 0;
  return Math.min(100, (logged / required) * 100);
}
