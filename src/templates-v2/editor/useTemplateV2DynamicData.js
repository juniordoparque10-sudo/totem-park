import { useEffect, useState } from "react";
import { getTemplateV2DynamicDataKey, hasTemplateV2DynamicModules } from "../dynamic-data";
import { loadTemplateV2DynamicData } from "./template-v2-dynamic-loader";

export default function useTemplateV2DynamicData(config, { loadWeather, loadNews } = {}) {
  const key = getTemplateV2DynamicDataKey(config);
  const [state, setState] = useState(() => hasTemplateV2DynamicModules(config) ? { loading:true } : null);

  /* Loading state begins at the external weather/news request boundary. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!hasTemplateV2DynamicModules(config)) { setState(null); return undefined; }
    let cancelled = false;
    setState((current) => ({ ...current, loading:true }));
    loadTemplateV2DynamicData(config, { loadWeather, loadNews })
      .then((data) => { if (!cancelled) setState(data); })
      .catch(() => { if (!cancelled) setState({ weather:null, news:[], error:true }); });
    return () => { cancelled = true; };
  // `key` fingerprints every dynamic field; object identity alone must not reload the feeds.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, loadNews, loadWeather]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return state;
}
