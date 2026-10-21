"use client";
import { useState, type FormEvent } from "react";
import type { ReturnResult } from "@/domain/types";
import { returnCar } from "./api";
import { ResultRegion } from "./ResultRegion";
import { button, card, heading } from "./styles";
import { TextField } from "./TextField";
import { TicketCard } from "./TicketCard";
import { useAction } from "./useAction";

export function ReturnForm({ onChanged }: { onChanged: () => void }) {
  const [code, setCode] = useState("");
  const [plate, setPlate] = useState("");
  const { state, run } = useAction<ReturnResult>();

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (await run(() => returnCar(code, plate))) {
      setCode("");
      setPlate("");
    }
    onChanged();
  }

  return (
    <section className={card} aria-labelledby="return-heading">
      <h2 id="return-heading" className={heading}>
        Return a car
      </h2>
      <form data-testid="return-form" onSubmit={submit} className="mt-3 space-y-4">
        <TextField id="return-code" testId="return-code" label="Ticket code" value={code} onChange={setCode}
          autoComplete="off" placeholder="8 characters" mono />
        <TextField id="return-plate" testId="return-plate" label="Plate" value={plate} onChange={setPlate}
          autoComplete="off" placeholder="ABC 123" mono />
        <button type="submit" data-testid="return-submit" disabled={state.status === "pending"} className={button}>
          Return car
        </button>
      </form>
      <ResultRegion prefix="return" state={state}>
        {({ ticket, durationMinutes }) => (
          <TicketCard ticket={ticket} prefix="return-ticket" title="Car returned" durationMinutes={durationMinutes} large />
        )}
      </ResultRegion>
    </section>
  );
}
