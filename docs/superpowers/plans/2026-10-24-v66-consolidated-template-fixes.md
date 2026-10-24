# V66 consolidated template fixes — implementation plan

1. Add failing Smart Lobby normalization/editor/renderer tests; implement typography normalization, controls and CSS variables while retaining panel-alpha semantics.
2. Add failing time-zone formatting/provider timestamp tests; implement a pure formatter and use it in all sports cards, preserving provider absolute timestamps.
3. Add failing RSS cache-generation tests; version only the News Editorial RSS cache fingerprint and retain the approved byte decoder in both proxy copies.
4. Run focused template, RSS, cache and consolidated regressions, then build the web bundle only as a compile check. Review the final diff for scope and unrelated dirty files.

No APK generation, install, deploy or remote mutation is permitted.
