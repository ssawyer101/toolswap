import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { signup } from "@/app/actions/auth";
export const metadata = { title: "Create account" };
export default async function Signup({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = "" } = await searchParams;
  return (
    <div className="narrow">
      <h1>Create your account</h1>
      <p className="lede">Then join a group with an invite code, or start your own.</p>
      <ActionForm action={signup} className="panel stack">
        <input type="hidden" name="next" value={next} />
        <label className="f">Your name<input id="name" name="name" autoComplete="name" required placeholder="Mike Ramirez" /></label>
        <label className="f">Email<input id="email" name="email" type="email" autoComplete="email" required /></label>
        <label className="f">Password <small>At least 8 characters</small><input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required /></label>
        <label className="f">Neighborhood or town <small>Optional. Helps people judge the drive. Don't put your street address.</small><input id="area" name="area" placeholder="Oak Ridge" /></label>
        <button className="primary" type="submit">Create account</button>
        <div style={{ fontSize: 14 }}>Already have one? <Link href="/login">Log in</Link></div>
      </ActionForm>
    </div>
  );
}
