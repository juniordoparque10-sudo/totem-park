const CLIENT_DASHBOARD_DESTINATIONS = Object.freeze({
  plan: "plans",
  screens: "screens",
  storage: "media",
  templates: "templates",
  marketing: "marketing",
  playlists: "playlists",
});

export function getClientDashboardDestination(card) {
  return CLIENT_DASHBOARD_DESTINATIONS[card] || null;
}

export function shouldShowClientDashboardCardsInitially(isMasterAccess) {
  return !isMasterAccess;
}
