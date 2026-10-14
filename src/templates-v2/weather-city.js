const WEATHER_CITY_PLACEHOLDERS = new Set(["", "sua cidade"]);

export function getConfiguredTemplateWeatherCity(value) {
  const city = String(value || "").trim();
  return WEATHER_CITY_PLACEHOLDERS.has(city.toLocaleLowerCase("pt-BR")) ? "" : city;
}
