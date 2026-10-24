# V66 consolidated template fixes — design

## Scope

Four local-only corrections: preserve Smart Lobby background transparency, add independent Smart Lobby title/main/secondary text scaling (80–140%, 5% steps, 100% default), render sports event times in the configured IANA time zone, and prevent pre-charset-fix RSS cache entries from resurfacing corrupted editorial text.

## Contracts

- Smart Lobby typography is stored under `smartLobby.typography`; absent values normalize to 100 so existing templates do not change. The shared renderer receives CSS custom properties, keeping Portal preview and Player identical. Existing overflow containment remains authoritative.
- Panel transparency continues to affect only the article background alpha. Typography controls do not alter it.
- Sports event timestamps prefer the provider's absolute timestamp. Rendering uses `Intl.DateTimeFormat` with the configured IANA zone and emits Portuguese labels such as `HOJE ÀS 18h30`; missing/invalid times remain explicit.
- News Editorial cache fingerprints include a parser generation. Old cached payloads are ignored naturally without clearing unrelated Local First data.

## Non-goals

No APK, deployment, Firebase mutation, Player state-machine change, transition change, layout redesign, or production-data write.
