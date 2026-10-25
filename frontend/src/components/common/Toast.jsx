import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const ToastContext = createContext({ notify: () => {} });

export function ToastProvider({ children }) {
  const [msg, setMsg] = useState(null);
  const timer = useRef();
  const notify = useCallback((text, tone = 'ok') => {
    setMsg({ text, tone });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 5000);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-16 z-50 flex justify-center px-4">
        {msg && <p role="status" className={`pointer-events-auto rounded-lg px-4 py-2 text-sm shadow-lg ${msg.tone === 'warn' ? 'bg-gold-light text-forest-dark' : 'bg-forest text-white'}`}>{msg.text}</p>}
      </div>
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);
