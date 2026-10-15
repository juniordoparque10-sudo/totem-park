import CollectionRenderer from "../dynamic-collections/CollectionRenderer";
import { selectActiveDynamicItems } from "../dynamic-collections/config.js";
import { normalizePromotionCampaignConfig } from "./config.js";
export default function PromotionCampaignRenderer(props){const collection=normalizePromotionCampaignConfig(props.config.campaign);return <CollectionRenderer {...props} collection={collection} items={selectActiveDynamicItems(collection.items)} label="CAMPANHA"/>;}
