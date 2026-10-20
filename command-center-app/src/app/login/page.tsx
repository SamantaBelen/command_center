"use client";

import { useState } from "react";

export default function Login() {
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        window.location.href = "/";
      } else {
        setErr("Contraseña incorrecta");
      }
    } catch {
      setErr("Algo salió mal. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <div>
        <p className="kicker">Command Center</p>
        <h1 className="hello serif">Hoy</h1>
      </div>
      <form onSubmit={submit}>
        <input
          type="password"
          inputMode="text"
          autoFocus
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="btn" type="submit" disabled={busy}>
          {busy ? "…" : "Entrar"}
        </button>
        <div className="err">{err}</div>
      </form>
    </div>
  );
}
