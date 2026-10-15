import CollectionEditorFields from "../dynamic-collections/CollectionEditorFields";
import { normalizeSmartLobbyConfig } from "./config.js";
export default function SmartLobbyEditorFields({ value,onChange }) { return <CollectionEditorFields value={normalizeSmartLobbyConfig(value)} onChange={onChange} kind="card"/>; }
