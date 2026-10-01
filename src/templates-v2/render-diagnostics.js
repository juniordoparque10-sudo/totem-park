const DIAGNOSTIC_STORAGE_KEY = "totempark-template-render-diagnostics";

function styleSnapshot(node) {
  if (!node || typeof getComputedStyle !== "function") return null;
  const rect = node.getBoundingClientRect();
  const style = getComputedStyle(node);
  return {
    className: String(node.className || ""),
    rect:{ x:rect.x, y:rect.y, width:rect.width, height:rect.height },
    transform:style.transform,
    filter:style.filter,
    opacity:style.opacity,
    willChange:style.willChange,
    fontFamily:style.fontFamily,
    fontWeight:style.fontWeight,
  };
}

export function isTemplateRenderDiagnosticsEnabled(storage = globalThis.localStorage) {
  try { return storage?.getItem?.(DIAGNOSTIC_STORAGE_KEY) === "true"; }
  catch { return false; }
}

export function captureTemplateRenderDiagnostics(root) {
  if (!root) return null;
  const templateRoot = root.matches?.(".tpv2-root") ? root : root.querySelector?.(".tpv2-root");
  const screenWidth = Number(globalThis.screen?.width || 0);
  const screenHeight = Number(globalThis.screen?.height || 0);
  const devicePixelRatio = Number(globalThis.devicePixelRatio || 1);
  return {
    screen:{ width:screenWidth, height:screenHeight },
    viewport:{ width:Number(globalThis.innerWidth || 0), height:Number(globalThis.innerHeight || 0) },
    devicePixelRatio,
    estimatedPhysicalPixels:{ width:screenWidth * devicePixelRatio, height:screenHeight * devicePixelRatio },
    root:styleSnapshot(templateRoot || root),
    templatePreview:styleSnapshot(root.closest?.(".template-tv-preview")),
    transitionLayer:styleSnapshot(root.closest?.(".player-transition-layer")),
    player:styleSnapshot(root.closest?.(".player-screen")),
  };
}

export function reportTemplateRenderDiagnostics(root, context = {}) {
  if (!isTemplateRenderDiagnosticsEnabled()) return null;
  const detail = { ...context, ...captureTemplateRenderDiagnostics(root) };
  console.info("[TemplateV2 render diagnostics]", detail);
  globalThis.dispatchEvent?.(new CustomEvent("totempark-template-render-diagnostics", { detail }));
  return detail;
}
