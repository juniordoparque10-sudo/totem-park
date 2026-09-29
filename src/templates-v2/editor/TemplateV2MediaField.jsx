import { Image, Upload, Video, X } from "lucide-react";
import { mediaDocumentToTemplateAsset } from "./media-utils";

export default function TemplateV2MediaField({ label, value, mediaList, onChange, onUpload, uploading, accept = "image/*,video/*" }) {
  return (
    <div className="tpv2-media-field">
      <div className="tpv2-field-heading"><strong>{label}</strong><span>Biblioteca oficial de mídias</span></div>
      {value?.url ? (
        <div className="tpv2-selected-media">
          {value.type === "video" ? <video src={value.url} muted /> : <img src={value.url} alt="" />}
          <div><strong>{value.title || "Mídia selecionada"}</strong><span>{value.type === "video" ? "Vídeo" : "Imagem"}</span></div>
          <button type="button" onClick={() => onChange(null)} title="Desvincular mídia"><X /></button>
        </div>
      ) : <div className="tpv2-media-empty"><Image /><span>Nenhuma mídia vinculada</span></div>}

      <div className="tpv2-media-library">
        {mediaList.map((media) => {
          const asset = mediaDocumentToTemplateAsset(media);
          return (
            <button type="button" key={media.id} className={value?.mediaId === media.id ? "active" : ""} onClick={() => onChange(asset)}>
              {asset.type === "video" ? <Video /> : <Image />}
              <span>{asset.title}</span>
            </button>
          );
        })}
      </div>

      <label className="tpv2-upload-button">
        <Upload /> {uploading ? "Enviando..." : "Enviar nova mídia"}
        <input type="file" accept={accept} disabled={uploading} onChange={(event) => onUpload(event.target.files?.[0], event)} />
      </label>
    </div>
  );
}
