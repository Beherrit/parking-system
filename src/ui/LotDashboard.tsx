"use client";
// Owns the lot data and refreshes it after every park and return.
import { useCallback, useEffect, useState } from "react";
import type { SpotStatus, Ticket } from "@/domain/types";
import { ActiveTickets } from "./ActiveTickets";
import { describeError, fetchActiveTickets, fetchSpots } from "./api";
import { ParkForm } from "./ParkForm";
import { ReturnForm } from "./ReturnForm";
import { SpotGrid } from "./SpotGrid";

export function LotDashboard() {
  const [spots, setSpots] = useState<SpotStatus[] | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0); // bumping it reloads the lot
  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let current = true;
    Promise.all([fetchSpots(), fetchActiveTickets()]).then(
      ([nextSpots, nextTickets]) => {
        if (!current) return;
        setSpots(nextSpots);
        setTickets(nextTickets);
        setError(null);
      },
      (err) => current && setError(describeError(err).message),
    );
    return () => {
      current = false;
    };
  }, [version]);

  return (
    <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
      <div className="space-y-4">
        {error && (
          <p role="alert" data-testid="lot-error"
            className="rounded-lg border border-red-700 bg-red-50 px-3 py-2 font-medium text-red-900">
            {error}
          </p>
        )}
        {spots ? (
          <SpotGrid spots={spots} />
        ) : (
          <p data-testid="spots-loading" className="text-slate-800">
            Loading spots...
          </p>
        )}
        <ActiveTickets tickets={tickets} />
      </div>
      <div className="space-y-4">
        <ParkForm onChanged={refresh} />
        <ReturnForm onChanged={refresh} />
      </div>
    </div>
  );
}
