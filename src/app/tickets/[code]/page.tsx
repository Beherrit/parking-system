import { Suspense } from "react";
import { PrintableTicket } from "@/ui/PrintableTicket";

// The code comes from the request URL, so it is read inside a Suspense boundary (Cache Components).
async function TicketFromParams({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <PrintableTicket code={code} />;
}

export default function TicketPage({ params }: PageProps<"/tickets/[code]">) {
  return (
    <main className="flex-1 px-4 py-6">
      <Suspense fallback={<p className="text-center text-sm">Loading ticket...</p>}>
        <TicketFromParams params={params} />
      </Suspense>
    </main>
  );
}
