import test, { after } from "node:test";
import assert from "node:assert/strict";
import React, { useState } from "react";
import { act, create } from "react-test-renderer";
import {
  clearTemplateDataMemoryCacheForTests,
  createNewsDataFingerprintConfig,
  writeNewsEditorialDynamicCache,
  writeTemplateDataCache,
} from "../src/templates-v2/offline-data-cache.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const consoleErrorBeforeRendererFilter = console.error;
console.error = (...args) => {
  if (String(args[0]).includes("react-test-renderer is deprecated")) return;
  consoleErrorBeforeRendererFilter(...args);
};
after(() => { console.error = consoleErrorBeforeRendererFilter; });

let rehydration = {};
try {
  rehydration = await import("../src/templates-v2/news-offline-rehydration.js");
} catch {
  // RED: the production boundary is introduced only after this test fails.
}

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}

const scope = { clientId:"client-1", screenId:"screen-1", templateId:"template-1" };
const dynamicNews = {
  editorial:{ enabled:true, newsFeedUrl:"https://news.example/editorial.xml" },
  feed:{ enabled:true, news:{ enabled:true, newsFeedUrl:"https://news.example/ticker.xml" } },
};
const clockNewsConfig = createNewsDataFingerprintConfig({
  enabled:true,
  newsFeedUrl:"https://news.example/clock.xml",
});

function Harness({ configuration, storage, onRender, schedule }) {
  const [dynamicData, setDynamicData] = useState(() => ({
    weather:{ temperature:27 },
    sports:{ football:[] },
    ...(configuration ? rehydration.restoreTemplateV2NewsCachedData({
      scope,
      templateType:configuration.templateType,
      dynamicNews:configuration.dynamicNews,
      newsConfig:configuration.newsConfig,
      storage,
    }) : {}),
  }));
  onRender(dynamicData);
  rehydration.useTemplateV2NewsRehydration({
    scope,
    templateType:configuration?.templateType || "",
    dynamicNews:configuration?.dynamicNews || null,
    newsConfig:configuration?.newsConfig || null,
    storage,
    schedule,
    onRestore:(news) => setDynamicData((current) => ({ ...current, ...news })),
  });
  return React.createElement("output", null, JSON.stringify(dynamicData));
}

test("Android mount reidrata somente Notícias V2 após configuração tardia e cold remount offline", async () => {
  assert.equal(typeof rehydration.useTemplateV2NewsRehydration, "function");
  const originalCapacitor = globalThis.Capacitor;
  const originalNavigator = globalThis.navigator;
  const originalConsoleError = console.error;
  const unexpectedReactErrors = [];
  const storage = new MemoryStorage();
  const image = "https://cdn.example/external-not-yet-cached.jpg";
  writeNewsEditorialDynamicCache(scope, dynamicNews, {
    editorialNews:[{ title:"Principal persistida", image }],
    feedNews:[{ title:"Ticker persistido" }],
  }, { storage, now:100 });
  writeTemplateDataCache({ ...scope, module:"news", config:clockNewsConfig }, [{ title:"Hora Certa persistida" }], { storage, now:101 });
  writeTemplateDataCache({ ...scope, module:"weather", config:{ city:"Natal" } }, { temperature:99 }, { storage, now:102 });
  writeTemplateDataCache({ ...scope, module:"sports", config:{ provider:"test" } }, { sports:{ football:["indevido"] } }, { storage, now:103 });

  let renders = 0;
  let root;
  try {
    console.error = (...args) => {
      if (String(args[0]).includes("react-test-renderer is deprecated")) return;
      unexpectedReactErrors.push(args.map(String).join(" "));
    };
    globalThis.Capacitor = { getPlatform:() => "android" };
    Object.defineProperty(globalThis, "navigator", { configurable:true, value:{ onLine:false } });
    await act(async () => {
      root = create(React.createElement(Harness, { configuration:null, storage, onRender:() => { renders += 1; } }));
    });
    assert.doesNotMatch(root.toJSON().children[0], /Principal persistida|Hora Certa persistida/);

    await act(async () => {
      root.update(React.createElement(Harness, {
        configuration:{ templateType:"news-editorial-dynamic", dynamicNews },
        storage,
        onRender:() => { renders += 1; },
      }));
      await Promise.resolve();
    });
    const newsJson = root.toJSON().children[0];
    assert.match(newsJson, /Principal persistida/);
    assert.match(newsJson, /Ticker persistido/);
    assert.match(newsJson, /external-not-yet-cached\.jpg/);
    assert.match(newsJson, /"temperature":27/);
    assert.doesNotMatch(newsJson, /"temperature":99|indevido/);

    await act(async () => { root.unmount(); });
    clearTemplateDataMemoryCacheForTests();
    renders = 0;
    await act(async () => {
      root = create(React.createElement(Harness, {
        configuration:{ templateType:"clock-pro", newsConfig:clockNewsConfig },
        storage,
        onRender:() => { renders += 1; },
      }));
      await Promise.resolve();
    });
    const clockJson = root.toJSON().children[0];
    assert.match(clockJson, /Hora Certa persistida/);
    assert.match(clockJson, /"temperature":27/);
    assert.doesNotMatch(clockJson, /Principal persistida|Ticker persistido|"temperature":99|indevido/);
    assert.ok(renders <= 3, `rehydration rendered ${renders} times`);
    assert.deepEqual(unexpectedReactErrors, []);
  } finally {
    if (root) await act(async () => { root.unmount(); });
    clearTemplateDataMemoryCacheForTests();
    if (originalCapacitor === undefined) delete globalThis.Capacitor;
    else globalThis.Capacitor = originalCapacitor;
    if (originalNavigator === undefined) delete globalThis.navigator;
    else Object.defineProperty(globalThis, "navigator", { configurable:true, value:originalNavigator });
    console.error = originalConsoleError;
  }
});

