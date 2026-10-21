import { PrintableTicket } from "@/ui/PrintableTicket";

export default async function TicketPage({ params }: PageProps<"/tickets/[code]">) {
  const { code } = await params;
  return (
    <main className="flex-1 px-4 py-6">
      <PrintableTicket code={code} />
    </main>
  );
}
