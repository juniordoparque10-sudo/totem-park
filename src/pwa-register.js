export function registerTotemParkPWA() {
  if (!("serviceWorker" in navigator)) return;

  applyRoutePwaMetadata();

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => {
        console.log("Totem Park TV PWA registrado com sucesso.");
      })
      .catch((error) => {
        console.log("Erro ao registrar PWA:", error);
      });
  });
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
