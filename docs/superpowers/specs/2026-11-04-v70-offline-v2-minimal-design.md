# V70 Offline V2 Minimal — Design

## Intent

Preserve the last valid News V2 content and Clock Pro RSS through network loss and offline cold boot, without importing the rejected native image-preparation effect or changing unrelated dynamic modules.

## Selected approach

Port only the empty-response/reconnect behavior from `4d71118f` and implement a new news-only late rehydration boundary. The rejected alternative is cherry-picking `df5868b6`, because its rehydration also reads weather and sports and its `App.jsx` change adds native image preparation during rendering.

## Boundaries

- Late rehydration may merge only `editorialNews`, `feedNews`, and Clock Pro `news`.
- Existing initial hydration, weather, sports, playback, V1, CSS, Firebase, Android native code, and media cache remain unchanged.
- External news images remain available offline only when the existing asset pipeline has already stored them; this hotfix does not add downloads or rewrite image URLs.
- A React mount harness simulates Capacitor Android, delayed configuration, offline remount, cleanup, and render-count stability.
