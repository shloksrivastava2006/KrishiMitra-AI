// Picks a finished Crop Doctor check back up after the page was reloaded while it was running
// (for example because the site language was changed). Pure functions, so they can be tested without a browser.
export const RECOVER_MS = 3 * 60 * 1000;   // how long after pressing Check we still look for the answer
export const POLL_MS = 3000;

// pending = { at: ms timestamp of pressing Check, lastId: id of the newest saved check at that moment, or null }
export const isRecoverable = (pending, now = Date.now()) => Boolean(pending) && Number.isFinite(pending.at) && now - pending.at < RECOVER_MS;

// The saved check that appeared since pressing Check, or null if the answer has not arrived yet.
export function findNewCheck(list, pending) {
  const top = Array.isArray(list) ? list[0] : null;
  if (!top || !pending) return null;
  if (pending.lastId) return top.id !== pending.lastId ? top : null;
  // History was empty or not loaded when Check was pressed: accept a check saved at or after that moment (5 s of clock difference allowed).
  return new Date(top.createdAt).getTime() >= pending.at - 5000 ? top : null;
}
