import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { NEWS_EDITORIAL_DYNAMIC_TYPE, createTemplateV2Document, createTemplateV2Draft, getTemplateV2LibraryPreviewState } from "../src/templates-v2/schema.js";
import { getTemplateV2Definition } from "../src/templates-v2/registry.js";

test("Notícias Dinâmica expõe somente controles de visibilidade aplicáveis", () => {
  assert.deepEqual(getTemplateV2Definition(NEWS_EDITORIAL_DYNAMIC_TYPE).visibilityControls, [
    "showLogo", "showName", "showContent", "showHeadline", "showSubtitle", "showServices",
  ]);
});

test("renderer aplica logo, conteúdo, headline, subtítulo e cards ao preview", () => {
  const renderer = fs.readFileSync(new URL("../src/templates-v2/news-editorial-dynamic/NewsEditorialDynamicRenderer.jsx", import.meta.url), "utf8");
  assert.match(renderer, /visibility\.showLogo/);
  assert.match(renderer, /visibility\.showName/);
  assert.match(renderer, /visibility\.showContent/);
  assert.match(renderer, /visibility\.showHeadline/);
  assert.match(renderer, /visibility\.showSubtitle/);
  assert.match(renderer, /visibility\.showServices/);
  assert.match(renderer, /<TemplateLogo className="news-dynamic-logo"/);
});

test("visibilidade persiste ao salvar e reabrir a configuração", () => {
  const saved = createTemplateV2Draft(NEWS_EDITORIAL_DYNAMIC_TYPE, {
    visibility:{ showLogo:false, showName:true, showContent:true, showHeadline:false, showSubtitle:true, showServices:false },
  });
  const reopened = createTemplateV2Draft(NEWS_EDITORIAL_DYNAMIC_TYPE, saved);
  assert.deepEqual(reopened.visibility, saved.visibility);
});

test("miniatura versiona rascunho salvo e publicação separadamente", () => {
  const published = createTemplateV2Draft(NEWS_EDITORIAL_DYNAMIC_TYPE, { style:{ primaryColor:"#111111" } });
  const draft = createTemplateV2Draft(NEWS_EDITORIAL_DYNAMIC_TYPE, { style:{ primaryColor:"#222222" } });
  const template = {
    ...createTemplateV2Document({ name:"Editorial", type:NEWS_EDITORIAL_DYNAMIC_TYPE, draft }),
    published,
    status:{ draftRevision:"draft-2", publishedRevision:"published-1" },
  };
  const changed = getTemplateV2LibraryPreviewState(template);
  assert.equal(changed.source, "draft");
  assert.equal(changed.config.style.primaryColor, "#222222");
  assert.match(changed.versionKey, /draft:.*draft-2/);

  const synchronized = getTemplateV2LibraryPreviewState({ ...template, draft:published, status:{ draftRevision:"draft-3", publishedRevision:"published-3" } });
  assert.equal(synchronized.source, "published");
  assert.equal(synchronized.config.style.primaryColor, "#111111");
  assert.match(synchronized.versionKey, /published:.*published-3/);
});

test("editor usa a chave de revisão ao montar a miniatura estática", () => {
  const editor = fs.readFileSync(new URL("../src/templates-v2/editor/TemplateV2Editor.jsx", import.meta.url), "utf8");
  const thumbnail = fs.readFileSync(new URL("../src/templates-v2/editor/TemplateV2LibraryThumbnail.jsx", import.meta.url), "utf8");
  assert.match(editor, /getTemplateV2LibraryPreviewState/);
  assert.match(editor, /key=\{thumbnail\.versionKey\}/);
  assert.match(editor, /TemplateV2LibraryThumbnail/);
  assert.match(thumbnail, /mode:"thumbnail"/);
});
