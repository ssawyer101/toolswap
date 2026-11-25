import { ActionForm } from "@/components/ActionForm";
import { resetPassword } from "@/app/actions/auth";
export const metadata = { title: "Choose a new password" };
export default async function Reset({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <div className="narrow">
      <h1>Choose a new password</h1>
      <ActionForm action={resetPassword} className="panel stack">
        <input type="hidden" name="token" value={token} />
        <label className="f">New password <small>At least 8 characters</small><input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required /></label>
        <button className="primary" type="submit">Save and log in</button>
      </ActionForm>
    </div>
  );
}
