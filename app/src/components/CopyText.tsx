"use client";
import { useState } from "react";
export function CopyText({ text }: { text: string }) {
  const [msg, setMsg] = useState("");
  return (
    <div className="row">
      <span className="tagno" style={{ fontSize: 16, padding: "5px 10px", userSelect: "all" }}>{text}</span>
      <button type="button" className="small" onClick={() => navigator.clipboard.writeText(text).then(() => setMsg("Copied"), () => setMsg("Select the code and copy it"))}>Copy</button>
      {msg && <span className="meta">{msg}</span>}
    </div>
  );
}
