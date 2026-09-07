import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Clock, LogOut, Users, Settings, Calendar, TrendingUp, Plus, Trash2, X,
  AlertCircle, Building2, Home, Pencil, Loader2, ChevronDown, CheckCircle2,
  ShieldCheck, Sunrise, Moon
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Design tokens                                                      */
/* ------------------------------------------------------------------ */
const COLORS = {
  navy: "#12263A",
  navyDeep: "#0B1B29",
  sidebar: "#132C42",
  amber: "#C6801F",
  amberSoft: "#F3E1C4",
  indigo: "#4B4A8E",
  indigoSoft: "#E3E2F2",
  teal: "#1F7A6C",
  tealSoft: "#DCEEE9",
  bg: "#F5F6F8",
  surface: "#FFFFFF",
  border: "#E2E5EA",
  muted: "#64707D",
  danger: "#B3432C",
  dangerSoft: "#F5E1DC",
};

const FONT_IMPORT =
  "@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');";

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */
const BASIC_DEFAULT = 35000;
const OT_RATE_DEFAULT = 420;

function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

function computeEntry(rec) {
  if (!rec || rec.status === "off") {
    return { status: "off", hours: 0, ot: 0, dayOT: 0, nightOT: 0 };
  }
  const inM = timeToMinutes(rec.checkIn);
  let outM = timeToMinutes(rec.checkOut);
  if (outM <= inM) outM += 1440;
  const hours = (outM - inM) / 60;
  const ot = Math.max(0, hours - 12);
  const dayOT = rec.shiftType === "day" ? ot : 0;
  const nightOT = rec.shiftType === "night" ? ot : 0;
  return {
    status: "working",
    hours,
    ot,
    dayOT,
    nightOT,
    checkIn: rec.checkIn,
    checkOut: rec.checkOut,
    shiftType: rec.shiftType,
  };
}

function monthAggregate(records, month) {
  const keys = Object.keys(records || {}).filter((k) => k.startsWith(month));
  let hours = 0, dayOT = 0, nightOT = 0, workingDays = 0, offDays = 0;
  keys.forEach((k) => {
    const c = computeEntry(records[k]);
    if (c.status === "working") {
      workingDays += 1;
      hours += c.hours;
      dayOT += c.dayOT;
      nightOT += c.nightOT;
    } else {
      offDays += 1;
    }
  });
  return { hours, dayOT, nightOT, workingDays, offDays, entries: keys.length };
}

function salaryFor(agg, settings) {
  const otHours = agg.dayOT + agg.nightOT;
  const otPay = otHours * settings.otRate;
  return { basic: settings.basicSalary, otHours, otPay, gross: settings.basicSalary + otPay };
}

function fmtLKR(n) {
  return "Rs. " + Math.round(n).toLocaleString("en-US");
}

function fmtHours(n) {
  return (Math.round(n * 10) / 10).toFixed(1) + "h";
}

function fmtDateLabel(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" });
}

function currentMonthStr() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}

function todayStr() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

