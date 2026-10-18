export function executePlaylistNavigationCommand(command, handlers = {}) {
  if (command?.type === "previousMedia") {
    handlers.previous?.();
    return true;
  }
  if (command?.type === "nextMedia") {
    handlers.next?.();
    return true;
  }
  return false;
}
