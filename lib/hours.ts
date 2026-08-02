import { Session } from "./supabase";
import { parseISO, startOfWeek, endOfWeek, isWithinInterval, format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, getDay, addDays, isValid } from "date-fns";

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

export function predictFinishDate(sessions: Session[], required: number, startDate: string, referenceDate: Date = new Date()): string | null {
  if (!required) return null;

  const start = parseISO(startDate);
  if (!isValid(start)) return null;

  const logged = totalHours(sessions);
  const remaining = Math.max(0, required - logged);
  if (remaining <= 0) return "Completed";

  const weeklyHours = getRecentWeeklyHours(sessions, referenceDate);
  const pace = weeklyHours > 0 ? weeklyHours : 24;
  const weeksNeeded = Math.ceil(remaining / pace);
  const projectedDate = addDays(referenceDate, weeksNeeded * 7);

  return format(projectedDate, "MMM d, yyyy");
}

function getRecentWeeklyHours(sessions: Session[], referenceDate: Date): number {
  const weeksToInspect = 6;
  const weekStarts = Array.from({ length: weeksToInspect }, (_, index) => {
    const weekDate = addDays(referenceDate, -index * 7);
    return startOfWeek(weekDate, { weekStartsOn: 1 });
  });

  const weeklyTotals = weekStarts.map((weekStart) => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    return sessions
      .filter((session) => isWithinInterval(parseISO(session.work_date), { start: weekStart, end: weekEnd }))
      .reduce((sum, session) => sum + sessionHours(session), 0);
  });

  const recentWeeks = weeklyTotals.filter((value) => value > 0);
  if (recentWeeks.length === 0) return 0;

  return recentWeeks.reduce((sum, value) => sum + value, 0) / recentWeeks.length;
}

export interface CalendarDay {
  date: string;
  label: string;
  hours: number;
  hasWork: boolean;
  isCurrentMonth: boolean;
}

export function buildCalendar(referenceDate: Date = new Date()): CalendarDay[] {
  const monthStart = startOfMonth(referenceDate);
  const monthEnd = endOfMonth(referenceDate);
  const firstDay = getDay(monthStart);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const leadingDaysCount = firstDay === 0 ? 6 : firstDay - 1;
  const trailingDaysCount = (7 - ((daysInMonth.length + leadingDaysCount) % 7)) % 7;

  const leadingDays = Array.from({ length: leadingDaysCount }, (_, index) => {
    const prev = subMonths(referenceDate, 1);
    const prevMonthLastDay = endOfMonth(prev);
    return addDays(prevMonthLastDay, index - leadingDaysCount + 1);
  });

  const trailingDays = Array.from({ length: trailingDaysCount }, (_, index) => {
    const next = addMonths(referenceDate, 1);
    return addDays(startOfMonth(next), index);
  });

  const calendarDays = [...leadingDays, ...daysInMonth, ...trailingDays];

  return calendarDays.map((date) => {
    const iso = format(date, "yyyy-MM-dd");
    return {
      date: iso,
      label: format(date, "d"),
      hours: 0,
      hasWork: false,
      isCurrentMonth: format(date, "yyyy-MM") === format(referenceDate, "yyyy-MM"),
    };
  });
}

export function enrichCalendarWithSessions(sessions: Session[], referenceDate: Date = new Date()): CalendarDay[] {
  const calendar = buildCalendar(referenceDate);
  const totals = sessions.reduce<Record<string, number>>((acc, session) => {
    acc[session.work_date] = (acc[session.work_date] ?? 0) + sessionHours(session);
    return acc;
  }, {});

  return calendar.map(day => {
    const hours = totals[day.date] ?? 0;
    return {
      ...day,
      hours,
      hasWork: hours > 0,
    };
  });
}

export function nextMonth(date: Date): Date {
  return addMonths(date, 1);
}

export function previousMonth(date: Date): Date {
  return subMonths(date, 1);
}
