import maintenanceArtwork from "../assets/player-v59/maintenance-reference.png";
import "./maintenance-screen.css";

export default function MaintenanceScreen({ orientation = "landscape" }) {
  return (
    <section className={`player-screen maintenance-screen maintenance-screen--${orientation}`}>
      <img className="maintenance-screen__artwork" src={maintenanceArtwork} alt="Totem Park — Modo de Manutenção" />
      <span className="maintenance-screen__ring-cleanup" aria-hidden="true" />
      <span className="maintenance-screen__motion-stage" aria-hidden="true">
        <i className="maintenance-screen__ring"><img src={maintenanceArtwork} alt="" /></i>
        <i className="maintenance-screen__gear"><img src={maintenanceArtwork} alt="" /></i>
      </span>
      <span className="maintenance-screen__progress-cleanup" aria-hidden="true" />
      <span className="maintenance-screen__progress-track" aria-hidden="true">
        <i className="maintenance-screen__progress-fill" />
      </span>
      <span className="maintenance-screen__accessible-copy">MODO DE MANUTENÇÃO. Estamos aplicando ajustes e preparando sua experiência. Desenvolvido por Park Solutions.</span>
    </section>
  );
}
