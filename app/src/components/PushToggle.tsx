"use client";
import { useEffect, useState } from "react";
import { removePush, savePush } from "@/app/actions/push";

function b64ToBytes(b64: string) {
  const s = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

export function PushToggle({ publicKey, compact }: { publicKey: string; compact?: boolean }) {
  const [state, setState] = useState<"loading" | "unsupported" | "ios-install" | "blocked" | "off" | "on">("loading");
  const [err, setErr] = useState("");
  useEffect(() => {
    (async () => {
      const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const standalone = matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone;
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return setState(ios && !standalone ? "ios-install" : "unsupported");
      if (Notification.permission === "denied") return setState("blocked");
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, []);

  async function turnOn() {
    setErr("");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return setState(perm === "denied" ? "blocked" : "off");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(publicKey) });
      await savePush(JSON.parse(JSON.stringify(sub)));
      setState("on");
    } catch (e: any) { setErr("Couldn't turn on notifications: " + (e?.message || e)); }
  }
  async function turnOff() {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) { await removePush(sub.endpoint); await sub.unsubscribe(); }
    setState("off");
  }

  if (state === "loading") return null;
  if (compact && state !== "off") return null;
  return (
    <div className={compact ? "panel row" : "stack"} style={compact ? { justifyContent: "space-between", marginBottom: 18 } : { gap: 8 }}>
      {state === "on" && <><span className="pill p-ok">On for this device</span><button className="small" onClick={turnOff}>Turn off on this device</button></>}
      {state === "off" && <><span>{compact ? "Get a notification when someone asks for your tools or something's due." : "Notifications are off on this device."}</span><button className="primary small" onClick={turnOn}>Turn on notifications</button></>}
      {state === "blocked" && <span>Notifications are blocked for this site. Allow them in your browser's site settings, then reload.</span>}
      {state === "ios-install" && <span>On iPhone, notifications only work after you add ToolSwap to your home screen: tap the Share button, then <b>Add to Home Screen</b>. Open it from there and come back to this page.</span>}
      {state === "unsupported" && <span>This browser can't show notifications. You'll still see everything under Notifications here.</span>}
      {err && <span className="msg-err">{err}</span>}
    </div>
  );
}
