export function formatBytes(value, { unavailable = "—", locale = "pt-BR" } = {}) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return unavailable;
  const bytes = Math.max(0, Number(value));
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / (1024 ** index)).toLocaleString(locale, { maximumFractionDigits: 1 })} ${units[index]}`;
}
