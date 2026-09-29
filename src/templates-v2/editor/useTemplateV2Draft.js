import { useEffect, useMemo, useState } from "react";
import { HERO_BUSINESS_TYPE, createTemplateV2Draft, getTemplateV2DraftConfig, getTemplateV2PublishedConfig, isTemplateV2Dirty } from "../schema";

export function useTemplateV2Draft(template, blankType = HERO_BUSINESS_TYPE) {
  const [publishedSnapshot, setPublishedSnapshot] = useState(null);
  const [persistedDraft, setPersistedDraft] = useState(() => createTemplateV2Draft(blankType));
  const [editorDraft, setEditorDraft] = useState(() => createTemplateV2Draft(blankType));

  useEffect(() => {
    const nextPersisted = template ? getTemplateV2DraftConfig(template) : createTemplateV2Draft(blankType);
    // A new Firestore revision starts a new isolated editing session.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPublishedSnapshot(template ? getTemplateV2PublishedConfig(template) : null);
    setPersistedDraft(nextPersisted);
    setEditorDraft(nextPersisted);
  // The revision fields intentionally define the external session boundary.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template?.id, template?.status?.draftRevision, template?.status?.publishedRevision, blankType]);

  const isDirty = useMemo(
    () => isTemplateV2Dirty(editorDraft, persistedDraft),
    [editorDraft, persistedDraft]
  );

  function update(path, value) {
    setEditorDraft((current) => {
      const next = structuredClone(current);
      const parts = path.split(".");
      let target = next;
      parts.slice(0, -1).forEach((part) => {
        target[part] ||= {};
        target = target[part];
      });
      target[parts.at(-1)] = value;
      return next;
    });
  }

  function discard() {
    setEditorDraft(structuredClone(persistedDraft));
  }

  function markSaved(savedDraft) {
    const next = structuredClone(savedDraft);
    setPersistedDraft(next);
    setEditorDraft(next);
  }

  function markPublished(published) {
    setPublishedSnapshot(structuredClone(published));
  }

  return {
    publishedSnapshot,
    persistedDraft,
    editorDraft,
    setEditorDraft,
    update,
    discard,
    markSaved,
    markPublished,
    isDirty,
  };
}
