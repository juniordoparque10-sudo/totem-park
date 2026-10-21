import { useEffect, useState, useSyncExternalStore } from "react";
import { createPreviewPlaybackSession } from "./preview-playback-session.js";

export default function useTemplateV2PreviewPlayback() {
  const [session] = useState(() => createPreviewPlaybackSession());
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);

  useEffect(() => {
    session.start();
    return () => session.destroy();
  }, [session]);

  return {
    ...snapshot,
    pause:session.pause,
    resume:session.resume,
    restart:session.restart,
  };
}
