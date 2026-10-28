import CollectionRenderer from "../dynamic-collections/CollectionRenderer";
import { selectActiveDynamicItems } from "../dynamic-collections/config.js";
import { getSmartLobbyOverlayAlpha, getSmartLobbyPanelAlpha, normalizeSmartLobbyConfig } from "./config.js";
export default function SmartLobbyRenderer(props) { const collection=normalizeSmartLobbyConfig(props.config.smartLobby); return <CollectionRenderer {...props} collection={collection} items={selectActiveDynamicItems(collection.items)} label="SMART LOBBY" variantClass="smart-lobby" overlayAlpha={getSmartLobbyOverlayAlpha(props.config)} panelAlpha={getSmartLobbyPanelAlpha(props.config)}/>; }
