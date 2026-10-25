import { useEffect, useState } from 'react';
import api, { errorMessage } from '../../services/api.js';

export function useApi(path, version = 0) {
  const [state, setState] = useState({ data: null, error: '' });
  useEffect(() => {
    let live = true;
    api.get(path).then((r) => live && setState({ data: r.data.data, error: '' })).catch((e) => live && setState({ data: null, error: errorMessage(e) }));
    return () => { live = false; };
  }, [path, version]);
  return state;
}
