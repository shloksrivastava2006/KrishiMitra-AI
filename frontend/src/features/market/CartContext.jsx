import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';

const CartContext = createContext(null);
const keyFor = (id) => `krishimitra_cart_${id || 'guest'}`;
const read = (id) => { try { const v = JSON.parse(localStorage.getItem(keyFor(id)) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };

// The cart is display data only (name, price, qty). The server re-prices everything when the order is placed.
export function CartProvider({ children }) {
  const { user, loading } = useAuth();
  const [state, setState] = useState({ owner: undefined, items: [] });

  // Switch cart when the signed-in user changes. Logging out removes that user's saved cart from this device.
  useEffect(() => {
    if (loading) return;
    const id = user?.id || 'guest';
    setState((prev) => {
      if (prev.owner === id) return prev;
      if (prev.owner && prev.owner !== 'guest' && id === 'guest') { try { localStorage.removeItem(keyFor(prev.owner)); } catch { /* ignore */ } return { owner: id, items: [] }; }
      let items = read(id);
      if (id !== 'guest' && items.length === 0) { items = read('guest'); try { localStorage.removeItem(keyFor('guest')); } catch { /* ignore */ } }  // keep what a visitor added before logging in
      return { owner: id, items };
    });
  }, [user?.id, loading]);

  useEffect(() => {
    if (!state.owner) return;
    try { localStorage.setItem(keyFor(state.owner), JSON.stringify(state.items)); } catch { /* ignore */ }
  }, [state]);

  const setItems = useCallback((fn) => setState((s) => ({ ...s, items: typeof fn === 'function' ? fn(s.items) : fn })), []);
  const value = useMemo(() => {
    const items = state.items;
    return {
      items, count: items.reduce((n, i) => n + i.qty, 0), total: items.reduce((n, i) => n + i.qty * i.price, 0),
      sellerId: items[0]?.sellerId,
      add: (p, qty = 1, replace = false) => setItems((cur) => {
        const base = replace || (cur[0] && cur[0].sellerId !== p.sellerId) ? [] : cur;
        const found = base.find((i) => i.id === p.id);
        const next = Math.min(p.stock, (found?.qty || 0) + qty);
        const line = { id: p.id, name: p.name, price: p.price, unit: p.unit, stock: p.stock, category: p.category, sellerId: p.sellerId, sellerName: p.sellerName, codOnly: Boolean(p.codOnly), qty: next };
        return found ? base.map((i) => (i.id === p.id ? line : i)) : [...base, line];
      }),
      setQty: (id, qty) => setItems((cur) => cur.map((i) => (i.id === id ? { ...i, qty: Math.max(1, Math.min(i.stock, Number(qty) || 1)) } : i))),
      remove: (id) => setItems((cur) => cur.filter((i) => i.id !== id)),
      refresh: (items) => setItems(items),
      clear: () => setItems([]),
    };
  }, [state.items, setItems]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
export const useCart = () => useContext(CartContext);
