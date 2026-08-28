export interface ProviderPlayerRating {
  externalId: string;
  name: string;
  position: string;
  overall: number;
  potential?: number;
}

export interface AssignedRating extends ProviderPlayerRating {
  teamId: string;
  playerId?: string;
}

export interface RatingsProvider {
  readonly name: string;
  fetchRatings(): Promise<readonly ProviderPlayerRating[]>;
}

export interface RatingsSyncAdapter {
  sync(provider: RatingsProvider, existing: readonly AssignedRating[]): Promise<AssignedRating[]>;
}

export class PreserveAssignmentsAdapter implements RatingsSyncAdapter {
  async sync(provider: RatingsProvider, existing: readonly AssignedRating[]): Promise<AssignedRating[]> {
    const incoming = await provider.fetchRatings();
    const assignedByExternalId = new Map(existing.map((player) => [player.externalId, player]));
    return incoming.map((rating) => {
      const previous = assignedByExternalId.get(rating.externalId);
      return { ...rating, teamId: previous?.teamId ?? "unassigned", playerId: previous?.playerId };
    });
  }
}
