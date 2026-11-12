import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { createServer } from "vite";
import { createTemplateV2Draft, WEATHER_PREMIUM_TYPE } from "../src/templates-v2/schema.js";

const vite = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
const { default: TemplateLogo } = await vite.ssrLoadModule("/src/templates-v2/TemplateLogo.jsx");
const { default: TemplateV2Renderer } = await vite.ssrLoadModule("/src/templates-v2/TemplateV2Renderer.jsx");
await vite.close();
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function flatten(node, result = []) {
  if (!node) return result;
  if (Array.isArray(node)) {
    node.forEach((child) => flatten(child, result));
    return result;
  }
  result.push(node);
  flatten(node.children, result);
  return result;
}

for (const scenario of [
  { showLogo: true, showName: true, wantsLogo: true, wantsName: true },
  { showLogo: true, showName: false, wantsLogo: true, wantsName: false },
  { showLogo: false, showName: true, wantsLogo: false, wantsName: true },
  { showLogo: false, showName: false, wantsLogo: false, wantsName: false },
]) {
  test(`Player respeita logo=${scenario.showLogo} e nome=${scenario.showName}`, async () => {
    let renderer;
    await act(async () => {
      renderer = TestRenderer.create(React.createElement(TemplateLogo, {
        src: "https://cdn.example/logo.png",
        alt: "ACME",
        name: "ACME",
        showLogo: scenario.showLogo,
        showName: scenario.showName,
      }));
    });
    const nodes = flatten(renderer.toJSON());
    assert.equal(nodes.some((node) => node.type === "img"), scenario.wantsLogo);
    assert.equal(nodes.some((node) => node.type === "strong" && node.children?.includes("ACME")), scenario.wantsName);
  });
}

test("transparência da previsão vira alpha do fundo sem aplicar opacity ao conteúdo", async () => {
  const config = createTemplateV2Draft(WEATHER_PREMIUM_TYPE, {
    style: { forecastCardTransparency: 30 },
  });
  let renderer;
  await act(async () => {
    renderer = TestRenderer.create(React.createElement(TemplateV2Renderer, {
      template: { templateType: WEATHER_PREMIUM_TYPE, name: "ACME" },
      config,
      orientation: "Paisagem",
      dynamicData: {
        weather: {
          city: "Natal",
          temperature: 29,
          sensation: 31,
          condition: "Ensolarado",
          icon: "sun",
          forecast: [{ date: "2026-11-13", day: "SEX", icon: "sun", max: 30, min: 24 }],
        },
      },
    }));
  });
  try {
    const nodes = flatten(renderer.toJSON());
    const root = nodes.find((node) => String(node.props?.className || "").includes("tpv2-weather-premium"));
    assert.equal(root.props.style["--tpv2-forecast-card-alpha"], 0.7);
    nodes.filter((node) => node.type === "article").forEach((card) => assert.equal(card.props.style?.opacity, undefined));
  } finally {
    await act(async () => renderer.unmount());
  }
});
