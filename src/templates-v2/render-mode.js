export const TEMPLATE_V2_RENDER_MODES = Object.freeze({ EDITOR:"editor", THUMBNAIL:"thumbnail", PLAYER:"player" });
export function shouldShowTemplateMediaPlaceholder(mode) { return mode === TEMPLATE_V2_RENDER_MODES.EDITOR; }
export function shouldRenderTemplateV2InternalVideo(mode) { return mode === TEMPLATE_V2_RENDER_MODES.EDITOR; }
