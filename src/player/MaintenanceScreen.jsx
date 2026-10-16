import logo from "../assets/logo.png";
import "./maintenance-screen.css";

export default function MaintenanceScreen({ orientation = "landscape" }) {
  return (
    <section className={`player-screen maintenance-screen maintenance-screen--${orientation}`}>
      <div className="maintenance-screen__glow maintenance-screen__glow--left" />
      <div className="maintenance-screen__glow maintenance-screen__glow--right" />
      <main className="maintenance-screen__content">
        <img className="maintenance-screen__logo" src={logo} alt="Totem Park" />
        <div className="maintenance-screen__gear" aria-hidden="true"><i /></div>
        <h1>MODO DE <span>MANUTENÇÃO</span></h1>
        <p>Estamos aplicando ajustes e preparando sua experiência.</p>
        <div className="maintenance-screen__progress" aria-label="Manutenção em andamento"><i /></div>
        <footer><i />Desenvolvido por Park Solutions<i /></footer>
      </main>
    </section>
  );
}