/* ------------------------------------------------------------------ */
/*  Storage helpers                                                     */
/* ------------------------------------------------------------------ */
async function sGet(key, shared) {
  try {
    const r = await window.storage.get(key, shared);
    return r && r.value ? JSON.parse(r.value) : null;
  } catch (e) {
    return null;
  }
}
async function sSet(key, value, shared) {
  try {
    await window.storage.set(key, JSON.stringify(value), shared);
    return true;
  } catch (e) {
    console.error("storage set failed", e);
    return false;
  }
}
async function sDelete(key, shared) {
  try {
    await window.storage.delete(key, shared);
    return true;
  } catch (e) {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Seed data — mirrors the real June 2026 attendance sheet supplied    */
/* ------------------------------------------------------------------ */
function buildSeed() {
  const users = [
    { email: "admin@company.lk", name: "Admin User", password: "admin123", role: "admin" },
    { email: "navodya@company.lk", name: "Navodya Manamendra", password: "demo123", role: "employee" },
    { email: "kasun@company.lk", name: "Kasun Perera", password: "demo123", role: "employee" },
    { email: "dilani@company.lk", name: "Dilani Fernando", password: "demo123", role: "employee" },
  ];
  const settings = { basicSalary: BASIC_DEFAULT, otRate: OT_RATE_DEFAULT };

  const navodyaJune = {
    1: ["08:00", "20:00", "day"], 2: ["11:00", "23:00", "night"], 3: null,
    4: ["08:00", "20:00", "day"], 5: ["08:00", "20:00", "day"], 6: null,
    7: ["08:00", "20:00", "day"], 8: ["11:00", "23:00", "night"], 9: ["11:00", "23:00", "night"],
    10: ["08:00", "20:00", "day"], 11: ["08:00", "20:00", "day"], 12: null, 13: null,
    14: ["08:00", "20:00", "day"], 15: ["08:00", "20:00", "day"], 16: ["11:00", "23:00", "night"],
    17: ["11:00", "03:00", "night"], 18: ["11:00", "04:00", "night"], 19: null, 20: null,
    21: ["11:00", "23:00", "night"], 22: ["11:00", "09:00", "night"], 23: ["11:00", "10:00", "night"],
    24: null, 25: ["11:00", "03:00", "night"], 26: null, 27: null,
    28: ["08:00", "20:00", "day"], 29: ["11:00", "01:00", "night"], 30: ["11:00", "23:00", "night"],
  };
  const navodyaRecords = {};
  Object.entries(navodyaJune).forEach(([day, val]) => {
    const key = `2026-06-${String(day).padStart(2, "0")}`;
    navodyaRecords[key] = val
      ? { status: "working", checkIn: val[0], checkOut: val[1], shiftType: val[2] }
      : { status: "off" };
  });
  // A few current-month entries so the dashboard isn't empty on first look.
  const nowMonth = currentMonthStr();
  const today = todayStr();
  for (let d = 1; d <= 4; d++) {
    const key = `${nowMonth}-${String(d).padStart(2, "0")}`;
    if (key < today) {
      navodyaRecords[key] = { status: "working", checkIn: "08:00", checkOut: "20:00", shiftType: "day" };
    }
  }

  const kasunJune = {
    1: ["08:00", "20:00", "day"], 2: ["11:00", "23:00", "night"], 3: null,
    4: ["08:00", "20:00", "day"], 5: ["11:00", "02:00", "night"], 6: null,
    7: ["08:00", "20:00", "day"], 8: ["08:00", "20:00", "day"], 9: null,
    10: ["11:00", "23:00", "night"],
  };
  const kasunRecords = {};
  Object.entries(kasunJune).forEach(([day, val]) => {
    const key = `2026-06-${String(day).padStart(2, "0")}`;
    kasunRecords[key] = val
      ? { status: "working", checkIn: val[0], checkOut: val[1], shiftType: val[2] }
      : { status: "off" };
  });

  const dilaniJune = {
    1: ["08:00", "20:00", "day"], 2: null, 3: ["08:00", "22:00", "day"],
    4: ["08:00", "20:00", "day"], 5: null,
  };
  const dilaniRecords = {};
  Object.entries(dilaniJune).forEach(([day, val]) => {
    const key = `2026-06-${String(day).padStart(2, "0")}`;
    dilaniRecords[key] = val
      ? { status: "working", checkIn: val[0], checkOut: val[1], shiftType: val[2] }
      : { status: "off" };
  });

  return {
    users, settings,
    records: {
      "navodya@company.lk": navodyaRecords,
      "kasun@company.lk": kasunRecords,
      "dilani@company.lk": dilaniRecords,
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Small shared UI pieces                                              */
/* ------------------------------------------------------------------ */
function Toast({ message, kind }) {
  if (!message) return null;
  const isError = kind === "error";
  return (
    <div
      className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium"
      style={{
        background: isError ? COLORS.dangerSoft : COLORS.tealSoft,
        color: isError ? COLORS.danger : COLORS.teal,
        border: `1px solid ${isError ? COLORS.danger : COLORS.teal}33`,
      }}
    >
      {isError ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
      {message}
    </div>
  );
}

function Tile({ label, value, sub, accent }) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-1"
      style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
    >
      <span className="text-xs font-medium uppercase tracking-wide" style={{ color: COLORS.muted, letterSpacing: "0.06em" }}>
        {label}
      </span>
      <span
        className="text-2xl font-semibold"
        style={{ fontFamily: "'Space Grotesk', sans-serif", color: accent || COLORS.navy }}
      >
        {value}
      </span>
      {sub && <span className="text-xs" style={{ color: COLORS.muted }}>{sub}</span>}
    </div>
  );
}

/* Signature visual: a proportional shift timeline bar (0-20h scale) */
function TimelineBar({ entry, compact }) {
  const scale = 20;
  if (!entry || entry.status === "off") {
    return (
      <div className="flex items-center gap-2">
        <div
          className="flex-1 h-6 rounded-md flex items-center justify-center text-[11px] font-medium"
          style={{
            background: "repeating-linear-gradient(135deg, #EDEFF2, #EDEFF2 6px, #E4E6EA 6px, #E4E6EA 12px)",
            color: COLORS.muted,
            border: `1px solid ${COLORS.border}`,
          }}
        >
          Day off
        </div>
      </div>
    );
  }
  const regular = Math.min(entry.hours, 12);
  const regPct = (regular / scale) * 100;
  const dayPct = (entry.dayOT / scale) * 100;
  const nightPct = (entry.nightOT / scale) * 100;
  return (
    <div className="flex-1">
      <div className="relative h-6 rounded-md overflow-hidden" style={{ background: "#EEF0F3", border: `1px solid ${COLORS.border}` }}>
        <div className="absolute inset-y-0 left-0" style={{ width: regPct + "%", background: COLORS.teal }} />
        <div className="absolute inset-y-0" style={{ left: regPct + "%", width: dayPct + "%", background: COLORS.amber }} />
        <div className="absolute inset-y-0" style={{ left: regPct + dayPct + "%", width: nightPct + "%", background: COLORS.indigo }} />
      </div>
      {!compact && (
        <div className="flex justify-between mt-0.5 text-[10px]" style={{ color: COLORS.muted }}>
          <span>0h</span><span>4h</span><span>8h</span><span>12h</span><span>16h</span><span>20h</span>
        </div>
      )}
    </div>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-4 text-xs" style={{ color: COLORS.muted }}>
      <span className="flex items-center gap-1.5"><i className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: COLORS.teal }} />Regular</span>
      <span className="flex items-center gap-1.5"><i className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: COLORS.amber }} />Day OT</span>
      <span className="flex items-center gap-1.5"><i className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: COLORS.indigo }} />Night OT</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Auth screen                                                         */
