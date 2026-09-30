import { getFunctions, httpsCallable } from "firebase/functions";
import app from "../../../firebase";

export class SportsDataProvider {
  getSports(){throw new Error("SportsDataProvider.getSports must be implemented");}
  getCompetitions(){throw new Error("SportsDataProvider.getCompetitions must be implemented");}
  getCoverage(){throw new Error("SportsDataProvider.getCoverage must be implemented");}
  getSnapshot(){throw new Error("SportsDataProvider.getSnapshot must be implemented");}
}
export class TheSportsDbAdapter extends SportsDataProvider {
  constructor(config,options={}){super();this.config=config;this.diagnostic=options.diagnostic;this.call=httpsCallable(getFunctions(app),"getSportsV2Snapshot");}
  getSports(){return this.config.selectedSports;}
  getCompetitions(sport){return sport==="football"?[this.config.items.football.competitionId]:["daily"];}
  getCoverage(sport){return this.config.coverage?.[sport]||null;}
  async getSnapshot(sport){const item=this.config.items[sport]||{};this.diagnostic?.("PROVIDER_CALLED",{provider:"thesportsdb",sport,competitionId:item.competitionId,modules:item.modules});try{const response=await this.call({sport,competitionId:item.competitionId});const snapshot=response.data||{};this.diagnostic?.("SNAPSHOT_RECEIVED",{provider:snapshot.provider||"thesportsdb",sport,competition:snapshot.competition?.id||item.competitionId,updatedAt:snapshot.cache?.updatedAt||"",isStale:Boolean(snapshot.cache?.isStale),results:Number(snapshot.data?.results?.length||0),upcoming:Number(snapshot.data?.upcoming?.length||0),standings:Number(snapshot.data?.standings?.length||0),events:Number(snapshot.data?.events?.length||0)});return snapshot;}catch(error){this.diagnostic?.("PROVIDER_ERROR",{provider:"thesportsdb",sport,competitionId:item.competitionId,code:error?.code||"",message:error?.message||""});throw error;}}
}
export function resolveSportsDataProvider(config,options){return new TheSportsDbAdapter(config,options);}
