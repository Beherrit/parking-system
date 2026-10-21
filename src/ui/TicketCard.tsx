import Link from "next/link";
import type { Ticket } from "@/domain/types";
import { formatDuration, formatTime } from "./format";
import { linkButton } from "./styles";

interface Props {
  ticket: Ticket;
  prefix: string; // test ids are `${prefix}-code`, `${prefix}-plate`, and so on
  title: string;
  durationMinutes?: number;
  showLink?: boolean;
  large?: boolean;
}

function Row({ label, testId, value, mono }: { label: string; testId: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 border-b border-slate-200 py-1.5 last:border-0">
      <dt className="text-sm text-slate-700">{label}</dt>
      <dd data-testid={testId} className={`font-semibold text-slate-900 ${mono ? "font-mono tracking-wider" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

export function TicketCard({ ticket, prefix, title, durationMinutes, showLink, large }: Props) {
  return (
    <section
      data-testid={`${prefix}-card`}
      aria-label={title}
      className="rounded-lg border-2 border-slate-800 bg-white p-4"
    >
      <h3 className={`${large ? "text-2xl" : "text-base"} mb-2 font-bold text-slate-900`}>{title}</h3>
      <dl>
        <Row label="Ticket code" testId={`${prefix}-code`} value={ticket.code} mono />
        <Row label="Plate" testId={`${prefix}-plate`} value={ticket.plate} mono />
        <Row label="Spot" testId={`${prefix}-spot`} value={ticket.spotNumber} />
        <Row label="Arrived" testId={`${prefix}-arrived`} value={formatTime(ticket.arrivedAt)} />
        {ticket.returnedAt && (
          <Row label="Returned" testId={`${prefix}-returned`} value={formatTime(ticket.returnedAt)} />
        )}
        {durationMinutes !== undefined && (
          <Row label="Time parked" testId={`${prefix}-duration`} value={formatDuration(durationMinutes)} />
        )}
      </dl>
      {showLink && (
        <Link
          href={`/tickets/${ticket.code}`}
          data-testid={`${prefix}-link`}
          className={`${linkButton} mt-3 print:hidden`}
        >
          Printable ticket
        </Link>
      )}
    </section>
  );
}
