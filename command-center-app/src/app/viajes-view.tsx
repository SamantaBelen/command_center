"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Trip = {
  id: string;
  name: string;
  destino: string;
  inicio: string | null;
  fin: string | null;
  notas: string;
};
type TripEvent = {
  id: string;
  title: string;
  date: string | null;
  hora: string;
  tipo: string | null;
  lugar: string;
  outfit: string;
  photo: string | null;
  notas: string;
  orden: number | null;
};

const TIPOS = ["Vuelo", "Hotel", "Comida", "Actividad", "Evento", "Transporte", "Otro"];

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
function fmtDay(iso: string | null): string {
  if (!iso) return "Sin fecha";
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return `${DIAS[dt.getUTCDay()]} ${d} ${MESES[m - 1]}`;
}
function fmtRange(a: string | null, b: string | null): string {
  if (!a && !b) return "";
  if (a && b) return `${fmtDay(a)} – ${fmtDay(b)}`;
  return fmtDay(a || b);
}

export default function ViajesView() {
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<Trip | null>(null);

  async function loadTrips() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/trips", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Error");
      setTrips(data.trips);
    } catch (e: any) {
      setError(e?.message ?? "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTrips();
  }, []);

  if (active) {
    return <TripDetail trip={active} onBack={() => setActive(null)} />;
  }

  return (
    <section className="trips">
      <div className="trips-head">
        <h2>Viajes</h2>
      </div>

      {error && <p className="trip-err">No se pudo cargar: {error}</p>}
      {loading && !trips && <p className="trip-muted">Cargando…</p>}

      <NewTripForm onCreated={(t) => setTrips((cur) => [t, ...(cur ?? [])])} />

      {trips && trips.length === 0 && !loading && (
        <p className="trip-muted">Aún no tienes viajes. Crea el primero arriba. ✈️</p>
      )}

      <ul className="trip-list">
        {(trips ?? []).map((t) => (
          <li key={t.id}>
            <button className="trip-card" onClick={() => setActive(t)}>
              <span className="trip-card-name">{t.name}</span>
              {t.destino && <span className="trip-card-dest">📍 {t.destino}</span>}
              {(t.inicio || t.fin) && (
                <span className="trip-card-dates">{fmtRange(t.inicio, t.fin)}</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function NewTripForm({ onCreated }: { onCreated: (t: Trip) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [destino, setDestino] = useState("");
  const [inicio, setInicio] = useState("");
  const [fin, setFin] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!name.trim()) return;
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, destino, inicio, fin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Error");
      onCreated(data.trip);
      setName("");
      setDestino("");
      setInicio("");
      setFin("");
      setOpen(false);
    } catch (e: any) {
      setErr(e?.message ?? "Error");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button className="trip-add-btn" onClick={() => setOpen(true)}>
        + Nuevo viaje
      </button>
    );
  }

  return (
    <div className="trip-form">
      <input className="trip-input" placeholder="Nombre del viaje" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      <input className="trip-input" placeholder="Destino" value={destino} onChange={(e) => setDestino(e.target.value)} />
      <div className="trip-row2">
        <label className="trip-lbl">Inicio<input type="date" className="trip-input" value={inicio} onChange={(e) => setInicio(e.target.value)} /></label>
        <label className="trip-lbl">Fin<input type="date" className="trip-input" value={fin} onChange={(e) => setFin(e.target.value)} /></label>
      </div>
      {err && <p className="trip-err">{err}</p>}
      <div className="trip-form-actions">
        <button className="trip-btn-ghost" onClick={() => setOpen(false)} disabled={saving}>Cancelar</button>
        <button className="trip-btn" onClick={submit} disabled={saving || !name.trim()}>{saving ? "Guardando…" : "Crear viaje"}</button>
      </div>
    </div>
  );
}

function TripDetail({ trip, onBack }: { trip: Trip; onBack: () => void }) {
  const [events, setEvents] = useState<TripEvent[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/trips/events?trip=${trip.id}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Error");
      setEvents(data.events);
    } catch (e: any) {
      setError(e?.message ?? "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.id]);

  // Group events by day, preserving the sorted order from the API.
  const groups = useMemo(() => {
    const map = new Map<string, TripEvent[]>();
    for (const e of events ?? []) {
      const k = e.date ?? "";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    }
    return Array.from(map.entries());
  }, [events]);

  async function removeEvent(id: string) {
    const fd = new FormData();
    fd.append("op", "delete");
    fd.append("id", id);
    await fetch("/api/trips/events", { method: "POST", body: fd });
    setEvents((cur) => (cur ?? []).filter((e) => e.id !== id));
  }

  return (
    <section className="trips">
      <button className="trip-back" onClick={onBack}>‹ Viajes</button>
      <div className="trip-detail-head">
        <h2>{trip.name}</h2>
        <p className="trip-detail-sub">
          {trip.destino && <span>📍 {trip.destino}</span>}
          {(trip.inicio || trip.fin) && <span>{fmtRange(trip.inicio, trip.fin)}</span>}
        </p>
      </div>

      <NewEventForm
        trip={trip}
        onCreated={(ev) => setEvents((cur) => sortEvents([...(cur ?? []), ev]))}
      />

      {error && <p className="trip-err">No se pudo cargar: {error}</p>}
      {loading && !events && <p className="trip-muted">Cargando itinerario…</p>}
      {events && events.length === 0 && !loading && (
        <p className="trip-muted">Sin eventos todavía. Agrega el primero arriba.</p>
      )}

      <div className="trip-days">
        {groups.map(([day, evs]) => (
          <div key={day} className="trip-day">
            <h3 className="trip-day-h">{fmtDay(day || null)}</h3>
            <ul className="trip-events">
              {evs.map((e) => (
                <li key={e.id} className="trip-event">
                  <div className="trip-event-top">
                    {e.hora && <span className="trip-hora">{e.hora}</span>}
                    {e.tipo && <span className={`trip-tipo tipo-${e.tipo}`}>{e.tipo}</span>}
                    <span className="trip-event-title">{e.title}</span>
                    <button className="trip-x" onClick={() => removeEvent(e.id)} aria-label="Eliminar">✕</button>
                  </div>
                  {e.lugar && <p className="trip-lugar">📍 {e.lugar}</p>}
                  {(e.outfit || e.photo) && (
                    <div className="trip-outfit">
                      {e.photo && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="trip-outfit-img" src={e.photo} alt="outfit" loading="lazy" />
                      )}
                      {e.outfit && (
                        <p className="trip-outfit-txt"><span className="trip-outfit-ic">👗</span>{e.outfit}</p>
                      )}
                    </div>
                  )}
                  {e.notas && <p className="trip-notas">{e.notas}</p>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function sortEvents(list: TripEvent[]): TripEvent[] {
  return [...list].sort((a, b) => {
    const d = (a.date ?? "9999").localeCompare(b.date ?? "9999");
    if (d) return d;
    const h = (a.hora ?? "").localeCompare(b.hora ?? "");
    if (h) return h;
    return (a.orden ?? 0) - (b.orden ?? 0);
  });
}

function NewEventForm({ trip, onCreated }: { trip: Trip; onCreated: (e: TripEvent) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(trip.inicio ?? "");
  const [hora, setHora] = useState("");
  const [tipo, setTipo] = useState("");
  const [lugar, setLugar] = useState("");
  const [outfit, setOutfit] = useState("");
  const [notas, setNotas] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function submit() {
    if (!title.trim()) return;
    setSaving(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append("trip", trip.id);
      fd.append("title", title);
      if (date) fd.append("date", date);
      if (hora) fd.append("hora", hora);
      if (tipo) fd.append("tipo", tipo);
      if (lugar) fd.append("lugar", lugar);
      if (outfit) fd.append("outfit", outfit);
      if (notas) fd.append("notas", notas);
      const file = fileRef.current?.files?.[0];
      if (file) fd.append("photo", file);
      const res = await fetch("/api/trips/events", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Error");
      onCreated(data.event);
      setTitle("");
      setHora("");
      setTipo("");
      setLugar("");
      setOutfit("");
      setNotas("");
      if (fileRef.current) fileRef.current.value = "";
      setOpen(false);
    } catch (e: any) {
      setErr(e?.message ?? "Error");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button className="trip-add-btn" onClick={() => setOpen(true)}>
        + Agregar evento
      </button>
    );
  }

  return (
    <div className="trip-form">
      <input className="trip-input" placeholder="Título (ej. Cena, Museo, Vuelo…)" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      <div className="trip-row2">
        <label className="trip-lbl">Fecha<input type="date" className="trip-input" value={date} min={trip.inicio ?? undefined} max={trip.fin ?? undefined} onChange={(e) => setDate(e.target.value)} /></label>
        <label className="trip-lbl">Hora<input type="time" className="trip-input" value={hora} onChange={(e) => setHora(e.target.value)} /></label>
      </div>
      <div className="trip-row2">
        <label className="trip-lbl">Tipo
          <select className="trip-input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="">—</option>
            {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="trip-lbl">Lugar<input className="trip-input" placeholder="Lugar" value={lugar} onChange={(e) => setLugar(e.target.value)} /></label>
      </div>
      <input className="trip-input" placeholder="Outfit (ej. vestido rust + botas)" value={outfit} onChange={(e) => setOutfit(e.target.value)} />
      <label className="trip-lbl">Foto del outfit (opcional)
        <input ref={fileRef} type="file" accept="image/*" className="trip-file" />
      </label>
      <input className="trip-input" placeholder="Notas (opcional)" value={notas} onChange={(e) => setNotas(e.target.value)} />
      {err && <p className="trip-err">{err}</p>}
      <div className="trip-form-actions">
        <button className="trip-btn-ghost" onClick={() => setOpen(false)} disabled={saving}>Cancelar</button>
        <button className="trip-btn" onClick={submit} disabled={saving || !title.trim()}>{saving ? "Guardando…" : "Agregar"}</button>
      </div>
    </div>
  );
}
