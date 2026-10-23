/* eslint-disable react-hooks/purity, react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { useEffect, useMemo, useRef, useState } from "react";
import { getDynamicRotationFrame } from "./rotation.js";

export function isControlledRotationElapsed(value) {
  return value !== null && value !== undefined && Number.isFinite(Number(value));
}

export function useDynamicRotation({ itemIds = [], effectiveDurationMs = Infinity, rotation = {}, secondarySlots = 3, enabled = true, executionId = "preview", controlledElapsedMs = null } = {}) {
  const startedAtRef = useRef(Date.now());
  const [elapsedMs, setElapsedMs] = useState(0);
  const idsKey = itemIds.join("|");
  const controlled = isControlledRotationElapsed(controlledElapsedMs);
  const resolvedElapsedMs = controlled ? Math.max(0, Number(controlledElapsedMs)) : elapsedMs;

  useEffect(() => {
    if (controlled) return;
    startedAtRef.current = Date.now();
    setElapsedMs(0);
  }, [controlled, executionId]);

  const frame = useMemo(() => getDynamicRotationFrame({ itemIds, elapsedMs:resolvedElapsedMs, effectiveDurationMs, secondarySlots, ...rotation }), [idsKey, resolvedElapsedMs, effectiveDurationMs, rotation.featuredSeconds, rotation.secondarySeconds, secondarySlots]);

  useEffect(() => {
    if (controlled || !enabled || frame.expired || !itemIds.length || !Number.isFinite(frame.nextBoundaryMs)) return undefined;
    const delay = Math.max(16, frame.nextBoundaryMs - elapsedMs);
    const timer = globalThis.setTimeout(() => setElapsedMs(Date.now() - startedAtRef.current), delay);
    return () => globalThis.clearTimeout(timer);
  }, [controlled, enabled, executionId, frame.expired, frame.nextBoundaryMs, elapsedMs, idsKey]);

  return frame;
}