/* ------------------------------------------------------------------ */
function AuthScreen({ onLogin, onRegister, onReset, error, busy }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", name: "", role: "employee" });

  const submit = () => {
    if (busy) return;
    if (mode === "login") onLogin(form.email.trim(), form.password);
    else onRegister(form.email.trim(), form.password, form.name.trim(), form.role);
  };

  const onEnter = (e) => {
    if (e.key === "Enter") submit();
  };

  return (
    <div className="min-h-screen flex" style={{ background: COLORS.bg }}>
      <style>{FONT_IMPORT}</style>
      {/* Left brand panel */}
      <div
        className="hidden md:flex md:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: `linear-gradient(160deg, ${COLORS.navyDeep}, ${COLORS.navy})` }}
      >
        <div className="flex items-center gap-2 text-white">
          <Building2 size={22} />
          <span className="font-semibold text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>ShiftLedger</span>
        </div>
        <div>
          <ClockGlyph />
          <h1 className="mt-8 text-4xl leading-tight text-white" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
            Every hour,<br />accounted for.
          </h1>
          <p className="mt-4 text-sm max-w-sm" style={{ color: "#B7C4D1" }}>
            Employees log their own check-in and check-out. Hours, overtime, and salary
            are worked out automatically — no more Excel sheets over WhatsApp.
          </p>
        </div>
        <p className="text-xs" style={{ color: "#7C8EA0" }}>Prototype build — for internal demonstration only.</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="md:hidden flex items-center gap-2 mb-8" style={{ color: COLORS.navy }}>
            <Building2 size={22} /><span className="font-semibold text-lg">ShiftLedger</span>
          </div>

          <div className="flex gap-1 mb-6 p-1 rounded-lg" style={{ background: "#EDEFF2" }}>
            {["login", "register"].map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="flex-1 py-2 text-sm font-medium rounded-md transition"
                style={{
                  background: mode === m ? COLORS.surface : "transparent",
                  color: mode === m ? COLORS.navy : COLORS.muted,
                  boxShadow: mode === m ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                }}
              >
                {m === "login" ? "Log in" : "Register"}
              </button>
            ))}
          </div>

          <h2 className="text-xl font-semibold mb-1" style={{ color: COLORS.navy, fontFamily: "'Space Grotesk', sans-serif" }}>
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="text-sm mb-6" style={{ color: COLORS.muted }}>
            {mode === "login" ? "Sign in to record or review attendance." : "Register with your work email to start logging attendance."}
          </p>

          <div className="flex flex-col gap-3">
            {mode === "register" && (
              <div>
                <label className="text-xs font-medium" style={{ color: COLORS.muted }}>Full name</label>
                <input
                  value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} onKeyDown={onEnter}
                  className="mt-1 w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ border: `1px solid ${COLORS.border}` }}
                  placeholder="Navodya Manamendra"
                />
              </div>
            )}
            <div>
              <label className="text-xs font-medium" style={{ color: COLORS.muted }}>Work email</label>
              <input
                type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} onKeyDown={onEnter}
                className="mt-1 w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ border: `1px solid ${COLORS.border}` }}
                placeholder="you@company.lk"
              />
            </div>
            <div>
              <label className="text-xs font-medium" style={{ color: COLORS.muted }}>Password</label>
              <input
                type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} onKeyDown={onEnter}
                className="mt-1 w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ border: `1px solid ${COLORS.border}` }}
                placeholder="••••••••"
              />
            </div>
            {mode === "register" && (
              <div>
                <label className="text-xs font-medium" style={{ color: COLORS.muted }}>Role (demo only)</label>
                <select
                  value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-lg text-sm outline-none bg-white"
                  style={{ border: `1px solid ${COLORS.border}` }}
                >
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </select>
                <p className="text-[11px] mt-1" style={{ color: COLORS.muted }}>
                  In a production system, only IT/HR would assign the admin role.
                </p>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg" style={{ background: COLORS.dangerSoft, color: COLORS.danger }}>
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <button
              type="button" onClick={submit} disabled={busy}
              className="mt-2 w-full py-2.5 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2"
              style={{ background: COLORS.navy }}
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : null}
              {mode === "login" ? "Log in" : "Create account"}
            </button>
          </div>

          <div className="mt-6 p-3 rounded-lg text-xs" style={{ background: "#EEF1F4", color: COLORS.muted }}>
            <b style={{ color: COLORS.navy }}>Demo accounts</b><br />
            Admin — admin@company.lk / admin123<br />
            Employee — navodya@company.lk / demo123
          </div>
          <p className="text-[11px] mt-3" style={{ color: COLORS.muted }}>
            Prototype notice: this demo stores data unencrypted and visible to anyone with this link. Do not use real passwords.
          </p>
          <button
            type="button"
            onClick={onReset}
            disabled={busy}
            className="text-[11px] mt-3 underline"
            style={{ color: COLORS.muted }}
          >
            Trouble logging in with the demo accounts? Reset demo data
          </button>
        </div>
      </div>
    </div>
  );
}

function ClockGlyph() {
  const ticks = Array.from({ length: 12 });
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
      <circle cx="60" cy="60" r="56" stroke="#3E5A72" strokeWidth="2" />
      {ticks.map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const x1 = 60 + Math.sin(angle) * 48, y1 = 60 - Math.cos(angle) * 48;
        const x2 = 60 + Math.sin(angle) * 54, y2 = 60 - Math.cos(angle) * 54;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#5E7C93" strokeWidth={i % 3 === 0 ? 2.5 : 1.5} />;
      })}
      <line x1="60" y1="60" x2="60" y2="30" stroke="#C6801F" strokeWidth="3" strokeLinecap="round" />
      <line x1="60" y1="60" x2="82" y2="66" stroke="#F5F6F8" strokeWidth="3" strokeLinecap="round" />
      <circle cx="60" cy="60" r="4" fill="#C6801F" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Attendance entry modal                                              */
