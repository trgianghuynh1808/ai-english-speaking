import { Conversation } from "@/components/Conversation";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
      <h1 data-testid="app-title" className="text-3xl font-semibold tracking-tight">
        AI English Speaking Coach
      </h1>
      <Conversation />
    </main>
  );
}
