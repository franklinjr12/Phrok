import type { MapDefinition, RegionDefinition } from "../types/dataDefinitions";

const demoRegionIds = new Set(["crownfield", "mossvale"]);

export function isDemoModeEnabled(env: ImportMetaEnv = import.meta.env): boolean {
  return env.VITE_DEMO_MODE === "true";
}

export function isDemoBlockedRegion(regionId: string, env: ImportMetaEnv = import.meta.env): boolean {
  return isDemoModeEnabled(env) && !demoRegionIds.has(regionId);
}

export function isDemoBlockedMap(map: MapDefinition, getRegion: (id: string) => RegionDefinition, env: ImportMetaEnv = import.meta.env): boolean {
  return isDemoBlockedRegion(getRegion(map.regionId).id, env);
}

export function getDemoBlockedMessage(destinationName: string): string {
  return `${destinationName} lies beyond this demo.`;
}
