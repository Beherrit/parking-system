import type { Size, Spot } from "./types";

function splitNumber(spotNumber: string): [string, number] {
  const match = /^(\D*)(\d*)/.exec(spotNumber);
  return [match?.[1] ?? "", Number(match?.[2] || 0)];
}

// Natural order: compare the letter prefix, then the number, so S2 < S10.
export function compareSpotNumbers(a: string, b: string): number {
  const [prefixA, numA] = splitNumber(a);
  const [prefixB, numB] = splitNumber(b);
  if (prefixA !== prefixB) return prefixA < prefixB ? -1 : 1;
  return numA - numB;
}

function lowestOfSize(spots: Spot[], size: Size): Spot | null {
  let best: Spot | null = null;
  for (const spot of spots) {
    if (spot.size === size && (!best || compareSpotNumbers(spot.number, best.number) < 0)) {
      best = spot;
    }
  }
  return best;
}

export function chooseSpot(freeSpots: Spot[], carSize: Size): Spot | null {
  if (carSize === "large") return lowestOfSize(freeSpots, "large");
  return lowestOfSize(freeSpots, "small") ?? lowestOfSize(freeSpots, "large");
}
