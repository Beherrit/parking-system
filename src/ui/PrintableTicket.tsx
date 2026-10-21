"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Ticket } from "@/domain/types";
import { describeError, fetchTicket } from "./api";
import { button, linkButton } from "./styles";
import { TicketCard } from "./TicketCard";

export function PrintableTicket({ code }: { code: string }) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);

  useEffect(() => {
    fetchTicket(code).then(setTicket, (err) => setError(describeError(err)));
  }, [code]);

  return (
    <div data-testid="ticket-page" className="mx-auto w-full max-w-md">
      <div aria-live="polite">
        {ticket && <TicketCard ticket={ticket} prefix="ticket" title="Parking ticket" large />}
        {error && (
          <p data-testid="ticket-error" data-code={error.code}
            className="rounded-lg border border-red-700 bg-red-50 px-3 py-2 font-medium text-red-900">
            {error.message}
          </p>
        )}
      </div>
      {ticket && (
        <p className="mt-3 text-sm text-slate-700">Keep this ticket. You need the code and your plate to collect the car.</p>
      )}
      <div className="mt-4 flex gap-3 print:hidden">
        <button type="button" data-testid="print-button" className={button} onClick={() => window.print()}>
          Print
        </button>
        <Link href="/" data-testid="back-to-lot" className={linkButton}>
          Back to lot
        </Link>
      </div>
    </div>
  );
}
