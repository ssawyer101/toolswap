"use client";
import { useActionState, useEffect, useRef } from "react";
import type { FormState } from "@/app/actions/auth";

/** A form that shows the server's error or success message under it. */
export function ActionForm({ action, children, className, resetOnOk, style }: {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  children: React.ReactNode; className?: string; resetOnOk?: boolean; style?: React.CSSProperties;
}) {
  const [state, run, pending] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (resetOnOk && state?.ok) ref.current?.reset(); }, [state, resetOnOk]);
  return (
    <form ref={ref} action={run} className={className} style={style} aria-busy={pending}>
      <fieldset disabled={pending} style={{ border: 0, padding: 0, margin: 0, display: "contents" }}>{children}</fieldset>
      {state?.error && <div className="msg-err full" role="alert">{state.error}</div>}
      {state?.ok && state.ok !== "sent" && <div className="msg-ok full" role="status">{state.ok}</div>}
    </form>
  );
}
