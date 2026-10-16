/* eslint-disable react-hooks/purity, react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { useEffect, useMemo, useRef, useState } from "react";
import { getDynamicRotationFrame } from "./rotation.js";

export function useDynamicRotation({ itemIds = [], effectiveDurationMs = Infinity, rotation = {}, secondarySlots = 3, enabled = true, executionId = "preview" } = {}) {
  const startedAtRef = useRef(Date.now());
  const [elapsedMs, setElapsedMs] = useState(0);
  const idsKey = itemIds.join("|");

  useEffect(() => {
    startedAtRef.current = Date.now();
    setElapsedMs(0);
  }, [executionId]);

  const frame = useMemo(() => getDynamicRotationFrame({ itemIds, elapsedMs, effectiveDurationMs, secondarySlots, ...rotation }), [idsKey, elapsedMs, effectiveDurationMs, rotation.featuredSeconds, rotation.secondarySeconds, secondarySlots]);

  useEffect(() => {
    if (!enabled || frame.expired || !itemIds.length || !Number.isFinite(frame.nextBoundaryMs)) return undefined;
    const delay = Math.max(16, frame.nextBoundaryMs - elapsedMs);
    const timer = globalThis.setTimeout(() => setElapsedMs(Date.now() - startedAtRef.current), delay);
    return () => globalThis.clearTimeout(timer);
  }, [enabled, executionId, frame.expired, frame.nextBoundaryMs, elapsedMs, idsKey]);

  return frame;
}
