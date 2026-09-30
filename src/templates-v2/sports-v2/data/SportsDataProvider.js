export class SportsDataProvider {
  getSnapshot() { throw new Error("SportsDataProvider.getSnapshot must be implemented"); }
}

export class ManualSportsProvider extends SportsDataProvider {
  constructor(config) { super(); this.config = config; }
  getSnapshot() { return this.config.items || {}; }
}

export function resolveSportsDataProvider(config) {
  return new ManualSportsProvider(config);
}
