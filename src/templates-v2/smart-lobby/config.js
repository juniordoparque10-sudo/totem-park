import { normalizeDynamicCollection } from "../dynamic-collections/config.js";

export function normalizeSmartLobbyConfig(value = {}) {
  return normalizeDynamicCollection({ layout:"A",secondarySlots:3,rotation:{featuredSeconds:8,secondarySeconds:5,transition:"fade"},...value });
}
