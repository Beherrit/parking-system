import { LotDashboard } from "@/ui/LotDashboard";
import { SignOutButton } from "@/ui/SignOutButton";

export default function Home() {
  return (
    <>
      <header className="border-b border-slate-300 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <h1 data-testid="lot-name" className="text-xl font-bold text-slate-900">
            Riverside Parking Lot
          </h1>
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-4">
        <LotDashboard />
      </main>
    </>
  );
}
