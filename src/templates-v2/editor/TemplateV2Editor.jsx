import { useEffect, useMemo, useRef, useState } from "react";
import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, updateDoc } from "firebase/firestore";
import { ChevronDown, CloudSun, Image, Palette, Plus, RotateCcw, Save, Send, Type } from "lucide-react";
import { auth, db } from "../../firebase";
import { uploadStorageAsset } from "../../storage-service";
import { uploadLimitBytes } from "../../upload-plan-policy";
import {
  HERO_BUSINESS_TYPE,
  CLOCK_PRO_TYPE,
  WEATHER_PREMIUM_TYPE,
  SPORTS_PREMIUM_TYPE,
  cloneTemplateV2Config,
  createTemplateV2Document,
  getPublishedTemplateV2View,
  getTemplateV2DraftConfig,
  getTemplateV2Name,
  isTemplateV2Dirty,
  isTemplateV2,
} from "../schema";
import { TEMPLATE_V2_CATEGORIES, getTemplateV2Definition, listTemplateV2Definitions } from "../registry";
import { useTemplateV2Draft } from "./useTemplateV2Draft";
import TemplateV2MediaField from "./TemplateV2MediaField";
import { mediaDocumentToTemplateAsset } from "./media-utils";
import TemplateV2PreviewPanel from "./TemplateV2PreviewPanel";
import TemplateV2ScaledStage from "./TemplateV2ScaledStage";
import TemplateV2DynamicStage from "./TemplateV2DynamicStage";
import useTemplateV2DynamicData from "./useTemplateV2DynamicData";
import PortalModal from "../../PortalModal";
import PreviewModal from "../../PreviewModal";
import QRCodeConfigurator from "../../QRCodeConfigurator";
import { getTemplatePlaylistUsage } from "../../template-usage";
import "./template-v2-editor.css";
import SportsV2EditorFields from "../sports-v2/SportsV2EditorFields";
import { getSportsV2Timing, normalizeSportsV2Config, SPORTS_V2_MODES } from "../sports-v2/config";

function safeFileName(name = "asset") { return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-"); }
function revision(prefix) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }
function uploadPlanName(plan = "") {
  const value = String(plan).toLowerCase();
  if (value.includes("enterprise")) return "Enterprise";
  if (value.includes("professional")) return "Professional";
  if (value.includes("business")) return "Business";
  return "Start";
}

function Section({ sectionId, icon, title, children, open, onToggle }) {
  return <section data-section={sectionId} className={`tpv2-editor-section ${open ? "open" : ""}`}><button type="button" aria-expanded={open} onClick={() => onToggle(sectionId)}>{icon}<strong>{title}</strong><ChevronDown /></button><div hidden={!open}>{children}</div></section>;
}

function PopupPreview({ template, config, orientation, onClose, dynamicData }) {
  const logical = orientation === "Retrato" ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 };
  return <PreviewModal title="Prévia ampliada" subtitle={`${orientation} · editorDraft`} logicalWidth={logical.width} logicalHeight={logical.height} onClose={onClose}><TemplateV2ScaledStage className="portal-preview-scaled-content" template={template} config={config} orientation={orientation} dynamicData={dynamicData} /></PreviewModal>;
}

function TypographyControl({ label, value, onChange, sizeLimits, lineLimits = [0.9, 1.7] }) {
  return <div className="tpv2-typography-control"><strong>{label}</strong><label>Tamanho <input type="range" min={sizeLimits[0]} max={sizeLimits[1]} value={value.fontSize} onChange={(event) => onChange("fontSize", Number(event.target.value))} /><span>{value.fontSize}px</span></label><label>Entrelinhas <input type="range" min={lineLimits[0]} max={lineLimits[1]} step="0.05" value={value.lineHeight} onChange={(event) => onChange("lineHeight", Number(event.target.value))} /><span>{Number(value.lineHeight).toFixed(2)}</span></label></div>;
}

