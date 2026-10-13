import test from "node:test";
import assert from "node:assert/strict";

import { getClientDashboardDestination, shouldShowClientDashboardCardsInitially } from "../src/client-dashboard-navigation.js";
import { formatSessionStartedAt } from "../src/telemetry-card-data.js";
import {
  createUnavailableWeather,
  getWeatherConditionLabel,
  getWeatherIconSafe,
} from "../src/weather-presentation.js";

test("client dashboard exposes only the approved existing destinations", () => {
  assert.equal(getClientDashboardDestination("plan"), "plans");
  assert.equal(getClientDashboardDestination("screens"), "screens");
  assert.equal(getClientDashboardDestination("storage"), "media");
  assert.equal(getClientDashboardDestination("templates"), "templates");
  assert.equal(getClientDashboardDestination("marketing"), "marketing");
  assert.equal(getClientDashboardDestination("playlists"), "playlists");
  assert.equal(getClientDashboardDestination("billing"), null);
});

test("commercial cards start collapsed only in Master access", () => {
  assert.equal(shouldShowClientDashboardCardsInitially(true), false);
  assert.equal(shouldShowClientDashboardCardsInitially(false), true);
});

test("session start is formatted in pt-BR and reports missing data", () => {
  assert.equal(formatSessionStartedAt(null), "Não informado");
  assert.match(formatSessionStartedAt("2026-10-12T15:30:00.000Z"), /^12\/10\/2026, \d{2}:\d{2}:\d{2}$/);
});

test("weather failure never fabricates forecast or clear sky", () => {
  const unavailable = createUnavailableWeather("Natal/RN");
  assert.equal(unavailable.weatherCode, null);
  assert.equal(unavailable.daily, null);
  assert.equal(getWeatherConditionLabel(null), "Tempo indisponível");
  assert.equal(getWeatherIconSafe(null), null);
});

test("valid WMO weather codes keep their current interpretation", () => {
  assert.equal(getWeatherConditionLabel(61), "Chuva");
  assert.equal(getWeatherIconSafe(61), "🌧");
});
