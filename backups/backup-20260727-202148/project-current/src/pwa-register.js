export function registerTotemParkPWA() {
  if (!("serviceWorker" in navigator)) return;

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