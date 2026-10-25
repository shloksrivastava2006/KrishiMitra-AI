// Which link in the green bar is "current". The marketplace and "Fresh produce" share a path, so the ?type=produce part decides between them.
// A link also counts as current on pages below it (for example /marketplace/<id> or /crops/wheat).
export function navActive(to, pathname, search = '') {
  const [path, query] = to.split('?');
  if (!(pathname === path || pathname.startsWith(`${path}/`))) return false;
  if (path !== '/marketplace') return true;
  const produce = new URLSearchParams(search).get('type') === 'produce';
  return query ? produce : !produce;
}
