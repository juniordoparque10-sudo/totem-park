import "./template-logo.css";

export default function TemplateLogo({
  src,
  alt = "",
  className = "",
  maxWidth = "100%",
  maxHeight = "100%",
  name = "",
  showLogo = true,
  showName = true,
  fallback = null,
}) {
  const logo = src
    ? <img className="tpv2-template-logo__image" src={src} alt={alt} />
    : fallback;
  if ((!showLogo || !logo) && (!showName || !name)) return null;
  return (
    <span className="tpv2-template-brand">
      {showLogo && logo && <span className={`tpv2-template-logo ${className}`.trim()} style={{ "--tpv2-logo-max-width": maxWidth, "--tpv2-logo-max-height": maxHeight }}>
        {logo}
      </span>}
      {showName && name && <strong className="tpv2-template-name">{name}</strong>}
    </span>
  );
}
