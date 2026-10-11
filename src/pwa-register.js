export function registerTotemParkPWA() {
  if (!("serviceWorker" in navigator)) return;

  applyRoutePwaMetadata();

  window.addEventListener("load", () => {
    const fingerprint = getCurrentBundleFingerprint();
    navigator.serviceWorker
      .register(`/sw.js?v=${encodeURIComponent(fingerprint)}`, { updateViaCache: "none" })
      .then(() => {
        console.log("Totem Park TV PWA registrado com sucesso.");
      })
      .catch((error) => {
        console.log("Erro ao registrar PWA:", error);
      });
  });
}

export function getCurrentBundleFingerprint(documentRef = globalThis.document) {
  const scripts = Array.from(documentRef?.querySelectorAll?.('script[type="module"][src]') || []);
  const executable = scripts.find((script) => /\/assets\/index-[^/]+\.js(?:\?|$)/.test(script.src || ""));
  const match = /\/assets\/index-([A-Za-z0-9_-]+)\.js(?:\?|$)/.exec(executable?.src || "");
  return match?.[1] || "development";
}

function applyRoutePwaMetadata() {
  const isTvRoute = window.location.pathname === "/tv" || window.location.pathname.startsWith("/tv/");
  const manifestLink = document.getElementById("app-manifest");
  const iconLink = document.getElementById("app-icon-192");
  const appleIconLink = document.getElementById("apple-touch-icon");
  const themeColorMeta = document.getElementById("theme-color-meta");

  const manifestHref = isTvRoute ? "/manifest-tv.webmanifest" : "/manifest.webmanifest";
  const iconHref = isTvRoute ? "/icons/tv-icon-192.png" : "/icons/site-icon-192.png";
  const themeColor = isTvRoute ? "#26105f" : "#050816";

  if (manifestLink) manifestLink.setAttribute("href", manifestHref);
  if (iconLink) iconLink.setAttribute("href", iconHref);
  if (appleIconLink) appleIconLink.setAttribute("href", iconHref);
  if (themeColorMeta) themeColorMeta.setAttribute("content", themeColor);
}
