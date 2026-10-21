import { LoginForm } from "@/ui/LoginForm";

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-8">
      <p data-testid="login-lot-name" className="text-lg font-semibold text-slate-800">
        Riverside Parking Lot
      </p>
      <LoginForm />
    </main>
  );
}
