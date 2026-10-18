import CollectionRenderer from "../dynamic-collections/CollectionRenderer";
import { selectActiveDynamicItems } from "../dynamic-collections/config.js";
import { normalizeSmartLobbyConfig } from "./config.js";
export default function SmartLobbyRenderer(props) { const collection=normalizeSmartLobbyConfig(props.config.smartLobby); return <CollectionRenderer {...props} collection={collection} items={selectActiveDynamicItems(collection.items)} label="SMART LOBBY" variantClass="smart-lobby"/>; }
