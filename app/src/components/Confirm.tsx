"use client";
import { useState } from "react";
/** A button that asks "Are you sure?" inline before submitting its form. */
export function ConfirmButton({ label, confirm, className }: { label: string; confirm: string; className?: string }) {
  const [ask, setAsk] = useState(false);
  if (!ask) return <button type="button" className={className} onClick={() => setAsk(true)}>{label}</button>;
  return (
    <span className="row" style={{ gap: 6 }}>
      <span style={{ fontSize: 14 }}>{confirm}</span>
      <button type="submit" className="small primary">Yes</button>
      <button type="button" className="small" onClick={() => setAsk(false)}>No</button>
    </span>
  );
}
