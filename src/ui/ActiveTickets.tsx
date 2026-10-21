import Link from "next/link";
import type { Ticket } from "@/domain/types";
import { formatTime } from "./format";
import { card, heading } from "./styles";

export function ActiveTickets({ tickets }: { tickets: Ticket[] }) {
  return (
    <section data-testid="active-tickets" className={card} aria-labelledby="active-heading">
      <h2 id="active-heading" className={heading}>
        Parked cars ({tickets.length})
      </h2>
      {tickets.length === 0 ? (
        <p data-testid="active-empty" className="mt-2 text-slate-800">
          No cars are parked.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-slate-200">
          {tickets.map((t) => (
            <li key={t.code} data-testid={`active-ticket-${t.code}`} data-plate={t.plate} data-spot={t.spotNumber}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
              <span>
                <span className="font-mono text-base font-bold tracking-wider">{t.plate}</span>
                <span className="ml-2 text-slate-800">Spot {t.spotNumber}</span>
              </span>
              <span className="flex items-center gap-3 text-sm text-slate-800">
                <span className="font-mono">{t.code}</span>
                <time dateTime={t.arrivedAt}>{formatTime(t.arrivedAt)}</time>
                <Link href={`/tickets/${t.code}`} data-testid={`active-ticket-link-${t.code}`}
                  className="font-semibold text-indigo-800 underline underline-offset-2">
                  Ticket
                </Link>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
