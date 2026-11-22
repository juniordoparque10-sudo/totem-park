const isValidTimeZone = (value) => {
  const candidate = String(value || "").trim();
  if (!candidate) return false;
  try {
    new Intl.DateTimeFormat("pt-BR", { timeZone:candidate }).format(0);
    return true;
  } catch {
    return false;
  }
};

export function resolveTemplateTimeZone({ screen = {}, template = {} } = {}) {
  const candidates = [
    screen.timeZone,
    screen.timezone,
    screen.deviceLocation?.timeZone,
    screen.deviceLocation?.timezone,
    screen.deviceLocationTimeZone,
    template.timeZone,
    template.timezone,
  ];
  return candidates.find(isValidTimeZone) || "UTC";
}

export function formatTemplateClockParts(referenceDate = new Date(), { timeZone = "UTC", timeFormat = "24h" } = {}) {
  const options = { timeZone:isValidTimeZone(timeZone) ? timeZone : "UTC" };
  return {
    time:referenceDate.toLocaleTimeString("pt-BR", {
      ...options,
      hour:"2-digit",
      minute:"2-digit",
      hour12:timeFormat === "12h",
    }),
    weekday:referenceDate.toLocaleDateString("pt-BR", { ...options, weekday:"long" }),
    date:referenceDate.toLocaleDateString("pt-BR", {
      ...options,
      day:"2-digit",
      month:"long",
      year:"numeric",
    }),
  };
}
