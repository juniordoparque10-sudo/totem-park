import { buildQRCodeValue, getQRCodeValidationError, normalizeQRCodeConfig, QR_CODE_TYPES } from "./qr-code";

const COUNTRIES = [
  ["55", "Brasil (+55)"],
  ["1", "EUA/Canadá (+1)"],
  ["351", "Portugal (+351)"],
  ["34", "Espanha (+34)"],
  ["54", "Argentina (+54)"],
  ["56", "Chile (+56)"],
  ["598", "Uruguai (+598)"],
];

export default function QRCodeConfigurator({ value, onChange, showDisplayControls = false }) {
  const config = normalizeQRCodeConfig(value);
  const update = (patch) => {
    const next = { ...config, ...patch };
    onChange({ ...next, value: buildQRCodeValue(next) }, Object.keys(patch)[0]);
  };
  const error = getQRCodeValidationError(config);

  return <div className="qr-code-configurator">
    <label>Tipo do QR Code<select value={config.type} onChange={(event) => update({ type: event.target.value })}><option value={QR_CODE_TYPES.LINK}>Link</option><option value={QR_CODE_TYPES.WHATSAPP}>WhatsApp</option><option value={QR_CODE_TYPES.TEXT}>Texto</option></select></label>
    {config.type === QR_CODE_TYPES.WHATSAPP && <>
      <div className="qr-code-inline-fields"><label>País / código<select value={config.countryCode} onChange={(event) => update({ countryCode: event.target.value })}>{COUNTRIES.map(([code,label]) => <option key={code} value={code}>{label}</option>)}</select></label><label>Número do WhatsApp<input value={config.phone} placeholder="84 99134-6016" inputMode="tel" onChange={(event) => update({ phone: event.target.value })}/></label></div>
      <label>Mensagem inicial<textarea rows="3" value={config.message} placeholder="Olá! Gostaria de mais informações." onChange={(event) => update({ message: event.target.value })}/></label>
    </>}
    {config.type === QR_CODE_TYPES.LINK && <label>URL<input value={config.link} inputMode="url" placeholder="https://..." onChange={(event) => update({ link: event.target.value })}/></label>}
    {config.type === QR_CODE_TYPES.TEXT && <label>Conteúdo<textarea rows="3" value={config.text} placeholder="Texto livre" onChange={(event) => update({ text: event.target.value })}/></label>}
    {showDisplayControls && <><div className="qr-code-inline-fields"><label>Posição<select value={config.position} onChange={(event) => update({ position: event.target.value })}><option value="top-left">Superior esquerdo</option><option value="top-right">Superior direito</option><option value="bottom-left">Inferior esquerdo</option><option value="bottom-right">Inferior direito</option><option value="center">Centro</option></select></label><label>Tamanho<select value={config.size} onChange={(event) => update({ size: event.target.value })}><option value="small">Pequeno</option><option value="medium">Médio</option><option value="large">Grande</option></select></label></div><label>Margem / afastamento <input type="range" min="16" max="96" value={config.margin} onChange={(event) => update({ margin: Number(event.target.value) })}/><span>{config.margin}px</span></label></>}
    {error && <small className="qr-code-configurator-warning">{error}</small>}
  </div>;
}
