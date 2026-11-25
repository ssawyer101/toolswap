import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { requestReset } from "@/app/actions/auth";
export const metadata = { title: "Forgot password" };
export default function Forgot() {
  return (
    <div className="narrow">
      <h1>Forgot your password?</h1>
      <p className="lede">Enter your email and we'll send you a link to pick a new one.</p>
      <ActionForm action={requestReset} className="panel stack">
        <label className="f">Email<input id="email" name="email" type="email" autoComplete="email" required /></label>
        <button className="primary" type="submit">Send reset link</button>
        <div style={{ fontSize: 14 }}><Link href="/login">Back to log in</Link></div>
      </ActionForm>
    </div>
  );
}
