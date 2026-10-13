const hasWeatherCode = (code) => code !== null && code !== undefined && code !== "" && Number.isFinite(Number(code));

const isNightFromDate = (date) => {
  const hour = date.getHours();
  return hour < 5 || hour >= 18;
};

export function createUnavailableWeather(city) {
  return { city, temperature:"--", sensation:"--", humidity:"--", wind:"--", weatherCode:null, daily:null, source:"Aguardando atualização" };
}

export function getWeatherConditionLabel(code, referenceDate = new Date()) {
  if (!hasWeatherCode(code)) return "Tempo indisponível";
  const value = Number(code);
  if ([0, 1].includes(value)) return isNightFromDate(referenceDate) ? "Ceu limpo" : "Ensolarado";
  if ([2, 3].includes(value)) return "Parcialmente nublado";
  if ([45, 48].includes(value)) return "Neblina";
  if ([51, 53, 55, 56, 57].includes(value)) return "Garoa";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(value)) return "Chuva";
  if ([71, 73, 75, 77, 85, 86].includes(value)) return "Frio intenso";
  if ([95, 96, 99].includes(value)) return "Temporal";
  return "Tempo atualizado";
}

export function getWeatherIconSafe(code, referenceDate = new Date()) {
  if (!hasWeatherCode(code)) return null;
  const value = Number(code);
  if ([0, 1].includes(value)) return isNightFromDate(referenceDate) ? "🌙" : "☀";
  if ([2, 3].includes(value)) return "⛅";
  if ([45, 48].includes(value)) return "☁";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(value)) return "🌧";
  if ([71, 73, 75, 77, 85, 86].includes(value)) return "❄";
  if ([95, 96, 99].includes(value)) return "⛈";
  return "☀";
}
