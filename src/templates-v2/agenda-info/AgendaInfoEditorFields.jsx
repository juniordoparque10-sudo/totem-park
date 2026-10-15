import CollectionEditorFields from "../dynamic-collections/CollectionEditorFields";
import { normalizeAgendaInfoConfig } from "./config.js";
export default function AgendaInfoEditorFields({ value,onChange }) { return <CollectionEditorFields value={normalizeAgendaInfoConfig(value)} onChange={onChange} kind="evento"/>; }
