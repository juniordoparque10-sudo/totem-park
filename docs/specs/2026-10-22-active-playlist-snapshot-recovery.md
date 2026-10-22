# Active playlist snapshot recovery

## Scope

Correct only the active playlist document listener. Playlist selection, schedules,
transitions, Firebase Rules, templates, and persistent cache behavior remain unchanged.

## Contract

- Interpret `exists()`, `metadata.fromCache`, and
  `metadata.hasPendingWrites` from every Firestore snapshot callback.
- A cache-negative or pending-write snapshot is not proof of remote deletion.
- Only a server-confirmed, non-pending negative snapshot makes the playlist absent.
- A validated playlist may be retained only for the identical client, screen,
  playlist, and listener generation.
- Callbacks from obsolete scopes are ignored.
- Listener errors are represented as unavailable, not absent. A retained playlist
  remains usable; without one the Player shows an explicit waiting state.
- Metadata-only callbacks must reach the listener by using
  `includeMetadataChanges: true`.
- Diagnostic stage completion never prevents later callbacks from applying state.

## Verification

Cover cache-negative then remote success, confirmed remote absence,
metadata-only confirmation, offline/error, reconnect, playlist switch, obsolete
callbacks, and same-scope retention.
