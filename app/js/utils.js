// utils.js — helpers purs, sans état, sans dépendance.

/** Génère un identifiant unique (UUID v4 si dispo, sinon fallback). */
export function uuid() {
  if (globalThis.crypto && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback simple (suffisant pour des ids locaux d'un seul appareil).
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const pad2 = (n) => String(n).padStart(2, '0');

/**
 * ISO 8601 avec l'offset local de l'appareil (ex. "2026-06-20T12:34:56+02:00").
 * Les téléphones étant réglés sur l'heure française, l'offset = Europe/Paris.
 */
export function nowISO(date = new Date()) {
  const tzMin = -date.getTimezoneOffset(); // minutes à l'est de UTC
  const sign = tzMin >= 0 ? '+' : '-';
  const abs = Math.abs(tzMin);
  return (
    `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}` +
    `T${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}` +
    `${sign}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`
  );
}

/** Date locale au format "YYYY-MM-DD" pour grouper par jour. */
export function dateJour(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Centimes (entier) → chaîne "9,50 €". */
export function formatEuros(centimes) {
  const sign = centimes < 0 ? '-' : '';
  const abs = Math.abs(Math.round(centimes));
  const euros = Math.floor(abs / 100);
  const cents = abs % 100;
  return `${sign}${euros},${pad2(cents)} €`;
}

/** Heure locale "HH:MM" à partir d'un horodatage ISO. */
export function formatHeure(iso) {
  const d = new Date(iso);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Heure (0-23) à partir d'un horodatage ISO — pour le bilan par créneau. */
export function heureDe(iso) {
  return new Date(iso).getHours();
}

/** Échappe une valeur pour un champ CSV (RFC 4180). */
export function csvCell(value) {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
