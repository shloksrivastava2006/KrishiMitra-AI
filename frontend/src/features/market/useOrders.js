import { useCallback, useEffect, useState } from 'react';
import api, { errorMessage } from '../../services/api.js';

export function useOrders(path) {
  const [orders, setOrders] = useState(null); const [error, setError] = useState('');
  const load = useCallback(() => api.get(path).then((r) => setOrders(r.data.data)).catch((e) => setError(errorMessage(e))), [path]);
  useEffect(() => { load(); }, [load]);
  return { orders, error, setError, load };
}
