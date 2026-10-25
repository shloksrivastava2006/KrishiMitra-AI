import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Leaf, Mic, ScanSearch, Sparkles, Trash2, UploadCloud, X, Check, Languages, FileText, Stethoscope } from 'lucide-react';
import api, { errorMessage } from '../../services/api.js';
import { crops } from '../../constants/content.js';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { GOOGLE_LANGS } from '../../i18n/googleTranslate.js';
import { POLL_MS, findNewCheck, isRecoverable } from './recovery.js';
import ResultPanel from './ResultPanel.jsx';
import { CHIPS, addPhrase } from './diseaseView.js';

const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIDE = 1024;                  // smaller photos upload and analyse faster; plenty for leaf detail
const MAX_UPLOAD = 4.5 * 1024 * 1024;

// Shrinks the photo in the browser before upload: faster on mobile data, and re-encoding drops EXIF data such as GPS position.
async function shrink(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = reject; i.src = url; });
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale); canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode'))), 'image/jpeg', 0.8));
  } finally { URL.revokeObjectURL(url); }
}

// Languages the answer can be written in: English, Hindi and every language the site offers (names in their own script).
// The backend's REPLY_LANGUAGES has the same codes; a backend test keeps the two in step.
const REPLY_LANGS = [['en', 'English'], ['hi', 'हिन्दी'], ...GOOGLE_LANGS.map((l) => [l.code, l.label])];   // 'auto' (same language as the message) is added on the page
const PARTS = ['leaf', 'stem', 'fruit', 'flower', 'root', 'whole']; const STAGES = ['seedling', 'vegetative', 'flowering', 'fruiting', 'harvest'];
// Voice typing languages (browser speech recognition). Other languages fall back to Hindi.
const VOICE = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN', gu: 'gu-IN', pa: 'pa-IN', bn: 'bn-IN', ta: 'ta-IN', te: 'te-IN', kn: 'kn-IN', ml: 'ml-IN', or: 'or-IN', ur: 'ur-IN', ne: 'ne-NP' };
const Recognition = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : undefined;
const REPLY_KEY = 'krishimitra_reply_lang';
const MIN_TEXT = 2; const MAX_TEXT = 600;   // a few words are enough: the farmer always gets an answer
const savedReply = () => { try { const v = localStorage.getItem(REPLY_KEY); return v === 'auto' || REPLY_LANGS.some(([c]) => c === v) ? v : null; } catch { return null; } };

// Changing the site language reloads the page, which would throw away a check in progress. These two small notes in
// sessionStorage (this tab only) let the page restore what was typed and pick the finished answer up from history.
const DRAFT_KEY = 'krishimitra_disease_draft'; const PENDING_KEY = 'krishimitra_disease_pending';
const readJson = (key) => { try { return JSON.parse(sessionStorage.getItem(key)) || null; } catch { return null; } };
const writeJson = (key, value) => { try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* storage blocked */ } };
const clearKey = (key) => { try { sessionStorage.removeItem(key); } catch { /* storage blocked */ } };

const FIELD = 'input';