test("unmount Android cancela reidratação pendente sem atualizar estado", async () => {
  const storage = new MemoryStorage();
  writeNewsEditorialDynamicCache(scope, dynamicNews, {
    editorialNews:[{ title:"Não deve renderizar" }],
  }, { storage, now:100 });
  const scheduled = [];
  const rendered = [];
  let root;
  await act(async () => {
    root = create(React.createElement(Harness, {
      configuration:null,
      storage,
      schedule:(task) => { scheduled.push(task); },
      onRender:(value) => rendered.push(value),
    }));
  });
  await act(async () => {
    root.update(React.createElement(Harness, {
      configuration:{ templateType:"news-editorial-dynamic", dynamicNews },
      storage,
      schedule:(task) => { scheduled.push(task); },
      onRender:(value) => rendered.push(value),
    }));
  });
  assert.equal(scheduled.length, 1);
  await act(async () => { root.unmount(); });
  await act(async () => { scheduled[0](); });
  assert.equal(rendered.some((value) => value.editorialNews?.[0]?.title === "Não deve renderizar"), false);
  clearTemplateDataMemoryCacheForTests();
});

test("configuração disponível no primeiro mount não agenda reidratação redundante", async () => {
  const storage = new MemoryStorage();
  writeTemplateDataCache({ ...scope, module:"news", config:clockNewsConfig }, [{ title:"Já hidratada" }], { storage, now:100 });
  const scheduled = [];
  let root;
  await act(async () => {
    root = create(React.createElement(Harness, {
      configuration:{ templateType:"clock-pro", newsConfig:clockNewsConfig },
      storage,
      schedule:(task) => scheduled.push(task),
      onRender:() => {},
    }));
  });
  assert.match(root.toJSON().children[0], /Já hidratada/);
  assert.equal(scheduled.length, 0);
  await act(async () => { root.unmount(); });
  clearTemplateDataMemoryCacheForTests();
});

test("Hora Certa V2 reidrata RSS pela configuração real mesmo com identidade provisória", async () => {
  const storage = new MemoryStorage();
  const published = {
    modules:{
      news:{ enabled:true, newsFeedUrl:"https://news.example/clock.xml", selectedNewsSources:[] },
    },
  };
  const newsConfig = createNewsDataFingerprintConfig(published.modules.news);
  writeTemplateDataCache({ ...scope, module:"news", config:newsConfig }, [{ title:"RSS real da Hora Certa" }], { storage, now:100 });
  clearTemplateDataMemoryCacheForTests();
  let root;
  await act(async () => {
    root = create(React.createElement(Harness, { configuration:null, storage, onRender:() => {} }));
  });
  await act(async () => {
    root.update(React.createElement(Harness, {
      configuration:{ templateType:"", newsConfig },
      storage,
      onRender:() => {},
    }));
    await Promise.resolve();
  });
  assert.match(root.toJSON().children[0], /RSS real da Hora Certa/);
  await act(async () => { root.unmount(); });
  clearTemplateDataMemoryCacheForTests();
});

test("rehydration boundary has no native image preparation side effect", () => {
  assert.equal(typeof rehydration.restoreTemplateV2NewsCachedData, "function");
  assert.doesNotMatch(String(rehydration.useTemplateV2NewsRehydration), /prepareTemplateAssets|refreshTemplateAssets|setInterval/);
});
