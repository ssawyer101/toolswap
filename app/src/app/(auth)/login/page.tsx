import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm } from "@/components/ActionForm";
import { login } from "@/app/actions/auth";
import { currentUser } from "@/lib/auth";
export const metadata = { title: "Log in" };
export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await currentUser()) redirect("/search");
  const { next = "" } = await searchParams;
  return (
    <div className="narrow">
      <h1>Log in</h1>
      <p className="lede">Borrow tools from people you trust, and lend yours.</p>
      <ActionForm action={login} className="panel stack">
        <input type="hidden" name="next" value={next} />
        <label className="f">Email<input id="email" name="email" type="email" autoComplete="email" required /></label>
        <label className="f">Password<input id="password" name="password" type="password" autoComplete="current-password" required /></label>
        <button className="primary" type="submit">Log in</button>
        <div className="row" style={{ justifyContent: "space-between", fontSize: 14 }}>
          <Link href="/forgot">Forgot password?</Link>
          <Link href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Create an account</Link>
        </div>
      </ActionForm>
    </div>
  );
}
