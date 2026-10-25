import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Bug, Download, Info, Leaf, Send, Share2, ShieldCheck, Sparkles, Stethoscope, FlaskConical } from 'lucide-react';
import api from '../../services/api.js';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { confidenceTone, shareText, viewOf } from './diseaseView.js';

const TABS = ['overview', 'symptoms', 'causes', 'treatment', 'prevention', 'more'];

// One coloured card, like the cards in the design: icon, title, then a paragraph or a bullet list.
function Card({ tone, icon: Icon, title, children, wide = false }) {
  return (
    <section className={`print-card rounded-xl p-4 ${tone} ${wide ? 'sm:col-span-2' : ''}`}>
      <h3 className="flex items-center gap-2 font-sans text-sm font-bold text-ink"><Icon className="h-4 w-4" aria-hidden="true" /> {title}</h3>
      <div className="mt-2 text-sm text-ink/85">{children}</div>
    </section>
  );
}
const Bullets = ({ items, ai }) => <ul className="list-disc space-y-1 pl-5">{items.map((s, i) => <li key={`${i}-${s}`} {...ai}>{s}</li>)}</ul>;

export default function ResultPanel({ data, pending = false, image = '', crop = '', replyLang = 'auto' }) {
  const { t, lang } = useI18n();
  const r = data.result; const v = viewOf(r);
  const [tab, setTab] = useState('overview');
  const [shareMsg, setShareMsg] = useState('');
  // The answer is already written in the language the farmer chose, so the page translator must leave it alone.
  const ai = r.lang && r.lang !== 'en' ? { translate: 'no' } : {};
  useEffect(() => { setTab('overview'); setShareMsg(''); }, [data.id, pending]);

  const share = async () => {
    const text = shareText(r, crop);
    try {
      if (navigator.share) await navigator.share({ title: 'KrishiMitra AI Crop Doctor', text });
      else { await navigator.clipboard.writeText(text); setShareMsg(t('disease.shareCopied')); }
    } catch { /* cancelled or blocked */ }
  };
  const when = data.createdAt ? new Date(data.createdAt) : new Date();
  const rows = [
    [t('disease.cropRow'), crop || v.plant, Leaf], [t('disease.partRow'), v.plantPart, Leaf],
    [t('disease.typeRow'), v.type ? t(`disease.cat_${v.type}`) : null, Bug], [t('disease.sciRow'), v.scientificName, FlaskConical],
  ].filter((x) => x[1]);
  const show = (name) => tab === 'overview' || tab === name;

  return (
    <section className="card space-y-4 print:border-0 print:shadow-none" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><Sparkles className="h-5 w-5 text-forest" aria-hidden="true" /> {t('disease.resultHeading')}</h2>
        <div className="no-print flex flex-wrap items-center gap-2 text-sm">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${pending ? 'bg-gold-light text-earth' : 'bg-leaf-light text-forest'}`}>{pending ? t('disease.quickBadge') : t('disease.complete')}</span>
          <button type="button" className="btn-outline px-3 py-1.5" onClick={() => window.print()}><Download className="h-4 w-4" aria-hidden="true" /> {t('disease.download')}</button>
          <button type="button" className="btn-outline px-3 py-1.5" onClick={share}><Share2 className="h-4 w-4" aria-hidden="true" /> {t('disease.share')}</button>
        </div>
      </div>
      <p className="text-xs text-ink/55" translate="no">{when.toLocaleString(lang === 'hi' ? 'hi-IN' : 'en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
      {shareMsg && <p role="status" className="rounded-lg bg-leaf-light/70 p-2 text-xs">{shareMsg}</p>}
      {r.summary && <p className="rounded-lg bg-leaf-light/60 p-3 text-sm" {...ai}>{r.summary}</p>}
      {pending && <p role="status" className="rounded-lg bg-gold-light/60 p-3 text-sm">{t('disease.aiPending')}</p>}
      {!pending && r.source === 'basic' && <p className="rounded-lg bg-gold-light/60 p-3 text-sm">{r.photoNotChecked ? t('disease.photoNotChecked') : t('disease.aiFallback')}</p>}
      {!pending && r.source !== 'basic' && r.basis === 'description' && <p className="rounded-lg bg-gold-light/60 p-3 text-sm">{t('disease.basisDescription')}</p>}
      {r.imageUsable === false && <p className="rounded-lg bg-gold-light p-3 text-sm"><strong>{t('disease.imageIssue')}.</strong> <span {...ai}>{r.imageIssue}</span></p>}

      <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
        <div className="flex h-40 items-center justify-center overflow-hidden rounded-xl border border-earth/15 bg-leaf-light/50 sm:h-full sm:min-h-[9rem]">
          {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <span className="flex flex-col items-center gap-1 text-xs text-ink/50"><Leaf className="h-8 w-8 text-leaf" aria-hidden="true" />{t('disease.noPhoto')}</span>}
        </div>
        <div className="rounded-xl bg-rose-50 p-4">
          <p className="text-xs font-semibold text-rose-700">{t('disease.mostLikely')}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="font-display text-xl font-bold text-forest-dark" {...ai}>{v.name || t(`disease.a_${r.assessment || 'unclear'}`)}</p>
            {v.confidence != null && <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${confidenceTone(v.confidence)}`}>{t('disease.confidence', { n: v.confidence })}</span>}
          </div>
          <dl className="mt-3 space-y-1 text-sm">
            {rows.map(([k, val]) => <div key={k} className="flex gap-2"><dt className="text-ink/60">{k}:</dt><dd className="font-medium" {...(k === t('disease.typeRow') ? {} : ai)}>{val}</dd></div>)}
          </dl>
        </div>
      </div>

      <div role="tablist" aria-label={t('disease.resultHeading')} className="no-print flex gap-2 overflow-x-auto pb-1">
        {TABS.map((id) => (
          <button key={id} role="tab" type="button" aria-selected={tab === id} onClick={() => setTab(id)}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium ${tab === id ? 'border-forest bg-forest text-white' : 'border-earth/20 bg-white text-ink/80 hover:bg-leaf-light'}`}>{t(`disease.tab_${id}`)}</button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {show('overview') && v.overview && <Card tone="bg-amber-50" icon={Info} title={t('disease.card_overview')} wide={tab !== 'overview'}><p {...ai}>{v.overview}</p></Card>}
        {show('symptoms') && v.symptoms.length > 0 && <Card tone="bg-emerald-50" icon={Leaf} title={t('disease.card_symptoms')} wide={tab !== 'overview'}><Bullets items={v.symptoms} ai={ai} /></Card>}
        {show('causes') && v.causes.length > 0 && <Card tone="bg-orange-50" icon={AlertTriangle} title={t('disease.card_causes')} wide={tab !== 'overview'}><Bullets items={v.causes} ai={ai} /></Card>}
        {show('treatment') && v.treatment.length > 0 && <Card tone="bg-sky-50" icon={Stethoscope} title={t('disease.card_treatment')} wide={tab !== 'overview'}><Bullets items={v.treatment} ai={ai} /></Card>}
        {show('prevention') && v.prevention.length > 0 && <Card tone="bg-lime-50" icon={ShieldCheck} title={t('disease.card_prevention')} wide={tab !== 'overview'}><Bullets items={v.prevention} ai={ai} /></Card>}
        {(tab === 'overview' || tab === 'more') && (
          <Card tone="bg-yellow-50" icon={AlertTriangle} title={t('disease.card_note')} wide={tab !== 'overview'}>
            <p {...ai}>{v.note || t('disease.noteDefault')}</p>
            {tab === 'more' && v.getHelpIf && <p className="mt-2"><strong>{t('disease.getHelp')}:</strong> <span {...ai}>{v.getHelpIf}</span></p>}
          </Card>
        )}
        {tab === 'more' && v.questions.length > 0 && <Card tone="bg-white border border-earth/15" icon={Info} title={t('disease.questions')} wide><Bullets items={v.questions} ai={ai} /></Card>}
      </div>
      <p className="rounded-lg bg-leaf-light/60 p-3 text-xs text-ink/75">{t('disease.disclaimer')}</p>
      <AskBox key={data.id || 'live'} r={r} v={v} crop={crop} replyLang={replyLang} />
    </section>
  );
}

// "Ask the AI more": short follow-up questions about the result on screen. Spelling mistakes and any language are fine.
function AskBox({ r, v, crop, replyLang }) {
  const { t } = useI18n();
  const [q, setQ] = useState(''); const [chat, setChat] = useState([]); const [busy, setBusy] = useState(false);
  const end = useRef(null);
  useEffect(() => { end.current?.scrollIntoView?.({ block: 'nearest' }); }, [chat, busy]);
  const suggestions = v.followUps.length ? v.followUps : [t('disease.sug1'), t('disease.sug2'), t('disease.sug3')];
  const send = async (text) => {
    const question = String(text ?? q).trim();
    if (question.length < 2 || busy) return;
    setChat((c) => [...c, { who: 'you', text: question }]); setQ(''); setBusy(true);
    try {
      const res = await api.post('/disease/ask', { question, disease: v.name || undefined, crop: crop || undefined, language: replyLang }, { timeout: 25000 });
      setChat((c) => [...c, { who: 'ai', text: res.data.data.text }]);
    } catch { setChat((c) => [...c, { who: 'err', text: t('disease.askFailed') }]); } finally { setBusy(false); }
  };
  return (
    <div className="no-print rounded-xl border border-earth/15 p-4">
      <h3 className="flex items-center gap-2 font-sans text-sm font-bold"><Sparkles className="h-4 w-4 text-forest" aria-hidden="true" /> {t('disease.askTitle')}</h3>
      {chat.length > 0 && (
        <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto text-sm" aria-live="polite">
          {chat.map((m, i) => (
            <li key={i} className={`rounded-lg p-3 ${m.who === 'you' ? 'ml-8 bg-leaf-light/70' : m.who === 'err' ? 'bg-red-50 text-red-800' : 'mr-8 bg-gold-light/50'}`}>
              <span className="mb-0.5 block text-xs font-semibold text-ink/55">{m.who === 'you' ? t('disease.askYou') : t('disease.askAI')}</span>
              <span translate="no" className="whitespace-pre-line">{m.text}</span>
            </li>
          ))}
          {busy && <li className="mr-8 rounded-lg bg-gold-light/50 p-3 text-ink/60">{t('disease.askThinking')}</li>}
          <li ref={end} aria-hidden="true" />
        </ul>
      )}
      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <input className="input" value={q} maxLength={300} onChange={(e) => setQ(e.target.value)} placeholder={t('disease.askPh')} aria-label={t('disease.askTitle')} />
        <button className="btn-primary shrink-0" disabled={busy || q.trim().length < 2} aria-label={t('disease.askSend')}><Send className="h-4 w-4" aria-hidden="true" /></button>
      </form>
      <p className="mt-3 text-xs font-semibold text-ink/60">{t('disease.suggested')}</p>
      <div className="mt-1 flex flex-wrap gap-2">
        {suggestions.map((s) => <button key={s} type="button" disabled={busy} onClick={() => send(s)} className="rounded-full border border-earth/20 bg-white px-3 py-1 text-xs hover:bg-leaf-light disabled:opacity-60"><span {...(r.lang && r.lang !== 'en' ? { translate: 'no' } : {})}>{s}</span></button>)}
      </div>
    </div>
  );
}
