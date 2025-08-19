export function fmtDist(m) { if (!m) return '0.00 mi'; const mi = m / 1609.344; return mi.toFixed(2) + ' mi'; }
export function fmtDur(s) {
  if (!s) return '00:00:00';
  const hh = Math.floor(s / 3600).toString().padStart(2,'0');
  const mm = Math.floor((s%3600)/60).toString().padStart(2,'0');
  const ss = Math.floor(s%60).toString().padStart(2,'0');
  return `${hh}:${mm}:${ss}`;
}
