import CollectionEditorFields from "../dynamic-collections/CollectionEditorFields";
import { normalizePromotionCampaignConfig } from "./config.js";
export default function PromotionCampaignEditorFields({value,onChange}) { return <CollectionEditorFields value={normalizePromotionCampaignConfig(value)} onChange={onChange} kind="campanha"/>; }
