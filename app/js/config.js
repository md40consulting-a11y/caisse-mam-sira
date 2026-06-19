// config.js — configuration du poste (nom de l'appareil), persistée en localStorage.
// Demandée une seule fois au premier lancement (écran 0).

const LS_KEY = 'caisse_config_v1';

/** Retourne le nom du poste, ou null si pas encore configuré. */
export function getPoste() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const cfg = JSON.parse(raw);
    return cfg.poste || null;
  } catch (_) {
    return null;
  }
}

/** Enregistre le nom du poste (trim, non vide). Retourne le nom enregistré. */
export function setPoste(nom) {
  const poste = String(nom || '').trim();
  if (!poste) throw new Error('Nom de poste vide');
  localStorage.setItem(LS_KEY, JSON.stringify({ poste }));
  return poste;
}

/** Vrai si le poste est déjà configuré. */
export function isConfigured() {
  return getPoste() !== null;
}
