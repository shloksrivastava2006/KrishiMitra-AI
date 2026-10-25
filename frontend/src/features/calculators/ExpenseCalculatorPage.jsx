import { useState } from 'react';
import { Link } from 'react-router-dom';
import Field from '../../components/common/Field.jsx';
import { CalcPage, ErrorText, fmt, useCalculator } from './calcShared.jsx';

// Quick add-up of farm costs. To keep a record over time and see profit or loss, farmers use Farm expenses.
export default function ExpenseCalculatorPage() {
  const { result, error, run } = useCalculator('expenses');
  const [form, setForm] = useState({ seeds: '', fertilizers: '', labour: '', irrigation: '', machinery: '', other: '' });
  return (
    <CalcPage title="Farm expense calculator" intro="Add up your farm costs for a season in rupees.">
      <form className="card space-y-3" onSubmit={(e) => { e.preventDefault(); run(form); }}>
        <div className="grid grid-cols-2 gap-3">
          {Object.keys(form).map((k) => (
            <Field key={k} id={`exp-${k}`} label={k[0].toUpperCase() + k.slice(1)}>
              <input id={`exp-${k}`} type="number" min="0" step="any" className="input" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
            </Field>
          ))}
        </div>
        <button className="btn-primary">Add up</button>
        <ErrorText text={error} />
        {result && <p className="rounded-lg bg-leaf-light p-3 text-sm">Total: <strong>Rs. {fmt(result.data.total)}</strong></p>}
      </form>
      <p className="mt-4 text-sm text-ink/70">Want to save every expense and see your profit or loss? Use <Link to="/my-expenses" className="font-semibold text-forest underline">Farm expenses</Link> (farmer login).</p>
    </CalcPage>
  );
}
