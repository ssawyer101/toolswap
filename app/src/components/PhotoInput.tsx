"use client";
import { useState } from "react";
/** Shrinks big phone photos before upload so they're quick to send and load. */
export function PhotoInput({ current }: { current?: string | null }) {
  const [preview, setPreview] = useState<string | null>(current ?? null);
  const [busy, setBusy] = useState(false);
  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget, file = input.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const bmp = await createImageBitmap(file);
      const scale = Math.min(1, 1400 / Math.max(bmp.width, bmp.height));
      const c = document.createElement("canvas");
      c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
      c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
      const blob: Blob = await new Promise((r) => c.toBlob((b) => r(b!), "image/jpeg", 0.82));
      const dt = new DataTransfer();
      dt.items.add(new File([blob], "photo.jpg", { type: "image/jpeg" }));
      input.files = dt.files;
      setPreview(URL.createObjectURL(blob));
    } catch {
      setPreview(URL.createObjectURL(file)); // couldn't shrink it; upload as is
    } finally { setBusy(false); }
  }
  return (
    <div className="stack" style={{ gap: 8 }}>
      {preview && <img src={preview} alt="Tool photo preview" style={{ maxHeight: 160, width: "auto", borderRadius: 6, border: "1px solid var(--line)" }} />}
      <input type="file" name="photo" accept="image/*" onChange={onChange} id="photo" />
      {busy && <small>Shrinking photo…</small>}
    </div>
  );
}
