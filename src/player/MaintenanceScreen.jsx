import maintenanceArtwork from "../assets/player-v59/maintenance-reference.png";
import "./maintenance-screen.css";

export default function MaintenanceScreen({ orientation = "landscape" }) {
  return (
    <section className={`player-screen maintenance-screen maintenance-screen--${orientation}`}>
      <img className="maintenance-screen__artwork" src={maintenanceArtwork} alt="Totem Park — Modo de Manutenção" />
      <i className="maintenance-screen__gear-glow" aria-hidden="true" />
      <i className="maintenance-screen__progress-glow" aria-hidden="true" />
      <span className="maintenance-screen__accessible-copy">MODO DE MANUTENÇÃO. Estamos aplicando ajustes e preparando sua experiência. Desenvolvido por Park Solutions.</span>
    </section>
  );
}
