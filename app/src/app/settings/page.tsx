import { requireUser } from "@/lib/auth";
import { ActionForm } from "@/components/ActionForm";
import { changePassword, logout, updateProfile } from "@/app/actions/auth";
import { PushToggle } from "@/components/PushToggle";
export const metadata = { title: "Account" };

export default async function Settings() {
  const u = await requireUser();
  return (
    <>
      <h1>Account</h1>
      <p className="lede">Signed in as {u.email}</p>
      <div className="grid2">
        <ActionForm action={updateProfile} className="panel stack">
          <div className="tname">Profile</div>
          <label className="f">Name<input id="name" name="name" defaultValue={u.name} required /></label>
          <label className="f">Neighborhood or town <small>Shown next to your tools. Not your street address.</small><input id="area" name="area" defaultValue={u.area ?? ""} /></label>
          <button className="primary">Save</button>
        </ActionForm>
        <ActionForm action={changePassword} className="panel stack" resetOnOk>
          <div className="tname">Change password</div>
          <label className="f">Current password<input id="current" name="current" type="password" autoComplete="current-password" required /></label>
          <label className="f">New password <small>At least 8 characters</small><input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required /></label>
          <button className="primary">Change password</button>
        </ActionForm>
        <div className="panel stack">
          <div className="tname">Notifications on this device</div>
          <PushToggle publicKey={process.env.VAPID_PUBLIC_KEY || ""} />
        </div>
      </div>
      <form action={logout} style={{ marginTop: 20 }}><button>Log out</button></form>
    </>
  );
}
