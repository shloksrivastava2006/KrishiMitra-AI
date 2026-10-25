import { useEffect, useState } from 'react';
import api from '../../services/api.js';

// What the server has switched on: Google / Apple buttons and which OTP channels work. Asked once per page load.
let cached = null;
let pending = null;
const load = () => (pending ||= api.get('/auth/config').then((r) => (cached = r.data.data)).catch(() => { pending = null; return null; }));

export function useAuthConfig() {
  const [cfg, setCfg] = useState(cached);
  useEffect(() => {
    if (cached) return undefined;
    let live = true;
    load().then((c) => { if (live && c) setCfg(c); });
    return () => { live = false; };
  }, []);
  return cfg;
}