function Tab({ id, mode, setMode, icon: Icon, title, sub, badge }) {
  return (
    <button type="button" role="tab" aria-selected={mode === id} onClick={() => setMode(id)}
      className={`flex-1 rounded-t-xl px-4 py-3 text-left ${mode === id ? 'bg-white shadow-sm' : 'bg-forest/5 text-ink/70 hover:bg-forest/10'}`}>
      <span className="flex items-center gap-2 text-sm font-bold"><Icon className="h-4 w-4" aria-hidden="true" /> {title}{badge && <span className="rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{badge}</span>}</span>
      <span className="mt-0.5 block text-xs font-normal text-ink/60">{sub}</span>
    </button>
  );
}

export default function DiseasePage() {
  const { t, displayLang } = useI18n();
  const [enabled, setEnabled] = useState(null);
  const [mode, setMode] = useState('photo');                  // 'photo' | 'text': which input is on show; both can be used together
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [dragging, setDragging] = useState(false);
  const [crop, setCrop] = useState(() => readJson(DRAFT_KEY)?.crop || '');
  const [part, setPart] = useState(''); const [stage, setStage] = useState('');
  const [symptoms, setSymptoms] = useState(() => readJson(DRAFT_KEY)?.symptoms || '');
  const [replyLang, setReplyLang] = useState(savedReply);     // null = the same language as the message
  const reply = replyLang || 'auto';
  const [busy, setBusy] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [error, setError] = useState('');
  const [current, setCurrent] = useState(null);
  const [quick, setQuick] = useState(null);
  const [history, setHistory] = useState(null);
  const [resultImg, setResultImg] = useState('');             // the photo that was checked, kept only on this screen
  const [listening, setListening] = useState(false);
  const inputRef = useRef(null); const cameraRef = useRef(null); const recRef = useRef(null);
  const run = useRef(0);
  const finished = useRef(false);
  const resultRef = useRef(null);

  const loadHistory = useCallback(() => api.get('/disease/history').then((r) => { setHistory(r.data.data); return r.data.data; }).catch(() => { setHistory([]); return []; }), []);
  useEffect(() => {
    api.get('/disease/status').then((r) => setEnabled(r.data.data.enabled)).catch(() => setEnabled(null));   // the page works either way
    loadHistory();
  }, [loadHistory]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => () => { if (resultImg) URL.revokeObjectURL(resultImg); }, [resultImg]);
  useEffect(() => () => recRef.current?.abort?.(), []);
  useEffect(() => { writeJson(DRAFT_KEY, { crop, symptoms }); }, [crop, symptoms]);
  // On a narrow screen the result sits below the form: bring it into view when it arrives.
  useEffect(() => { if ((current || quick) && window.matchMedia?.('(max-width: 1279px)').matches) resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [current?.id, Boolean(quick)]);   // eslint-disable-line react-hooks/exhaustive-deps

  // After a reload in the middle of a check (for example the site language was changed), fetch the finished answer from history.
  useEffect(() => {
    const p = readJson(PENDING_KEY);
    if (!p) return undefined;
    if (!isRecoverable(p)) { clearKey(PENDING_KEY); return undefined; }
    let live = true; let timer;
    setRecovering(true);
    const poll = async () => {
      let list = [];
      try { list = (await api.get('/disease/history')).data.data; } catch { /* try again */ }
      if (!live) return;
      const found = findNewCheck(list, p);
      if (found) { setHistory(list); setCurrent(found); setRecovering(false); clearKey(PENDING_KEY); return; }
      if (!isRecoverable(p)) { setRecovering(false); clearKey(PENDING_KEY); setError(t('disease.recoverFailed')); return; }
      timer = setTimeout(poll, POLL_MS);
    };
    poll();
    return () => { live = false; clearTimeout(timer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const take = (f) => {
    setError(''); setCurrent(null); setQuick(null);
    if (!f) return;
    if (!TYPES.includes(f.type)) { setError(t('disease.badType')); return; }
    setFile(f); setPreview(URL.createObjectURL(f));
  };
  const pick = (e) => { take(e.target.files?.[0]); e.target.value = ''; };
  const dropped = (e) => { e.preventDefault(); setDragging(false); take(e.dataTransfer?.files?.[0]); };
  const clearPhoto = () => { setFile(null); setPreview(''); };

  const chooseReply = (code) => { setReplyLang(code); try { localStorage.setItem(REPLY_KEY, code); } catch { /* storage blocked */ } };
  // With "same language as my message" and no message (photo only), answer in the language the site is shown in.
  const supported = REPLY_LANGS.some(([c]) => c === displayLang) ? displayLang : 'en';
  const textLen = [...symptoms.trim()].length;
  const hasInput = Boolean(file) || textLen >= MIN_TEXT;

  const listen = () => {
    if (!Recognition) { setError(t('disease.micNone')); return; }
    if (listening) { recRef.current?.stop(); return; }
    const rec = new Recognition();
    rec.lang = VOICE[reply === 'auto' ? supported : reply] || 'hi-IN'; rec.interimResults = false; rec.maxAlternatives = 1;
    rec.onresult = (e) => { const said = e.results?.[0]?.[0]?.transcript; if (said) setSymptoms((s) => addPhrase(s, said, MAX_TEXT)); };
    rec.onend = () => setListening(false); rec.onerror = () => setListening(false);
    recRef.current = rec; setListening(true);
    try { rec.start(); } catch { setListening(false); }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!hasInput) { setError(t('disease.needInput')); return; }
    const mine = ++run.current; finished.current = false;
    setBusy(true); setError(''); setCurrent(null); setQuick(null);
    setResultImg(file ? URL.createObjectURL(file) : '');
    const words = symptoms.trim();
    const language = reply === 'auto' && !words ? supported : reply;
    // 1. Instant guidance from the built-in knowledge (no waiting for the AI). It never blocks the real check below.
    if (words) {
      api.post('/disease/quick', { crop: crop || undefined, symptoms: words, language: reply }, { timeout: 10000 })
        .then((r) => { if (run.current === mine && !finished.current) setQuick(r.data.data.result); })
        .catch(() => { /* the full check still runs */ });
    }
    // 2. The full check. If the page reloads now, the answer is saved on the server and picked up again on load.
    writeJson(PENDING_KEY, { at: Date.now(), lastId: history?.[0]?.id || null });
    try {
      const fd = new FormData();
      if (file) {
        let blob;
        try { blob = await shrink(file); } catch { setError(t('disease.badRead')); clearKey(PENDING_KEY); return; }
        if (blob.size > MAX_UPLOAD) { setError(t('disease.tooBig')); clearKey(PENDING_KEY); return; }
        fd.append('image', blob, 'leaf.jpg');
      }
      fd.append('language', language); if (crop) fd.append('crop', crop); if (part) fd.append('plantPart', part); if (stage) fd.append('stage', stage); if (words) fd.append('symptoms', words);
      const res = await api.post('/disease/diagnose', fd, { timeout: 45000 });
      finished.current = true;
      if (run.current === mine) { setCurrent(res.data.data); setQuick(null); }
      clearKey(PENDING_KEY); loadHistory();
    } catch (err) { finished.current = true; clearKey(PENDING_KEY); setError(errorMessage(err)); } finally { if (run.current === mine) setBusy(false); }
  };

  const remove = async (item) => {
    if (!window.confirm(t('disease.confirmDelete'))) return;
    try { await api.delete(`/disease/history/${item.id}`); if (current?.id === item.id) setCurrent(null); loadHistory(); } catch (err) { setError(errorMessage(err)); }
  };

  const shown = current || (quick ? { result: quick } : null);
  const shownCrop = current?.crop ?? crop;
  const select = (id, label, value, set, options) => (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <select id={id} className={FIELD} value={value} onChange={(e) => set(e.target.value)}>{options}</select>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Hero */}
      <header className="no-print relative overflow-hidden rounded-2xl bg-gradient-to-br from-forest-dark via-forest to-forest-light p-6 text-white sm:p-8">
        <Leaf className="pointer-events-none absolute -right-6 -top-6 h-48 w-48 rotate-12 text-white/5" aria-hidden="true" />
        <div className="relative grid gap-6 lg:grid-cols-[1fr_16rem] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">{t('disease.title')}</h1>
              <span className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1 text-xs font-semibold text-forest-dark"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> {t('disease.poweredBy')}</span>
            </div>
            <p className="mt-2 max-w-xl text-white/90">{t('disease.heroSub')}</p>
            <ul className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
              {['pill1', 'pill2', 'pill3', 'pill4'].map((k) => <li key={k} className="rounded-lg bg-white/10 px-3 py-1.5">{t(`disease.${k}`)}</li>)}
            </ul>
          </div>
          <ul className="hidden space-y-1.5 rounded-xl bg-black/20 p-4 text-sm lg:block">
            {['check1', 'check2', 'check3', 'check4'].map((k) => <li key={k} className="flex items-center gap-2"><Check className="h-4 w-4 text-leaf" aria-hidden="true" /> {t(`disease.${k}`)}</li>)}
          </ul>
        </div>
      </header>

      {enabled === false && <p role="status" className="no-print mt-4 rounded-lg bg-gold-light p-3 text-sm">{t('disease.notSetUp')}</p>}

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,4fr)_minmax(0,6fr)]">
        {/* Input */}
        <form onSubmit={submit} className="no-print">
          <div role="tablist" className="flex gap-1">
            <Tab id="photo" mode={mode} setMode={setMode} icon={Camera} title={t('disease.tabPhoto')} sub={t('disease.tabPhotoSub')} />
            <Tab id="text" mode={mode} setMode={setMode} icon={FileText} title={t('disease.tabText')} sub={t('disease.tabTextSub')} badge={t('disease.newBadge')} />
          </div>
          <div className="card space-y-5 rounded-t-none">
            <input ref={inputRef} type="file" accept={TYPES.join(',')} onChange={pick} className="sr-only" tabIndex={-1} aria-hidden="true" />
            <input ref={cameraRef} type="file" accept={TYPES.join(',')} capture="environment" onChange={pick} className="sr-only" tabIndex={-1} aria-hidden="true" />

            {mode === 'photo' && (
              <div>
                <h2 className="flex items-center gap-2 text-base font-semibold"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-forest text-xs text-white">1</span> {t('disease.step1')}</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <button type="button" onClick={() => inputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={dropped}
                    className={`flex min-h-[10rem] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed p-4 text-center ${dragging ? 'border-forest bg-leaf-light' : 'border-leaf/60 bg-leaf-light/30 hover:bg-leaf-light/60'}`}>
                    <UploadCloud className="h-9 w-9 text-forest" aria-hidden="true" />
                    <span className="text-sm font-semibold">{dragging ? t('disease.dropNow') : t('disease.dragDrop')}</span>
                    <span className="text-xs text-ink/60">{t('disease.orClick')}</span>
                    <span className="mt-1 text-[11px] text-ink/50">{t('disease.supports')}</span>
                  </button>
                  {preview ? (
                    <div className="space-y-2">
                      <div className="relative">
                        <img src={preview} alt="" className="h-40 w-full rounded-xl border border-earth/15 object-cover" />
                        <button type="button" onClick={clearPhoto} aria-label={t('disease.removeImg')} className="absolute right-2 top-2 rounded-full bg-white/90 p-1 shadow"><X className="h-4 w-4" aria-hidden="true" /></button>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" className="btn-outline flex-1 px-2 py-1.5 text-xs" onClick={() => inputRef.current?.click()}>{t('disease.replace')}</button>
                        <button type="button" className="flex-1 rounded-lg border border-red-300 px-2 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50" onClick={clearPhoto}><Trash2 className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />{t('disease.removeImg')}</button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" className="btn-outline min-h-[10rem] flex-col" onClick={() => cameraRef.current?.click()}><Camera className="h-7 w-7" aria-hidden="true" /> {t('disease.choosePhoto')}</button>
                  )}
                </div>
                <p className="mt-2 text-xs text-ink/60">{t('disease.tips')}</p>
              </div>
            )}

            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-forest text-xs text-white">{mode === 'photo' ? 2 : 1}</span> {t('disease.step2')}</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
                {select('d-crop', t('disease.cropLabel'), crop, setCrop, <><option value="">{t('disease.cropOther')}</option>{crops.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}</>)}
                {select('d-part', t('disease.partLabel'), part, setPart, <><option value="">{t('disease.notSpecified')}</option>{PARTS.map((p) => <option key={p} value={p}>{t(`disease.part_${p}`)}</option>)}</>)}
                {select('d-stage', t('disease.stageLabel'), stage, setStage, <><option value="">{t('disease.notSpecified')}</option>{STAGES.map((s) => <option key={s} value={s}>{t(`disease.stage_${s}`)}</option>)}</>)}
              </div>
              <div className="mt-3 sm:max-w-xs">
                <label htmlFor="d-reply" className="label flex items-center gap-1"><Languages className="h-4 w-4" aria-hidden="true" /> {t('disease.replyLang')}</label>
                <select id="d-reply" className={FIELD} value={reply} onChange={(e) => chooseReply(e.target.value)}>
                  <option value="auto">{t('disease.langAuto')}</option>
                  {REPLY_LANGS.map(([c, name]) => <option key={c} value={c}>{name}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="d-symptoms" className="label">{mode === 'text' ? t('disease.describeLabel') : t('disease.extraLabel')}</label>
              <div className="relative">
                <textarea id="d-symptoms" rows={mode === 'text' ? 4 : 3} maxLength={MAX_TEXT} className={`${FIELD} pr-12`} value={symptoms} onChange={(e) => setSymptoms(e.target.value)} placeholder={mode === 'text' ? t('disease.symptomsEx') : t('disease.extraPh')} />
                <button type="button" onClick={listen} aria-label={listening ? t('disease.micStop') : t('disease.mic')} aria-pressed={listening}
                  className={`absolute right-2 top-2 rounded-full p-2 ${listening ? 'animate-pulse bg-red-500 text-white' : 'bg-leaf-light text-forest hover:bg-leaf/30'}`}><Mic className="h-4 w-4" aria-hidden="true" /></button>
              </div>
              <p className="mt-1 flex justify-between gap-3 text-xs text-ink/60"><span>{t('disease.symptomsHelp')}</span><span aria-hidden="true" translate="no">{textLen}/{MAX_TEXT}</span></p>
              {mode === 'text' && (
                <>
                  <div className="mt-3 rounded-lg bg-sky-50 p-3 text-sm">
                    <p className="font-semibold text-sky-800">{t('disease.exampleTitle')}:</p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-5 text-ink/80"><li>{t('disease.example1')}</li><li>{t('disease.example2')}</li></ul>
                  </div>
                  <p className="mt-3 text-sm font-semibold">{t('disease.chipsTitle')}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {CHIPS.map((c) => <button key={c} type="button" onClick={() => setSymptoms((s) => addPhrase(s, t(`disease.chip_${c}`), MAX_TEXT))} className="rounded-full border border-earth/20 bg-white px-3 py-1.5 text-xs font-medium hover:bg-leaf-light">{t(`disease.chip_${c}`)}</button>)}
                  </div>
                </>
              )}
            </div>

            {error && <p key={error} role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
            {/* The label sits in a keyed span: when the page translator rewrites the text, React swaps the whole span instead of editing a text node that is no longer there. */}
            <button className="btn-primary w-full py-3 text-base" disabled={!hasInput || busy}><Sparkles className="h-5 w-5" aria-hidden="true" /><span key={busy ? 'busy' : 'idle'}>{busy ? t('disease.analysing') : mode === 'photo' ? t('disease.analyseDisease') : t('disease.analyseSymptoms')}</span></button>
          </div>
        </form>

        {/* Result */}
        <div className="min-w-0 scroll-mt-40" ref={resultRef}>
          {recovering && !shown && <p role="status" className="mb-4 rounded-lg bg-leaf-light/60 p-3 text-sm">{t('disease.recovering')}</p>}
          {shown ? (
            <ResultPanel key={current ? current.id || 'current' : 'quick'} data={shown} pending={Boolean(quick) && !current && busy} image={resultImg} crop={shownCrop} replyLang={reply} />
          ) : (
            <div className="card flex min-h-[20rem] flex-col items-center justify-center gap-2 text-center text-ink/60">
              {busy ? <Sparkles className="h-10 w-10 animate-pulse text-forest" aria-hidden="true" /> : <ScanSearch className="h-10 w-10 text-leaf" aria-hidden="true" />}
              <p className="font-semibold text-ink/80">{busy ? t('disease.analysing') : t('disease.emptyTitle')}</p>
              {!busy && <p className="max-w-xs text-sm">{t('disease.emptyText')}</p>}
            </div>
          )}
        </div>
      </div>

      <section className="no-print mt-10">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><Stethoscope className="h-5 w-5 text-forest" aria-hidden="true" /> {t('disease.history')}</h2>
        {history && history.length === 0 && <p className="mt-2 text-sm text-ink/70">{t('disease.noHistory')}</p>}
        <ul className="mt-3 grid gap-2 md:grid-cols-2">
          {(history || []).map((h) => (
            <li key={h.id} className="card flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium" translate={h.result.lang && h.result.lang !== 'en' ? 'no' : undefined}>{h.result.diseaseName || h.result.possibleCauses?.[0]?.name || t(`disease.a_${h.result.assessment || 'unclear'}`)}</p>
                <p className="text-ink/60">{new Date(h.createdAt).toLocaleDateString('en-IN')}{h.crop ? ` | ${h.crop}` : ''}</p>
                {h.symptoms && <p className="mt-0.5 max-w-md truncate text-ink/60" translate="no">{h.symptoms}</p>}
              </div>
              <div className="flex gap-2">
                <button type="button" className="btn-outline px-3 py-1.5" onClick={() => { setQuick(null); setResultImg(''); setCurrent(h); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>{t('disease.view')}</button>
                <button type="button" className="text-ink/50 hover:text-red-700" aria-label={t('disease.remove')} onClick={() => remove(h)}><Trash2 className="h-4 w-4" /></button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
