import type { ProviderPlayerRating, RatingsProvider } from "./provider";

export class MockRatingsProvider implements RatingsProvider {
  readonly name = "mock";

  async fetchRatings(): Promise<readonly ProviderPlayerRating[]> {
    return [
      { externalId: "demo-1", name: "Alex Morgan", position: "FWD", overall: 84, potential: 86 },
      { externalId: "demo-2", name: "Jordan Lee", position: "MID", overall: 79, potential: 83 }
    ];
  }
}
