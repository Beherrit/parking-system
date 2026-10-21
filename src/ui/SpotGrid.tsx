import type { Size, SpotStatus } from "@/domain/types";
import { card, heading } from "./styles";

function SpotCell({ spot }: { spot: SpotStatus }) {
  const taken = spot.ticket !== null;
  const tone = taken
    ? "border-solid border-slate-800 bg-slate-800 text-white"
    : "border-dashed border-slate-500 bg-white text-slate-900";
  const border = spot.size === "large" ? "border-4 py-4" : "border-2 py-2";
  return (
    <li
      data-testid={`spot-${spot.number}`}
      data-state={taken ? "taken" : "free"}
      data-size={spot.size}
      aria-label={`Spot ${spot.number}, ${spot.size}, ${taken ? `taken by ${spot.ticket?.plate}` : "free"}`}
      className={`flex flex-col items-center rounded-lg px-1 text-center ${tone} ${border}`}
    >
      <span className="text-lg font-bold">{spot.number}</span>
      <span className="text-xs uppercase tracking-wide">{spot.size}</span>
      {taken ? (
        <span data-testid={`spot-${spot.number}-plate`} className="mt-1 font-mono text-sm font-semibold tracking-wider">
          {spot.ticket?.plate}
        </span>
      ) : (
        <span data-testid={`spot-${spot.number}-label`} className="mt-1 text-sm font-semibold">
          Free
        </span>
      )}
    </li>
  );
}

function Section({ size, spots }: { size: Size; spots: SpotStatus[] }) {
  const columns = size === "small" ? "grid-cols-3 min-[480px]:grid-cols-5" : "grid-cols-2 min-[480px]:grid-cols-5";
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-700">
        {size === "small" ? "Small spots" : "Large spots"}
      </h3>
      <ul className={`grid gap-2 ${columns}`} data-testid={`spot-list-${size}`}>
        {spots.map((spot) => (
          <SpotCell key={spot.id} spot={spot} />
        ))}
      </ul>
    </div>
  );
}

export function SpotGrid({ spots }: { spots: SpotStatus[] }) {
  const bySize = (size: Size) => spots.filter((s) => s.size === size);
  const free = (size: Size) => bySize(size).filter((s) => s.ticket === null).length;

  return (
    <section data-testid="spot-grid" className={card} aria-labelledby="spots-heading">
      <h2 id="spots-heading" className={heading}>
        Spots
      </h2>
      <p aria-live="polite" className="mt-1 text-base text-slate-800">
        Free small: <strong data-testid="free-small-count">{free("small")}</strong>
        <span aria-hidden="true"> | </span>
        <span className="ml-3 sm:ml-0">
          Free large: <strong data-testid="free-large-count">{free("large")}</strong>
        </span>
      </p>
      <div className="mt-4 space-y-5">
        <Section size="small" spots={bySize("small")} />
        <Section size="large" spots={bySize("large")} />
      </div>
    </section>
  );
}
