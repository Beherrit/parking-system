"use client";
import { useState, type FormEvent } from "react";
import type { Size, Ticket } from "@/domain/types";
import { parkCar } from "./api";
import { ResultRegion } from "./ResultRegion";
import { button, card, heading } from "./styles";
import { TextField } from "./TextField";
import { TicketCard } from "./TicketCard";
import { useAction } from "./useAction";

const SIZE_OPTIONS: { value: Size; label: string }[] = [
  { value: "small", label: "Small" },
  { value: "large", label: "Large" },
];

export function ParkForm({ onChanged }: { onChanged: () => void }) {
  const [plate, setPlate] = useState("");
  const [size, setSize] = useState<Size>("small");
  const { state, run } = useAction<Ticket>();

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (await run(() => parkCar(plate, size))) setPlate("");
    onChanged();
  }

  return (
    <section className={card} aria-labelledby="park-heading">
      <h2 id="park-heading" className={heading}>
        Park a car
      </h2>
      <form data-testid="park-form" onSubmit={submit} className="mt-3 space-y-4">
        <TextField id="park-plate" testId="park-plate" label="Plate" value={plate} onChange={setPlate}
          autoComplete="off" placeholder="ABC 123" mono />
        <fieldset>
          <legend className="mb-1 text-sm font-medium text-slate-900">Car size</legend>
          <div className="flex gap-3">
            {SIZE_OPTIONS.map((opt) => (
              <label key={opt.value}
                className="flex min-h-11 flex-1 cursor-pointer items-center gap-2 rounded-lg border border-slate-400 px-3 has-checked:border-indigo-700 has-checked:bg-indigo-50 has-focus-visible:ring-2 has-focus-visible:ring-indigo-700/40">
                <input type="radio" name="size" value={opt.value} checked={size === opt.value}
                  onChange={() => setSize(opt.value)} data-testid={`park-size-${opt.value}`}
                  className="size-4 accent-indigo-700" />
                <span className="font-medium text-slate-900">{opt.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <button type="submit" data-testid="park-submit" disabled={state.status === "pending"} className={button}>
          Park car
        </button>
      </form>
      <ResultRegion prefix="park" state={state}>
        {(ticket) => <TicketCard ticket={ticket} prefix="park-ticket" title="Ticket issued" showLink large />}
      </ResultRegion>
    </section>
  );
}