/* ------------------------------------------------------------------ */
function EntryModal({ initial, onSave, onClose }) {
  const [date, setDate] = useState(initial?.date || todayStr());
  const [status, setStatus] = useState(initial?.status || "working");
  const [checkIn, setCheckIn] = useState(initial?.checkIn || "08:00");
  const [checkOut, setCheckOut] = useState(initial?.checkOut || "20:00");
  const [shiftType, setShiftType] = useState(initial?.shiftType || "day");
  const [err, setErr] = useState("");

  const preview = useMemo(() => {
    if (status === "off") return null;
    return computeEntry({ status: "working", checkIn, checkOut, shiftType });
  }, [status, checkIn, checkOut, shiftType]);

  const submit = () => {
    if (status === "working" && checkIn === checkOut) {
      setErr("Check-in and check-out cannot be the same time.");
      return;
    }
    onSave(date, status === "off" ? { status: "off" } : { status: "working", checkIn, checkOut, shiftType });
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ background: "rgba(11,27,41,0.45)" }}>
      <div className="w-full max-w-md rounded-2xl p-6" style={{ background: COLORS.surface }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg" style={{ color: COLORS.navy, fontFamily: "'Space Grotesk', sans-serif" }}>
            {initial ? "Edit attendance" : "Log attendance"}
          </h3>
          <button onClick={onClose}><X size={18} style={{ color: COLORS.muted }} /></button>
        </div>

        <label className="text-xs font-medium" style={{ color: COLORS.muted }}>Date</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={!!initial}
          className="mt-1 mb-3 w-full px-3 py-2 rounded-lg text-sm" style={{ border: `1px solid ${COLORS.border}` }} />

        <div className="flex gap-2 mb-3">
          {["working", "off"].map((s) => (
            <button key={s} onClick={() => setStatus(s)}
              className="flex-1 py-2 rounded-lg text-sm font-medium"
              style={{
                background: status === s ? COLORS.navy : "#EEF1F4",
                color: status === s ? "#fff" : COLORS.muted,
              }}>
              {s === "working" ? "Working day" : "Day off"}
            </button>
          ))}
        </div>

        {status === "working" && (
          <>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs font-medium" style={{ color: COLORS.muted }}>Check-in</label>
                <input type="time" value={checkIn} onChange={(e) => setCheckIn(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-lg text-sm" style={{ border: `1px solid ${COLORS.border}` }} />
              </div>
              <div>
                <label className="text-xs font-medium" style={{ color: COLORS.muted }}>Check-out</label>
                <input type="time" value={checkOut} onChange={(e) => setCheckOut(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-lg text-sm" style={{ border: `1px solid ${COLORS.border}` }} />
              </div>
            </div>
            <label className="text-xs font-medium" style={{ color: COLORS.muted }}>Shift type</label>
            <div className="flex gap-2 mt-1 mb-4">
              <button onClick={() => setShiftType("day")}
                className="flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5"
                style={{ background: shiftType === "day" ? COLORS.amberSoft : "#EEF1F4", color: shiftType === "day" ? COLORS.amber : COLORS.muted }}>
                <Sunrise size={14} /> Day shift
              </button>
              <button onClick={() => setShiftType("night")}
                className="flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5"
                style={{ background: shiftType === "night" ? COLORS.indigoSoft : "#EEF1F4", color: shiftType === "night" ? COLORS.indigo : COLORS.muted }}>
                <Moon size={14} /> Night shift
              </button>
            </div>

            {preview && (
              <div className="rounded-lg p-3 mb-3 text-sm" style={{ background: "#F7F8FA", border: `1px solid ${COLORS.border}` }}>
                <div className="flex justify-between"><span style={{ color: COLORS.muted }}>Hours worked</span><b>{fmtHours(preview.hours)}</b></div>
                <div className="flex justify-between"><span style={{ color: COLORS.muted }}>Overtime</span><b>{fmtHours(preview.ot)} ({shiftType === "day" ? "Day" : "Night"} OT)</b></div>
                <TimelineBar entry={preview} compact />
              </div>
            )}
          </>
        )}

        {err && <div className="text-xs mb-3" style={{ color: COLORS.danger }}>{err}</div>}

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm font-medium" style={{ background: "#EEF1F4", color: COLORS.muted }}>Cancel</button>
          <button onClick={submit} className="flex-1 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: COLORS.navy }}>Save entry</button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Employee attendance + salary view (used by employee, read-only for admin) */
/* ------------------------------------------------------------------ */
function EmployeeView({ name, records, settings, month, setMonth, readOnly, onAdd, onEdit, onDelete }) {
  const agg = monthAggregate(records, month);
  const sal = salaryFor(agg, settings);
  const monthEntries = Object.keys(records || {})
    .filter((k) => k.startsWith(month))
    .sort((a, b) => (a < b ? 1 : -1));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: COLORS.navy, fontFamily: "'Space Grotesk', sans-serif" }}>
            {name}'s attendance
          </h2>
          <p className="text-sm" style={{ color: COLORS.muted }}>Monthly hours, overtime and salary — calculated automatically.</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm" style={{ border: `1px solid ${COLORS.border}` }} />
          {!readOnly && (
            <button onClick={onAdd} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: COLORS.navy }}>
              <Plus size={15} /> Log entry
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Tile label="Working days" value={agg.workingDays} />
        <Tile label="Total hours" value={fmtHours(agg.hours)} accent={COLORS.teal} />
        <Tile label="Day OT" value={fmtHours(agg.dayOT)} accent={COLORS.amber} />
        <Tile label="Night OT" value={fmtHours(agg.nightOT)} accent={COLORS.indigo} />
        <Tile label="Estimated salary" value={fmtLKR(sal.gross)} sub={`Basic ${fmtLKR(sal.basic)} + OT ${fmtLKR(sal.otPay)}`} accent={COLORS.navy} />
      </div>

      <div className="rounded-xl p-4" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: COLORS.navy }}>Daily log</h3>
          <Legend />
        </div>
        {monthEntries.length === 0 ? (
          <p className="text-sm py-8 text-center" style={{ color: COLORS.muted }}>
            No attendance logged for this month yet{!readOnly ? " — use \u201cLog entry\u201d to add today's." : "."}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {monthEntries.map((key) => {
              const entry = computeEntry(records[key]);
              return (
                <div key={key} className="flex items-center gap-3 py-1.5">
                  <span className="text-xs w-20 shrink-0" style={{ color: COLORS.muted }}>{fmtDateLabel(key)}</span>
                  <TimelineBar entry={entry} compact />
                  <span className="text-xs w-16 text-right shrink-0" style={{ color: COLORS.navy }}>
                    {entry.status === "working" ? fmtHours(entry.hours) : "—"}
                  </span>
                  {!readOnly && (
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => onEdit(key, records[key])} className="p-1.5 rounded-md hover:bg-gray-100">
                        <Pencil size={13} style={{ color: COLORS.muted }} />
                      </button>
                      <button onClick={() => onDelete(key)} className="p-1.5 rounded-md hover:bg-gray-100">
                        <Trash2 size={13} style={{ color: COLORS.danger }} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Admin views                                                         */
/* ------------------------------------------------------------------ */
function AdminOverview({ users, allRecords, settings, month, setMonth }) {
  const employees = users.filter((u) => u.role === "employee");
  const rows = employees.map((u) => {
    const agg = monthAggregate(allRecords[u.email] || {}, month);
    const sal = salaryFor(agg, settings);
    return { ...u, agg, sal };
  });
  const totalHours = rows.reduce((s, r) => s + r.agg.hours, 0);
  const totalOT = rows.reduce((s, r) => s + r.agg.dayOT + r.agg.nightOT, 0);
  const totalPayroll = rows.reduce((s, r) => s + r.sal.gross, 0);
  const maxHours = Math.max(1, ...rows.map((r) => r.agg.hours));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: COLORS.navy, fontFamily: "'Space Grotesk', sans-serif" }}>Company overview</h2>
          <p className="text-sm" style={{ color: COLORS.muted }}>Attendance and payroll across the whole team.</p>
        </div>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm" style={{ border: `1px solid ${COLORS.border}` }} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile label="Employees" value={employees.length} />
        <Tile label="Total hours" value={fmtHours(totalHours)} accent={COLORS.teal} />
        <Tile label="Total OT hours" value={fmtHours(totalOT)} accent={COLORS.amber} />
        <Tile label="Payroll cost" value={fmtLKR(totalPayroll)} accent={COLORS.navy} />
      </div>

      <div className="rounded-xl p-4" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
        <h3 className="text-sm font-semibold mb-3" style={{ color: COLORS.navy }}>Hours worked by employee</h3>
        {rows.length === 0 && <p className="text-sm" style={{ color: COLORS.muted }}>No employees yet.</p>}
        <div className="flex flex-col gap-3">
          {rows.map((r) => (
            <div key={r.email} className="flex items-center gap-3">
              <span className="text-xs w-32 shrink-0 truncate" style={{ color: COLORS.navy }}>{r.name}</span>
              <div className="flex-1 h-5 rounded-md overflow-hidden" style={{ background: "#EEF0F3" }}>
                <div className="h-full" style={{ width: (r.agg.hours / maxHours) * 100 + "%", background: COLORS.teal }} />
              </div>
              <span className="text-xs w-14 text-right shrink-0" style={{ color: COLORS.muted }}>{fmtHours(r.agg.hours)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminEmployees({ users, allRecords, settings, month, onSelect, onRemove }) {
  const employees = users.filter((u) => u.role === "employee");
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: COLORS.navy, fontFamily: "'Space Grotesk', sans-serif" }}>Employees</h2>
        <p className="text-sm" style={{ color: COLORS.muted }}>Click a row to view that employee's attendance record.</p>
      </div>
      <div className="rounded-xl overflow-hidden" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "#F7F8FA", color: COLORS.muted }}>
              <th className="text-left font-medium px-4 py-2.5">Name</th>
              <th className="text-left font-medium px-4 py-2.5">Email</th>
              <th className="text-right font-medium px-4 py-2.5">Hours (mo.)</th>
              <th className="text-right font-medium px-4 py-2.5">OT (mo.)</th>
              <th className="text-right font-medium px-4 py-2.5">Est. salary</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {employees.map((u) => {
              const agg = monthAggregate(allRecords[u.email] || {}, month);
              const sal = salaryFor(agg, settings);
              return (
                <tr key={u.email} className="border-t cursor-pointer hover:bg-gray-50" style={{ borderColor: COLORS.border }} onClick={() => onSelect(u.email)}>
                  <td className="px-4 py-2.5" style={{ color: COLORS.navy }}>{u.name}</td>
                  <td className="px-4 py-2.5" style={{ color: COLORS.muted }}>{u.email}</td>
                  <td className="px-4 py-2.5 text-right">{fmtHours(agg.hours)}</td>
                  <td className="px-4 py-2.5 text-right">{fmtHours(agg.dayOT + agg.nightOT)}</td>
                  <td className="px-4 py-2.5 text-right font-medium" style={{ color: COLORS.navy }}>{fmtLKR(sal.gross)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={(e) => { e.stopPropagation(); onRemove(u.email); }} className="p-1.5 rounded-md hover:bg-red-50">
                      <Trash2 size={14} style={{ color: COLORS.danger }} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {employees.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center" style={{ color: COLORS.muted }}>No employees registered yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminPayroll({ users, allRecords, settings, month, setMonth }) {
  const employees = users.filter((u) => u.role === "employee");
  const rows = employees.map((u) => {
    const agg = monthAggregate(allRecords[u.email] || {}, month);
    const sal = salaryFor(agg, settings);
    return { ...u, agg, sal };
  });
  const totals = rows.reduce((t, r) => ({
    hours: t.hours + r.agg.hours,
    dayOT: t.dayOT + r.agg.dayOT,
    nightOT: t.nightOT + r.agg.nightOT,
    gross: t.gross + r.sal.gross,
  }), { hours: 0, dayOT: 0, nightOT: 0, gross: 0 });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: COLORS.navy, fontFamily: "'Space Grotesk', sans-serif" }}>Monthly payroll</h2>
          <p className="text-sm" style={{ color: COLORS.muted }}>Basic {fmtLKR(settings.basicSalary)} + Rs. {settings.otRate} per OT hour.</p>
        </div>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm" style={{ border: `1px solid ${COLORS.border}` }} />
      </div>
      <div className="rounded-xl overflow-hidden" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "#F7F8FA", color: COLORS.muted }}>
              <th className="text-left font-medium px-4 py-2.5">Employee</th>
              <th className="text-right font-medium px-4 py-2.5">Days</th>
              <th className="text-right font-medium px-4 py-2.5">Hours</th>
              <th className="text-right font-medium px-4 py-2.5">Day OT</th>
              <th className="text-right font-medium px-4 py-2.5">Night OT</th>
              <th className="text-right font-medium px-4 py-2.5">Basic</th>
              <th className="text-right font-medium px-4 py-2.5">OT pay</th>
              <th className="text-right font-medium px-4 py-2.5">Gross</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.email} className="border-t" style={{ borderColor: COLORS.border }}>
                <td className="px-4 py-2.5" style={{ color: COLORS.navy }}>{r.name}</td>
                <td className="px-4 py-2.5 text-right">{r.agg.workingDays}</td>
                <td className="px-4 py-2.5 text-right">{fmtHours(r.agg.hours)}</td>
                <td className="px-4 py-2.5 text-right">{fmtHours(r.agg.dayOT)}</td>
                <td className="px-4 py-2.5 text-right">{fmtHours(r.agg.nightOT)}</td>
                <td className="px-4 py-2.5 text-right">{fmtLKR(r.sal.basic)}</td>
                <td className="px-4 py-2.5 text-right">{fmtLKR(r.sal.otPay)}</td>
                <td className="px-4 py-2.5 text-right font-semibold" style={{ color: COLORS.navy }}>{fmtLKR(r.sal.gross)}</td>
              </tr>
            ))}
            {rows.length > 0 && (
              <tr className="border-t" style={{ borderColor: COLORS.border, background: "#F7F8FA" }}>
                <td className="px-4 py-2.5 font-semibold" style={{ color: COLORS.navy }}>Total</td>
                <td className="px-4 py-2.5"></td>
                <td className="px-4 py-2.5 text-right font-semibold">{fmtHours(totals.hours)}</td>
                <td className="px-4 py-2.5 text-right font-semibold">{fmtHours(totals.dayOT)}</td>
                <td className="px-4 py-2.5 text-right font-semibold">{fmtHours(totals.nightOT)}</td>
                <td className="px-4 py-2.5"></td>
                <td className="px-4 py-2.5"></td>
                <td className="px-4 py-2.5 text-right font-bold" style={{ color: COLORS.navy }}>{fmtLKR(totals.gross)}</td>
              </tr>
            )}
            {rows.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center" style={{ color: COLORS.muted }}>No employees registered yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminSettings({ settings, onSave }) {
  const [basic, setBasic] = useState(settings.basicSalary);
  const [rate, setRate] = useState(settings.otRate);
  const [saved, setSaved] = useState(false);
  return (
    <div className="flex flex-col gap-5 max-w-md">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: COLORS.navy, fontFamily: "'Space Grotesk', sans-serif" }}>Payroll settings</h2>
        <p className="text-sm" style={{ color: COLORS.muted }}>These values apply to every employee's salary calculation.</p>
      </div>
      <div className="rounded-xl p-4 flex flex-col gap-4" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
        <div>
          <label className="text-xs font-medium" style={{ color: COLORS.muted }}>Basic monthly salary (Rs.)</label>
          <input type="number" value={basic} onChange={(e) => { setBasic(Number(e.target.value)); setSaved(false); }}
            className="mt-1 w-full px-3 py-2 rounded-lg text-sm" style={{ border: `1px solid ${COLORS.border}` }} />
        </div>
        <div>
          <label className="text-xs font-medium" style={{ color: COLORS.muted }}>OT rate per hour (Rs.)</label>
          <input type="number" value={rate} onChange={(e) => { setRate(Number(e.target.value)); setSaved(false); }}
            className="mt-1 w-full px-3 py-2 rounded-lg text-sm" style={{ border: `1px solid ${COLORS.border}` }} />
        </div>
        <button
          onClick={() => { onSave({ basicSalary: basic, otRate: rate }); setSaved(true); }}
          className="py-2 rounded-lg text-sm font-semibold text-white" style={{ background: COLORS.navy }}
        >
          Save settings
        </button>
        {saved && <span className="text-xs" style={{ color: COLORS.teal }}>Saved — applies to all employees immediately.</span>}
      </div>
      <p className="text-[11px]" style={{ color: COLORS.muted }}>
        Prototype note: Day OT and Night OT currently share the same rate. A production version could add a night-shift multiplier here.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main app                                                            */
/* ------------------------------------------------------------------ */
export default function App() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [settings, setSettings] = useState({ basicSalary: BASIC_DEFAULT, otRate: OT_RATE_DEFAULT });
  const [allRecords, setAllRecords] = useState({});
  const [session, setSession] = useState(null);
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [adminTab, setAdminTab] = useState("overview");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [month, setMonth] = useState(currentMonthStr());
  const [modalOpen, setModalOpen] = useState(false);
  const [modalEdit, setModalEdit] = useState(null);

  const notify = useCallback((message, kind = "success") => {
    setToast({ message, kind });
    setTimeout(() => setToast(null), 2600);
  }, []);

  const loadAll = useCallback(async () => {
    let u = await sGet("aht-users", true);
    let s = await sGet("aht-settings", true);
    if (!Array.isArray(u)) u = [];
    const seed = buildSeed();

    // Guarantee the demo accounts always exist, even if shared storage
    // previously ended up empty, partial, or corrupted. This never
    // overwrites accounts that were genuinely registered later.
    let changed = false;
    seed.users.forEach((su) => {
      if (!u.some((x) => x.email && x.email.toLowerCase() === su.email.toLowerCase())) {
        u.push(su);
        changed = true;
      }
    });
    if (!s || typeof s.basicSalary !== "number" || typeof s.otRate !== "number") {
      s = seed.settings;
      changed = true;
    }
    if (changed) {
      await sSet("aht-users", u, true);
      await sSet("aht-settings", s, true);
    }

    const r = {};
    for (const user of u) {
      if (user.role === "employee") {
        let rec = await sGet(`aht-records:${user.email}`, true);
        if (!rec && seed.records[user.email]) {
          rec = seed.records[user.email];
          await sSet(`aht-records:${user.email}`, rec, true);
        }
        r[user.email] = rec || {};
      }
    }
    return { u, s, r };
  }, []);

  useEffect(() => {
    (async () => {
      const { u, s, r } = await loadAll();
      setUsers(u); setSettings(s); setAllRecords(r);

      const sess = await sGet("aht-session", false);
      if (sess) {
        const found = u.find((x) => x.email === sess.email);
        if (found) {
          setSession(found);
          const keys = Object.keys(r[found.email] || {});
          if (keys.length) setMonth(keys.sort().slice(-1)[0].slice(0, 7));
        }
      }
      setLoading(false);
    })();
  }, [loadAll]);

  const resetDemoData = async () => {
    setAuthBusy(true);
    const seed = buildSeed();
    await sDelete("aht-users", true);
    await sDelete("aht-settings", true);
    for (const email of Object.keys(seed.records)) {
      await sDelete(`aht-records:${email}`, true);
    }
    await sDelete("aht-session", false);
    const { u, s, r } = await loadAll();
    setUsers(u); setSettings(s); setAllRecords(r);
    setSession(null);
    setAuthBusy(false);
    setAuthError("");
    notify("Demo data reset. Try logging in again.");
  };

  const handleLogin = async (email, password) => {
    setAuthError(""); setAuthBusy(true);
    const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    setAuthBusy(false);
    if (!found) { setAuthError("Invalid email or password."); return; }
    setSession(found);
    await sSet("aht-session", { email: found.email }, false);
    const keys = Object.keys(allRecords[found.email] || {});
    if (keys.length) setMonth(keys.sort().slice(-1)[0].slice(0, 7));
    notify(`Welcome back, ${found.name.split(" ")[0]}.`);
  };

  const handleRegister = async (email, password, name, role) => {
    setAuthError("");
    if (!email || !password || !name) { setAuthError("Please fill in all fields."); return; }
    if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
      setAuthError("An account with this email already exists."); return;
    }
    setAuthBusy(true);
    const newUser = { email, password, name, role };
    const newUsers = [...users, newUser];
    await sSet("aht-users", newUsers, true);
    if (role === "employee") await sSet(`aht-records:${email}`, {}, true);
    setUsers(newUsers);
    setAllRecords((prev) => ({ ...prev, [email]: {} }));
    setAuthBusy(false);
    setSession(newUser);
    await sSet("aht-session", { email }, false);
    notify("Account created — you're logged in.");
  };

  const handleLogout = async () => {
    setSession(null);
    await sDelete("aht-session", false);
  };

  const saveEntry = async (date, data) => {
    const email = session.email;
    const updated = { ...(allRecords[email] || {}), [date]: data };
    setAllRecords((prev) => ({ ...prev, [email]: updated }));
    await sSet(`aht-records:${email}`, updated, true);
    setModalOpen(false); setModalEdit(null);
    notify("Attendance saved.");
  };

  const deleteEntry = async (date) => {
    const email = session.email;
    const updated = { ...(allRecords[email] || {}) };
    delete updated[date];
    setAllRecords((prev) => ({ ...prev, [email]: updated }));
    await sSet(`aht-records:${email}`, updated, true);
    notify("Entry removed.");
  };

  const removeEmployee = async (email) => {
    const newUsers = users.filter((u) => u.email !== email);
    setUsers(newUsers);
    await sSet("aht-users", newUsers, true);
    await sDelete(`aht-records:${email}`, true);
    if (selectedEmployee === email) setSelectedEmployee(null);
    notify("Employee removed.");
  };

  const saveSettings = async (s) => {
    setSettings(s);
    await sSet("aht-settings", s, true);
    notify("Payroll settings updated.");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: COLORS.bg }}>
        <Loader2 className="animate-spin" size={28} style={{ color: COLORS.navy }} />
      </div>
    );
  }

  if (!session) {
    return (
      <AuthScreen
        onLogin={handleLogin}
        onRegister={handleRegister}
        onReset={resetDemoData}
        error={authError}
        busy={authBusy}
      />
    );
  }

  const isAdmin = session.role === "admin";
  const navItems = isAdmin
    ? [
        { id: "overview", label: "Overview", icon: Home },
        { id: "employees", label: "Employees", icon: Users },
        { id: "payroll", label: "Payroll", icon: TrendingUp },
        { id: "settings", label: "Settings", icon: Settings },
      ]
    : [{ id: "dashboard", label: "Dashboard", icon: Home }];

  return (
    <div className="min-h-screen flex" style={{ background: COLORS.bg, fontFamily: "'Inter', sans-serif" }}>
      <style>{FONT_IMPORT}</style>
      <Toast message={toast?.message} kind={toast?.kind} />

      {/* Sidebar */}
      <aside className="w-56 shrink-0 hidden md:flex flex-col justify-between p-5" style={{ background: COLORS.sidebar }}>
        <div>
          <div className="flex items-center gap-2 text-white mb-8 px-1">
            <Building2 size={20} />
            <span className="font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>ShiftLedger</span>
          </div>
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isAdmin ? adminTab === item.id : true;
              return (
                <button
                  key={item.id}
                  onClick={() => { if (isAdmin) { setAdminTab(item.id); setSelectedEmployee(null); } }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-left"
                  style={{
                    background: active ? "rgba(255,255,255,0.08)" : "transparent",
                    color: active ? "#fff" : "#93A6B8",
                  }}
                >
                  <Icon size={16} /> {item.label}
                </button>
              );
            })}
          </nav>
        </div>
        <div className="px-1">
          <div className="flex items-center gap-2 mb-3 text-xs" style={{ color: "#93A6B8" }}>
            <ShieldCheck size={14} /> {isAdmin ? "Admin" : "Employee"}
          </div>
          <div className="text-sm font-medium text-white truncate">{session.name}</div>
          <div className="text-xs mb-3 truncate" style={{ color: "#6E839A" }}>{session.email}</div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-xs font-medium" style={{ color: "#B7C4D1" }}>
            <LogOut size={13} /> Log out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3" style={{ background: COLORS.sidebar }}>
        <span className="text-white font-semibold text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>ShiftLedger</span>
        <button onClick={handleLogout}><LogOut size={16} style={{ color: "#fff" }} /></button>
      </div>

      {/* Main content */}
      <main className="flex-1 p-5 md:p-8 mt-12 md:mt-0 overflow-x-hidden">
        {isAdmin ? (
          selectedEmployee ? (
            <div>
              <button onClick={() => setSelectedEmployee(null)} className="text-sm mb-4 flex items-center gap-1" style={{ color: COLORS.muted }}>
                <ChevronDown className="rotate-90" size={14} /> Back to employees
              </button>
              <EmployeeView
                name={users.find((u) => u.email === selectedEmployee)?.name}
                records={allRecords[selectedEmployee] || {}}
                settings={settings}
                month={month}
                setMonth={setMonth}
                readOnly
              />
            </div>
          ) : adminTab === "overview" ? (
            <AdminOverview users={users} allRecords={allRecords} settings={settings} month={month} setMonth={setMonth} />
          ) : adminTab === "employees" ? (
            <AdminEmployees users={users} allRecords={allRecords} settings={settings} month={month} onSelect={setSelectedEmployee} onRemove={removeEmployee} />
          ) : adminTab === "payroll" ? (
            <AdminPayroll users={users} allRecords={allRecords} settings={settings} month={month} setMonth={setMonth} />
          ) : (
            <AdminSettings settings={settings} onSave={saveSettings} />
          )
        ) : (
          <EmployeeView
            name={session.name}
            records={allRecords[session.email] || {}}
            settings={settings}
            month={month}
            setMonth={setMonth}
            onAdd={() => { setModalEdit(null); setModalOpen(true); }}
            onEdit={(date, rec) => { setModalEdit({ date, ...rec }); setModalOpen(true); }}
            onDelete={deleteEntry}
          />
        )}
      </main>

      {modalOpen && (
        <EntryModal
          initial={modalEdit}
          onSave={saveEntry}
          onClose={() => { setModalOpen(false); setModalEdit(null); }}
        />
      )}
    </div>
  );
}