export default function TemplateV2Editor({ client, access, entitlement = { allowed: true }, weatherCities = [], newsSources = [], loadWeather, loadNews, onUseInPlaylist }) {
  const workspaceRef = useRef(null);
  const [templates, setTemplates] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [mediaList, setMediaList] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [newType, setNewType] = useState(HERO_BUSINESS_TYPE);
  const [catalogCategory, setCatalogCategory] = useState("Todos");
  const [catalogOrientation, setCatalogOrientation] = useState("Todos");
  const [name, setName] = useState("Hero Business");
  const [orientation, setOrientation] = useState("Paisagem");
  const [scale, setScale] = useState("fit");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBlockedBy, setDeleteBlockedBy] = useState([]);
  const [openSections, setOpenSections] = useState({ content: true, media: false, appearance: false, dynamicData: false, display: false });
  const selected = useMemo(() => templates.find((item) => item.id === selectedId) || null, [templates, selectedId]);
  const activeType = selected?.identity?.templateType || selected?.templateType || newType;
  const definition = getTemplateV2Definition(activeType);
  const catalogItems = listTemplateV2Definitions().filter((item) => (catalogCategory === "Todos" || item.category === catalogCategory) && (catalogOrientation === "Todos" || item.orientations.includes(catalogOrientation)));
  const draftState = useTemplateV2Draft(selected, activeType);
  const sportsDraft = activeType === SPORTS_PREMIUM_TYPE ? normalizeSportsV2Config(draftState.editorDraft.sports) : null;
  const previewTemplate = selected || createTemplateV2Document({ name, type: activeType });
  const previewDynamicData = useTemplateV2DynamicData(draftState.editorDraft, { loadWeather, loadNews });

  useEffect(() => {
    const stopTemplates = onSnapshot(collection(db, "clients", client.id, "templates"), (snapshot) => {
      const list = snapshot.docs.map((item) => ({ id: item.id, ...item.data() })).filter(isTemplateV2);
      setTemplates(list);
    });
    const stopMedia = onSnapshot(collection(db, "clients", client.id, "media"), (snapshot) => setMediaList(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))));
    const stopPlaylists = onSnapshot(collection(db, "clients", client.id, "playlists"), (snapshot) => setPlaylists(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))));
    return () => { stopTemplates(); stopMedia(); stopPlaylists(); };
  }, [client.id]);

  /* The selected Firestore document is an external editor session boundary. */
  /* eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => { setName(selected ? getTemplateV2Name(selected) : (definition?.label || "Hero Business")); }, [selected?.id, selected?.status?.draftRevision, definition?.label]);

  async function saveDraft() {
    if (!entitlement.allowed) { setMessage("Templates V2 não estão disponíveis no seu plano."); return; }
    if (selected ? access?.canEditTemplates === false : access?.canCreateTemplates === false) { setMessage("Seu plano não permite esta operação."); return; }
    if (activeType === SPORTS_PREMIUM_TYPE) { const sports = normalizeSportsV2Config(draftState.editorDraft.sports); if (sports.mode === SPORTS_V2_MODES.ROTATION && !getSportsV2Timing(sports,draftState.editorDraft.display.duration).valid) { setMessage("A soma dos tempos por esporte deve ser igual à duração total do template."); return; } }
    setSaving(true); setMessage("");
    try {
      const draftRevision = revision("draft");
      if (selected) {
        await updateDoc(doc(db, "clients", client.id, "templates", selected.id), {
          "identity.name": name.trim() || definition?.label || "Template V2",
          draft: cloneTemplateV2Config(draftState.editorDraft),
          "status.draftRevision": draftRevision,
          updatedAt: serverTimestamp(),
        });
        draftState.markSaved(draftState.editorDraft);
      } else {
        const base = createTemplateV2Document({ name: name.trim() || definition?.label || "Template V2", type: activeType, draft: draftState.editorDraft });
        const created = await addDoc(collection(db, "clients", client.id, "templates"), { ...base, status: { ...base.status, draftRevision }, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        setSelectedId(created.id);
      }
      setMessage("Rascunho salvo. A publicação exibida nas telas não foi alterada.");
    } catch (error) { console.error(error); setMessage("Não foi possível salvar o rascunho."); } finally { setSaving(false); }
  }

  async function writePublishedTemplate(item, published) {
    const publishedRevision = revision("published");
    const templateName = getTemplateV2Name(item) || definition?.label || "Template V2";
    const templateType = item.identity?.templateType || item.templateType || activeType;
    await updateDoc(doc(db, "clients", client.id, "templates", item.id), {
      published,
      name: templateName,
      title: templateName,
      type: templateType,
      templateType,
      duration: Number(published.display.duration || 15),
      orientation: published.display.defaultOrientation || "Paisagem",
      enabled: true,
      "identity.name": templateName,
      "status.enabled": true,
      "status.publicationState": "published",
      "status.publishedRevision": publishedRevision,
      publishedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  async function publish() {
    if (!entitlement.allowed) { setMessage("Templates V2 não estão disponíveis no seu plano."); return; }
    if (!selected) { setMessage("Salve o rascunho antes de publicar."); return; }
    if (draftState.isDirty) { setMessage("Salve as alterações do rascunho antes de publicar."); return; }
    if (activeType === SPORTS_PREMIUM_TYPE) { const sports = normalizeSportsV2Config(draftState.persistedDraft.sports); if (sports.mode === SPORTS_V2_MODES.ROTATION && !getSportsV2Timing(sports,draftState.persistedDraft.display.duration).valid) { setMessage("A soma dos tempos por esporte deve ser igual à duração total do template."); return; } }
    if (access?.canEditTemplates === false) { setMessage("Seu plano não permite publicar templates."); return; }
    if (draftState.persistedDraft.media?.primary?.type === "video") { setMessage("Substitua o vídeo interno por uma imagem antes de publicar. Vídeo em Template V2 ainda está em homologação."); return; }
    setSaving(true); setMessage("");
    try {
      const published = cloneTemplateV2Config(draftState.persistedDraft);
      await writePublishedTemplate({ ...selected, identity: { ...selected.identity, name: name.trim() || definition?.label || "Template V2" } }, published);
      draftState.markPublished(published);
      setMessage("Template publicado e disponível para seleção em playlists. Nenhuma tela foi alterada.");
    } catch (error) { console.error(error); setMessage("Não foi possível publicar o template."); } finally { setSaving(false); }
  }

  function openTemplate(item) {
    setSelectedId(item.id);
    setMessage("");
    requestAnimationFrame(() => workspaceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  async function publishFromCard(item) {
    if (!entitlement.allowed || access?.canEditTemplates === false) { setMessage("Seu plano não permite publicar templates."); return; }
    const persistedDraft = getTemplateV2DraftConfig(item);
    if (persistedDraft.media?.primary?.type === "video") { openTemplate(item); setMessage("Substitua o vídeo interno por uma imagem antes de publicar."); return; }
    setSaving(true); setMessage("");
    try {
      await writePublishedTemplate(item, cloneTemplateV2Config(persistedDraft));
      setMessage("Template publicado e disponível para seleção em playlists.");
    } catch (error) { console.error(error); setMessage("Não foi possível publicar o template."); } finally { setSaving(false); }
  }

  function requestDelete(item) {
    const usage = getTemplatePlaylistUsage(playlists, item.id);
    setDeleteBlockedBy(usage);
    setDeleteTarget(item);
  }

  async function deleteTemplateInstance() {
    if (!deleteTarget || deleteBlockedBy.length) return;
    try {
      setSaving(true);
      await deleteDoc(doc(db, "clients", client.id, "templates", deleteTarget.id));
      if (selectedId === deleteTarget.id) setSelectedId("");
      setDeleteTarget(null);
      setMessage("Template excluído. As mídias da biblioteca foram preservadas.");
    } catch (error) { console.error(error); setMessage("Não foi possível excluir o template."); } finally { setSaving(false); }
  }

  async function uploadMedia(file, event, targetPath = "media.primary") {
    if (event) event.target.value = "";
    if (!file) return;
    if (!entitlement.allowed) { setMessage("Templates V2 não estão disponíveis no seu plano."); return; }
    if (access?.canUpload === false) { setMessage("Seu plano não permite novos uploads."); return; }
    const kind = file.type.startsWith("video/") ? "video" : file.type.startsWith("image/") ? "image" : "";
    if (!kind) { setMessage("Selecione uma imagem compatível."); return; }
    if (targetPath === "media.primary" && kind === "video") { setMessage("Vídeo dentro de Template V2 ainda está em homologação. Selecione uma imagem."); return; }
    if (targetPath === "content.logo" && kind !== "image") { setMessage("O logo precisa ser uma imagem."); return; }
    const limit = uploadLimitBytes(uploadPlanName(client.plan), kind);
    if (limit > 0 && file.size > limit) { setMessage(`O arquivo excede o limite de ${Math.round(limit / 1024 / 1024)} MB do plano.`); return; }
    setUploading(true); setMessage("");
    try {
      const storagePath = `clients/${client.id}/media/${Date.now()}_${safeFileName(file.name)}`;
      const result = await uploadStorageAsset({ path: storagePath, file, contentType: file.type, customMetadata: { source: "media-library", clientId: client.id, uploadedByUid: auth.currentUser?.uid || "", templateV2: "true" } });
      const mediaDoc = {
        title: file.name.replace(/\.[^.]+$/, ""), type: kind === "video" ? "Vídeo" : "Imagem", contentType: file.type,
        preview: result.publicUrl || result.url, publicUrl: result.publicUrl || result.url, url: result.publicUrl || result.url,
        storagePath: result.storagePath || storagePath, storageProvider: result.storageProvider || "firebase", storageKey: result.storageKey || result.storagePath || storagePath,
        fileHash: result.fileHash || "", etag: result.etag || "", sizeBytes: file.size, duration: 15, sound: kind === "video", createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      };
      const created = await addDoc(collection(db, "clients", client.id, "media"), mediaDoc);
      draftState.update(targetPath, mediaDocumentToTemplateAsset({ id: created.id, ...mediaDoc }));
      setMessage("Mídia adicionada à biblioteca e vinculada ao rascunho.");
    } catch (error) { console.error(error); setMessage("Falha ao enviar a mídia."); } finally { setUploading(false); }
  }

  const updateService = (index, field, value) => {
    const services = structuredClone(draftState.editorDraft.content.services || []);
    services[index] = { ...(services[index] || {}), [field]: value };
    draftState.update("content.services", services);
  };
  const updateTypography = (field, property, value) => draftState.update(`style.typography.${field}.${property}`, value);
  const toggleSection = (sectionId) => setOpenSections((current) => ({ ...current, [sectionId]: !current[sectionId] }));
  const toggleNewsSourceV2 = (source) => {
    const current = draftState.editorDraft.modules.news?.selectedNewsSources || [];
    const selected = current.includes(source.name) ? current.filter((name) => name !== source.name) : [...current, source.name];
    const first = newsSources.find((item) => item.name === selected[0]);
    draftState.update("modules.news.selectedNewsSources", selected);
    draftState.update("modules.news.newsSource", selected[0] || "");
    if (first?.url) draftState.update("modules.news.newsFeedUrl", first.url);
  };

  if (!entitlement.allowed) return <div className="tpv2-workspace tpv2-locked"><strong>Hero Business · Templates V2</strong><h2>Disponível nos planos Professional e Enterprise</h2><p>Templates V2 não estão disponíveis no seu plano. Uma publicação existente continuará normalmente nas telas.</p></div>;

  return (
    <div className="tpv2-workspace" ref={workspaceRef}>
      {deleteTarget && <PortalModal
        title={deleteBlockedBy.length ? "Este template está sendo usado em uma playlist." : "Excluir template?"}
        message={deleteBlockedBy.length ? "Remova o template das playlists relacionadas antes de excluí-lo." : "Esta ação removerá o template criado. As mídias da sua biblioteca não serão apagadas."}
        details={deleteBlockedBy.map((playlist) => playlist.name || playlist.title || playlist.id)}
        confirmLabel={deleteBlockedBy.length ? "Entendi" : "Excluir template"}
        danger={!deleteBlockedBy.length}
        onConfirm={deleteBlockedBy.length ? undefined : deleteTemplateInstance}
        onClose={() => { setDeleteTarget(null); setDeleteBlockedBy([]); }}
      />}
      <div className="tpv2-workspace-title"><div><span>Templates V2 · Professional / Enterprise</span><h2>{definition?.label || "Biblioteca V2"}</h2><p>Edite o rascunho com preview ao vivo e publique somente quando estiver pronto.</p></div><button type="button" onClick={() => { if (!entitlement.allowed) { setMessage("Templates V2 não estão disponíveis no seu plano."); return; } setSelectedId(""); setMessage(""); }}><Plus /> Novo Template</button></div>
      {!selected && <><div className="tpv2-catalog-filters"><select value={catalogCategory} onChange={(event) => setCatalogCategory(event.target.value)}>{TEMPLATE_V2_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select><select value={catalogOrientation} onChange={(event) => setCatalogOrientation(event.target.value)}><option>Todos</option><option>Paisagem</option><option>Retrato</option></select></div><div className="tpv2-catalog">{catalogItems.map((item) => <button type="button" key={item.type} className={activeType === item.type ? "active" : ""} onClick={() => setNewType(item.type)}><div className={`tpv2-catalog-thumbnail ${item.thumbnail}`}><i/><i/><i/></div><span>{item.category}</span><strong>{item.label}</strong><small>{item.description}</small><em>Paisagem · Retrato · Professional</em></button>)}</div></>}
      <div className="tpv2-template-tabs">{templates.map((item) => <button type="button" key={item.id} className={selectedId === item.id ? "active" : ""} onClick={() => setSelectedId(item.id)}><strong>{getTemplateV2Name(item)}</strong><span>{item.published ? "Publicado" : "Somente rascunho"}</span></button>)}</div>
      <div className="tpv2-editor-grid">
        <main className="tpv2-editor-form">
          <div className={`tpv2-save-state ${draftState.isDirty ? "dirty" : "saved"}`}><span>{draftState.isDirty ? "Alterações não salvas" : "Rascunho sincronizado"}</span><small>{draftState.publishedSnapshot ? "Existe uma publicação ativa" : "Ainda não publicado"}</small></div>
          {activeType === SPORTS_PREMIUM_TYPE ? <Section sectionId="content" icon={<Type />} title="Conteúdo esportivo" open={openSections.content} onToggle={toggleSection}><label>Nome do template<input value={name} onChange={(event) => setName(event.target.value)} /></label><SportsV2EditorFields value={draftState.editorDraft.sports} totalDuration={draftState.editorDraft.display.duration} onChange={(value) => draftState.update("sports", value)} /></Section> : [CLOCK_PRO_TYPE, WEATHER_PREMIUM_TYPE].includes(activeType) ? <Section sectionId="content" icon={<Type />} title={activeType === CLOCK_PRO_TYPE ? "Configuração da hora" : "Dados do clima"} open={openSections.content} onToggle={toggleSection}>
            <label>Nome do template<input value={name} onChange={(event) => setName(event.target.value)} /></label>
            {activeType === CLOCK_PRO_TYPE && <><label className="tpv2-check"><input type="checkbox" checked={draftState.editorDraft.modules.clock.showDate} onChange={(event) => draftState.update("modules.clock.showDate", event.target.checked)} /> Exibir data</label><label className="tpv2-check"><input type="checkbox" checked={draftState.editorDraft.modules.clock.showLocal} onChange={(event) => draftState.update("modules.clock.showLocal", event.target.checked)} /> Exibir local</label></>}
            {activeType === WEATHER_PREMIUM_TYPE && <><label className="tpv2-check"><input type="checkbox" checked={draftState.editorDraft.modules.weather.showCity} onChange={(event) => draftState.update("modules.weather.showCity", event.target.checked)} /> Exibir nome da cidade</label><label className="tpv2-check"><input type="checkbox" checked={draftState.editorDraft.modules.weather.showCurrent} onChange={(event) => draftState.update("modules.weather.showCurrent", event.target.checked)} /> Exibir condição atual</label><label className="tpv2-check"><input type="checkbox" checked={draftState.editorDraft.modules.weather.showFeelsLike} onChange={(event) => draftState.update("modules.weather.showFeelsLike", event.target.checked)} /> Exibir sensação térmica</label><label className="tpv2-check"><input type="checkbox" checked={draftState.editorDraft.modules.weather.showForecast} onChange={(event) => draftState.update("modules.weather.showForecast", event.target.checked)} /> Exibir próximos dias</label>{draftState.editorDraft.modules.weather.showForecast && <label>Quantidade<select value={draftState.editorDraft.modules.weather.forecastDays} onChange={(event) => draftState.update("modules.weather.forecastDays", Number(event.target.value))}><option value="3">3 dias</option><option value="4">4 dias</option><option value="5">5 dias</option></select></label>}</>}
          </Section> : <Section sectionId="content" icon={<Type />} title="Conteúdo" open={openSections.content} onToggle={toggleSection}>
            <label>Nome do template<input value={name} onChange={(event) => setName(event.target.value)} /></label>
            <label>Headline<textarea rows="3" value={draftState.editorDraft.content.headline} onChange={(event) => draftState.update("content.headline", event.target.value)} /></label>
            <label>Subtítulo<textarea rows="3" value={draftState.editorDraft.content.subtitle} onChange={(event) => draftState.update("content.subtitle", event.target.value)} /></label>
            <label className="tpv2-check"><input type="checkbox" checked={draftState.editorDraft.content.cta.enabled} onChange={(event) => draftState.update("content.cta.enabled", event.target.checked)} /> Exibir chamada</label>
            {draftState.editorDraft.content.cta.enabled && <label>Texto da chamada<input value={draftState.editorDraft.content.cta.label} onChange={(event) => draftState.update("content.cta.label", event.target.value)} /></label>}
            <div className="tpv2-service-editor">{draftState.editorDraft.content.services.map((service, index) => <div key={service.id || index}><input value={service.title} onChange={(event) => updateService(index, "title", event.target.value)} placeholder="Serviço" /><input value={service.description} onChange={(event) => updateService(index, "description", event.target.value)} placeholder="Descrição" /></div>)}</div>
            <div className="tpv2-typography-grid">
              <TypographyControl label="Headline" value={draftState.editorDraft.style.typography.headline} sizeLimits={[44,112]} lineLimits={[0.82,1.35]} onChange={(property, value) => updateTypography("headline", property, value)} />
              <TypographyControl label="Subtítulo" value={draftState.editorDraft.style.typography.subtitle} sizeLimits={[16,42]} onChange={(property, value) => updateTypography("subtitle", property, value)} />
              <TypographyControl label="CTA" value={draftState.editorDraft.style.typography.cta} sizeLimits={[12,28]} onChange={(property, value) => updateTypography("cta", property, value)} />
              <TypographyControl label="Serviços" value={draftState.editorDraft.style.typography.service} sizeLimits={[12,30]} onChange={(property, value) => updateTypography("service", property, value)} />
            </div>
          </Section>}
          <Section sectionId="media" icon={<Image />} title="Mídia" open={openSections.media} onToggle={toggleSection}>
            <TemplateV2MediaField label="Logo" value={draftState.editorDraft.content.logo} mediaList={mediaList.filter((item) => !String(item.type || item.contentType).toLowerCase().includes("video"))} onChange={(value) => draftState.update("content.logo", value)} onUpload={(file, event) => uploadMedia(file, event, "content.logo")} uploading={uploading} accept="image/*" />
            <TemplateV2MediaField label="Mídia principal" value={draftState.editorDraft.media.primary} mediaList={mediaList} onChange={(value) => draftState.update("media.primary", value)} onUpload={(file, event) => uploadMedia(file, event, "media.primary")} uploading={uploading} imagesOnly accept="image/*" />
            {sportsDraft && !["motorsport","combat"].includes(sportsDraft.selectedSport) && <><TemplateV2MediaField label="Escudo / logo mandante" value={sportsDraft.items[sportsDraft.selectedSport].homeLogo} mediaList={mediaList} onChange={(value) => draftState.update(`sports.items.${sportsDraft.selectedSport}.homeLogo`, value)} onUpload={(file,event)=>uploadMedia(file,event,`sports.items.${sportsDraft.selectedSport}.homeLogo`)} uploading={uploading} imagesOnly accept="image/*"/><TemplateV2MediaField label="Escudo / logo visitante" value={sportsDraft.items[sportsDraft.selectedSport].awayLogo} mediaList={mediaList} onChange={(value) => draftState.update(`sports.items.${sportsDraft.selectedSport}.awayLogo`, value)} onUpload={(file,event)=>uploadMedia(file,event,`sports.items.${sportsDraft.selectedSport}.awayLogo`)} uploading={uploading} imagesOnly accept="image/*"/></>}
            {sportsDraft?.selectedSport === "combat" && <><TemplateV2MediaField label="Imagem do atleta A" value={sportsDraft.items.combat.fighterAImage} mediaList={mediaList} onChange={(value)=>draftState.update("sports.items.combat.fighterAImage",value)} onUpload={(file,event)=>uploadMedia(file,event,"sports.items.combat.fighterAImage")} uploading={uploading} imagesOnly accept="image/*"/><TemplateV2MediaField label="Imagem do atleta B" value={sportsDraft.items.combat.fighterBImage} mediaList={mediaList} onChange={(value)=>draftState.update("sports.items.combat.fighterBImage",value)} onUpload={(file,event)=>uploadMedia(file,event,"sports.items.combat.fighterBImage")} uploading={uploading} imagesOnly accept="image/*"/></>}
            <div className="tpv2-inline-fields"><label>Ajuste<select value={draftState.editorDraft.style.mediaFit} onChange={(event) => draftState.update("style.mediaFit", event.target.value)}><option value="cover">Preencher</option><option value="contain">Ajustar</option></select></label><label>Posição<select value={draftState.editorDraft.style.mediaPosition} onChange={(event) => draftState.update("style.mediaPosition", event.target.value)}><option value="center">Centro</option><option value="top">Topo</option><option value="bottom">Base</option><option value="left">Esquerda</option><option value="right">Direita</option></select></label></div>
          </Section>
          <Section sectionId="appearance" icon={<Palette />} title="Aparência" open={openSections.appearance} onToggle={toggleSection}>
            <div className="tpv2-color-grid">{[["Principal","primaryColor"],["Secundária","secondaryColor"],["Fundo","backgroundColor"],["Texto","textColor"]].map(([label,key]) => <label key={key}>{label}<input type="color" value={draftState.editorDraft.style[key]} onChange={(event) => draftState.update(`style.${key}`, event.target.value)} /></label>)}</div>
            <label>Overlay da imagem <input type="range" min="0" max="90" value={draftState.editorDraft.style.overlayOpacity} onChange={(event) => draftState.update("style.overlayOpacity", Number(event.target.value))} /></label>
            <label>Nível de transparência <input type="range" min="0" max="100" value={draftState.editorDraft.style.panelTransparency} onChange={(event) => draftState.update("style.panelTransparency", Number(event.target.value))} /><span>{draftState.editorDraft.style.panelTransparency}%</span></label>
            <label>Uso da mídia principal<select value={draftState.editorDraft.style.mediaLayout} onChange={(event) => draftState.update("style.mediaLayout", event.target.value)}><option value="split">Painel dividido</option><option value="full">Fundo completo</option></select></label>
          </Section>
          <Section sectionId="dynamicData" icon={<CloudSun />} title="Dados dinâmicos" open={openSections.dynamicData} onToggle={toggleSection}>
            {definition?.modules.includes("clock") && activeType !== CLOCK_PRO_TYPE && <label className="tpv2-check"><input type="checkbox" checked={draftState.editorDraft.modules.clock.enabled} onChange={(event) => draftState.update("modules.clock.enabled", event.target.checked)} /> Exibir relógio</label>}
            {definition?.modules.includes("weather") && <>{activeType !== WEATHER_PREMIUM_TYPE && <label className="tpv2-check"><input type="checkbox" checked={draftState.editorDraft.modules.weather.enabled} onChange={(event) => draftState.update("modules.weather.enabled", event.target.checked)} /> Exibir clima</label>}{(activeType === WEATHER_PREMIUM_TYPE || draftState.editorDraft.modules.weather.enabled) && <label>Cidade/local<select value={weatherCities.includes(draftState.editorDraft.modules.weather.city) ? draftState.editorDraft.modules.weather.city : "custom"} onChange={(event) => event.target.value !== "custom" && draftState.update("modules.weather.city", event.target.value)}>{weatherCities.map((city) => <option key={city}>{city}</option>)}<option value="custom">Outra cidade</option></select><input value={draftState.editorDraft.modules.weather.city} placeholder="Ex: João Câmara/RN" onChange={(event) => draftState.update("modules.weather.city", event.target.value)} /></label>}</>}
            {definition?.modules.includes("news") && <><label className="tpv2-check"><input type="checkbox" checked={Boolean(draftState.editorDraft.modules.news?.enabled)} onChange={(event) => draftState.update("modules.news.enabled", event.target.checked)} /> Exibir notícias/RSS</label>{draftState.editorDraft.modules.news?.enabled && <><div className="tpv2-news-source-list"><strong>Fontes de notícias</strong>{newsSources.map((source) => <label className="tpv2-check" key={`${source.name}-${source.url}`}><input type="checkbox" checked={(draftState.editorDraft.modules.news.selectedNewsSources || []).includes(source.name)} onChange={() => toggleNewsSourceV2(source)} /> {source.name}</label>)}</div><label>URL RSS personalizada<input value={draftState.editorDraft.modules.news.newsFeedUrl || ""} onChange={(event) => draftState.update("modules.news.newsFeedUrl", event.target.value)} /></label></>}</>}
            {definition?.newsTicker && draftState.editorDraft.modules.news?.enabled && <div className="tpv2-ticker-settings"><strong>Faixa de notícias</strong><div className="tpv2-inline-fields"><label>Velocidade<select value={draftState.editorDraft.modules.news.tickerSpeed} onChange={(event) => draftState.update("modules.news.tickerSpeed", event.target.value)}><option value="slow">Lenta</option><option value="normal">Normal</option><option value="fast">Rápida</option></select></label><label>Tamanho<select value={draftState.editorDraft.modules.news.tickerSize} onChange={(event) => draftState.update("modules.news.tickerSize", event.target.value)}><option value="compact">Compacta</option><option value="normal">Normal</option><option value="large">Grande</option></select></label></div><label>Identificação<input value={draftState.editorDraft.modules.news.tickerLabel} onChange={(event) => draftState.update("modules.news.tickerLabel", event.target.value)} /></label><div className="tpv2-color-grid"><label>Cor da faixa<input type="color" value={draftState.editorDraft.modules.news.tickerBackground} onChange={(event) => draftState.update("modules.news.tickerBackground", event.target.value)} /></label><label>Cor do texto<input type="color" value={draftState.editorDraft.modules.news.tickerTextColor} onChange={(event) => draftState.update("modules.news.tickerTextColor", event.target.value)} /></label></div><label>Transparência da faixa <input type="range" min="0" max="80" value={draftState.editorDraft.modules.news.tickerTransparency} onChange={(event) => draftState.update("modules.news.tickerTransparency", Number(event.target.value))} /><span>{draftState.editorDraft.modules.news.tickerTransparency}%</span></label></div>}
            {definition?.modules.includes("qrCode") && <><label className="tpv2-check"><input type="checkbox" checked={draftState.editorDraft.modules.qrCode.enabled} onChange={(event) => draftState.update("modules.qrCode.enabled", event.target.checked)} /> Exibir QR Code</label>{draftState.editorDraft.modules.qrCode.enabled && <QRCodeConfigurator value={draftState.editorDraft.modules.qrCode} showDisplayControls onChange={(value) => draftState.update("modules.qrCode", value)} />}</>}
          </Section>
          <Section sectionId="display" icon={<Save />} title="Exibição" open={openSections.display} onToggle={toggleSection}>
            <div className="tpv2-inline-fields"><label>Orientação publicada<select value={draftState.editorDraft.display.defaultOrientation} onChange={(event) => draftState.update("display.defaultOrientation", event.target.value)}><option>Paisagem</option><option>Retrato</option></select></label><label>Duração<input type="number" min="5" value={draftState.editorDraft.display.duration} onChange={(event) => draftState.update("display.duration", Number(event.target.value))} /></label></div>
            <label>Posição do conteúdo<select value={draftState.editorDraft.layout.contentPosition} onChange={(event) => draftState.update("layout.contentPosition", event.target.value)}><option value="left">Esquerda</option><option value="right">Direita</option></select></label>
          </Section>
          {message && <div className="tpv2-message-bar">{message}</div>}
          <div className="tpv2-editor-actions"><button type="button" onClick={draftState.discard} disabled={!draftState.isDirty || saving}><RotateCcw /> Descartar</button><button type="button" onClick={saveDraft} disabled={saving}><Save /> Salvar alterações</button><button type="button" className="publish" onClick={publish} disabled={!selected || draftState.isDirty || saving}><Send /> {selected?.published ? "Atualizar publicação" : "Publicar"}</button></div>
        </main>
        <TemplateV2PreviewPanel template={previewTemplate} config={draftState.editorDraft} orientation={orientation} onOrientationChange={setOrientation} scale={scale} onScaleChange={setScale} onOpen={() => setPreviewOpen(true)} dynamicData={previewDynamicData} />
      </div>
      {previewOpen && <PopupPreview template={previewTemplate} config={draftState.editorDraft} orientation={orientation} onClose={() => setPreviewOpen(false)} dynamicData={previewDynamicData} />}
      {templates.length > 0 && <div className="tpv2-published-strip"><h3>Meus Templates V2</h3>{templates.map((item) => { const view = getPublishedTemplateV2View(item); const draft = getTemplateV2DraftConfig(item); const hasChanges = Boolean(view && isTemplateV2Dirty(draft,view.published)); const preview = hasChanges ? draft : view?.published || draft; const previewOrientation = preview.display?.defaultOrientation || "Paisagem"; return <article role="button" tabIndex="0" className={previewOrientation === "Retrato" ? "portrait" : "landscape"} key={item.id} onClick={() => openTemplate(item)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") openTemplate(item); }}><TemplateV2DynamicStage className="tpv2-created-thumbnail" template={item} config={preview} orientation={previewOrientation} mode="thumbnail" loadWeather={loadWeather} loadNews={loadNews}/><div className="tpv2-created-meta"><strong>{getTemplateV2Name(item)}</strong><span>{item.identity?.templateType || item.templateType} · {previewOrientation}</span><em className={view ? "published" : "draft"}>{hasChanges ? "Alterações não publicadas" : view ? "Publicado" : "Rascunho"}</em></div><div className="tpv2-created-actions"><button type="button" onClick={(event) => { event.stopPropagation(); openTemplate(item); }}>Editar</button>{view && !hasChanges ? <button type="button" className="primary" onClick={(event) => { event.stopPropagation(); onUseInPlaylist?.(); }}>Usar em playlist</button> : <button type="button" className="primary" disabled={saving} onClick={(event) => { event.stopPropagation(); publishFromCard(item); }}>{view ? "Atualizar publicação" : "Publicar"}</button>}<button type="button" className="danger" onClick={(event) => { event.stopPropagation(); requestDelete(item); }}>Excluir</button></div></article>; })}</div>}
    </div>
  );
}
