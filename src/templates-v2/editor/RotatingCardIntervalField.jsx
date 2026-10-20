export default function RotatingCardIntervalField({ label, value, onChange }) {
  return <div className="tpv2-rotation-interval-field">
    <label>{label}<span><input type="number" min="5" max="60" value={value} onChange={(event) => onChange(Number(event.target.value))}/> segundos</span></label>
    <small>Controla somente a troca interna dos cards; não altera a duração total da template na playlist.</small>
  </div>;
}
