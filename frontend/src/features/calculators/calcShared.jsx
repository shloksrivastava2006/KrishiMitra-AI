import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../../services/api.js';

export const fmt = (n) => Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
export const UNITS = ['acre', 'hectare', 'sqm', 'sqft', 'bigha'];

export function useCalculator(path) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const run = async (payload) => {
    setError(''); setResult(null);
    try { setResult((await api.post(`/calculator/${path}`, payload)).data); } catch (e) { setError(errorMessage(e)); }
  };
  return { result, error, run };
}

export const ErrorText = ({ text }) => (text ? <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{text}</p> : null);

// One calculator on its own page: title, one line of help, the tool, and a way back to the list.
export function CalcPage({ title, intro, children }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link to="/calculators" className="text-sm font-semibold text-forest underline">&larr; All calculators</Link>
      <h1 className="mt-3 text-3xl font-bold">{title}</h1>
      <p className="mt-2 text-ink/70">{intro}</p>
      <div className="mt-6">{children}</div>
      <p className="mt-4 text-xs text-ink/55">Results use the numbers you enter. They are calculations, not agronomic advice.</p>
    </div>
  );
}
