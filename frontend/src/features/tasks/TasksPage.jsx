import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarDays, Check, Plus, Trash2 } from 'lucide-react';
import api, { errorMessage } from '../../services/api.js';
import Field from '../../components/common/Field.jsx';
import { ErrorBox, Loading, PageTitle } from '../../components/common/ui.jsx';
import { crops as knownCrops } from '../../constants/content.js';

export const TASK_CATEGORIES = { sowing: 'Sowing', irrigation: 'Irrigation', fertilizer: 'Fertilizer', spraying: 'Spraying', weeding: 'Weeding', harvest: 'Harvest', other: 'Other' };
const todayIso = () => new Date().toISOString().slice(0, 10);
const dayDiff = (iso) => Math.round((new Date(`${iso.slice(0, 10)}T00:00:00`) - new Date(`${todayIso()}T00:00:00`)) / 86400000);

function DueBadge({ date }) {
  const d = dayDiff(date);
  if (d < 0) return <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">Overdue by {-d} day{d === -1 ? '' : 's'}</span>;
  if (d === 0) return <span className="rounded-full bg-gold-light px-2 py-0.5 text-xs font-semibold text-forest-dark">Due today</span>;
  if (d === 1) return <span className="rounded-full bg-gold-light/70 px-2 py-0.5 text-xs font-semibold text-forest-dark">Tomorrow</span>;
  return null;
}

function TaskRow({ task, onToggle, onDelete }) {
  return (
    <li className={`card flex items-start gap-3 p-4 ${task.done ? 'opacity-60' : ''}`}>
      <button type="button" role="checkbox" aria-checked={task.done} aria-label={`${task.done ? 'Mark not done' : 'Mark done'}: ${task.title}`} onClick={() => onToggle(task)}
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${task.done ? 'border-forest bg-forest text-white' : 'border-earth/40 hover:border-forest'}`}>
        {task.done && <Check className="h-4 w-4" aria-hidden="true" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={`font-semibold ${task.done ? 'line-through' : ''}`}>{task.title}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink/65">
          {task.crop && <span className="font-semibold text-forest">{task.crop}</span>}
          <span className="rounded bg-earth-light px-2 py-0.5 font-medium">{TASK_CATEGORIES[task.category] || 'Other'}</span>
          <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />{task.dueDate.slice(0, 10)}</span>
          {!task.done && <DueBadge date={task.dueDate} />}
        </p>
        {task.notes && <p className="mt-1 text-sm text-ink/60">{task.notes}</p>}
      </div>
      <button type="button" onClick={() => onDelete(task)} aria-label={`Delete task: ${task.title}`} className="text-ink/40 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
    </li>
  );
}

export default function TasksPage() {
  const [params, setParams] = useSearchParams();
  // /my-tasks?title=...&crop=...&category=irrigation&date=2026-10-25 opens with the form already filled (used by the irrigation advisor).
  const [form, setForm] = useState(() => ({ title: params.get('title') || '', crop: params.get('crop') || '', category: TASK_CATEGORIES[params.get('category')] ? params.get('category') : 'irrigation', dueDate: params.get('date') || todayIso(), notes: params.get('notes') || '' }));
  const [tasks, setTasks] = useState(null); const [myCrops, setMyCrops] = useState([]);
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false);

  const load = useCallback(() => api.get('/tasks').then((r) => setTasks(r.data.data)).catch((e) => setError(errorMessage(e))), []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get('/crops').then((r) => setMyCrops([...new Set(r.data.data.map((c) => c.name))])).catch(() => {}); }, []);
  useEffect(() => { if (params.get('title')) setParams({}, { replace: true }); }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault(); setError(''); setSaving(true);
    try {
      await api.post('/tasks', { ...form, crop: form.crop.trim() || undefined, notes: form.notes.trim() || undefined });
      setForm((f) => ({ ...f, title: '', notes: '' })); await load();
    } catch (err) { setError(errorMessage(err)); } finally { setSaving(false); }
  };
  const toggle = async (t) => { try { await api.patch(`/tasks/${t._id}`, { done: !t.done }); await load(); } catch (err) { setError(errorMessage(err)); } };
  const remove = async (t) => { if (!window.confirm(`Delete "${t.title}"?`)) return; try { await api.delete(`/tasks/${t._id}`); await load(); } catch (err) { setError(errorMessage(err)); } };

  const active = (tasks || []).filter((t) => !t.done); const done = (tasks || []).filter((t) => t.done);
  const late = active.filter((t) => dayDiff(t.dueDate) < 0).length;
  const cropOptions = [...new Set([...myCrops, ...knownCrops.map((c) => c.name)])];

  return (
    <div>
      <PageTitle>Farm reminders and tasks</PageTitle>
      <ErrorBox>{error}</ErrorBox>
      <div className="mt-3 grid gap-6 lg:grid-cols-[24rem_1fr]">
        <form onSubmit={submit} className="card space-y-3 self-start">
          <p className="text-xs font-semibold uppercase tracking-wide text-forest">Farm activity manager</p>
          <h2 className="font-display text-2xl font-bold">Schedule farm task</h2>
          <p className="text-sm text-ink/65">Create reminders for sowing, spraying, irrigation, fertilizer and harvest dates.</p>
          <Field id="t-title" label="Task description"><input id="t-title" required minLength={2} maxLength={120} className="input" value={form.title} onChange={set('title')} placeholder="e.g. Neem oil organic spray" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="t-crop" label="Crop name">
              <input id="t-crop" list="t-crops" maxLength={80} className="input" value={form.crop} onChange={set('crop')} placeholder="e.g. Wheat plot A" />
              <datalist id="t-crops">{cropOptions.map((c) => <option key={c} value={c} />)}</datalist>
            </Field>
            <Field id="t-cat" label="Category"><select id="t-cat" className="input" value={form.category} onChange={set('category')}>{Object.entries(TASK_CATEGORIES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
          </div>
          <Field id="t-date" label="Target date"><input id="t-date" type="date" required className="input" value={form.dueDate} onChange={set('dueDate')} /></Field>
          <Field id="t-notes" label="Notes (optional)"><textarea id="t-notes" rows={2} maxLength={500} className="input" value={form.notes} onChange={set('notes')} placeholder="Dosage, weather considerations..." /></Field>
          <button className="btn-primary w-full" disabled={saving}><Plus className="h-4 w-4" aria-hidden="true" /> {saving ? 'Saving...' : 'Add task to calendar'}</button>
        </form>

        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-display text-2xl font-bold">Active crop tasks and alerts</h2>
            <p className="text-sm font-semibold text-ink/55">{active.length} scheduled</p>
          </div>
          {late > 0 && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-800">{late} task{late === 1 ? ' is' : 's are'} overdue. Do them or move the date.</p>}
          {!tasks ? <Loading /> : active.length === 0 ? <p className="card text-sm text-ink/65">No tasks scheduled. Add your first reminder, for example the next irrigation or spray date.</p> : (
            <ul className="space-y-3">{active.map((t) => <TaskRow key={t._id} task={t} onToggle={toggle} onDelete={remove} />)}</ul>
          )}
          {done.length > 0 && (
            <details className="mt-6">
              <summary className="cursor-pointer text-sm font-semibold text-ink/70">Completed ({done.length})</summary>
              <ul className="mt-3 space-y-3">{done.map((t) => <TaskRow key={t._id} task={t} onToggle={toggle} onDelete={remove} />)}</ul>
            </details>
          )}
        </section>
      </div>
    </div>
  );
}
