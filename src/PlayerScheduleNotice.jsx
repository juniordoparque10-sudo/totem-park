import { CalendarCheck2, CalendarClock, CalendarPlus2, CalendarSync } from "lucide-react";

const ICONS = {
  created:CalendarPlus2,
  active:CalendarCheck2,
  ended:CalendarClock,
  updated:CalendarSync,
};

export default function PlayerScheduleNotice({ notice }) {
  if (!notice) return null;
  const Icon = ICONS[notice.type] || CalendarCheck2;
  return <aside className={`player-schedule-notice notice-${notice.type}`} role="status" aria-live="polite">
    <span className="player-schedule-notice-icon" aria-hidden="true"><Icon/></span>
    <span className="player-schedule-notice-copy">
      <strong>{notice.title}</strong>
      <span>{notice.description}</span>
    </span>
  </aside>;
}
