import loadingArtwork from "../assets/player-v59/loading-reference.png";
import "./player-startup-splash.css";

export default function PlayerStartupSplash({ overlay = false }) {
  return (
    <section className={`player-startup-splash${overlay ? " is-overlay" : ""}`} aria-label="Carregando Player">
      <img className="player-startup-splash__artwork" src={loadingArtwork} alt="Totem Park — Carregando Player" />
      <i className="player-startup-splash__progress-glow" aria-hidden="true" />
    </section>
  );
}
