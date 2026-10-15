import CollectionRenderer from "../dynamic-collections/CollectionRenderer";
import { normalizeAgendaInfoConfig, selectAgendaEvents } from "./config.js";
export default function AgendaInfoRenderer(props) { const collection=normalizeAgendaInfoConfig(props.config.agenda); return <CollectionRenderer {...props} collection={collection} items={selectAgendaEvents(collection.items)} label="AGENDA"/>; }
