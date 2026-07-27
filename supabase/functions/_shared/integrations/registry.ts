import type { IntegrationProvider } from "./interface.ts";
import { HiggsFieldProvider } from "./higgsfield.ts";
import { PerspectiveManualProvider } from "./perspective.ts";
import { HeyReachProvider } from "./heyreach.ts";

const providers: Record<string, () => IntegrationProvider> = {
  higgsfield: () => new HiggsFieldProvider(),
  perspective: () => new PerspectiveManualProvider(),
  heyreach: () => new HeyReachProvider(),
};

export function getProvider(name: string): IntegrationProvider {
  const factory = providers[name];
  if (!factory) throw new Error(`Unknown provider: ${name}. Available: ${Object.keys(providers).join(", ")}`);
  return factory();
}

export function listProviders(): string[] {
  return Object.keys(providers);
}
