import test from 'node:test';
import assert from 'node:assert/strict';
import { basicGuidance } from '../../services/basicGuidance.js';

const allText = (r) => [r.summary, r.getHelpIf, ...r.nextSteps, ...r.questions, ...r.possibleCauses.flatMap((c) => [c.name, c.signs])].join(' | ');

test('"genhu ka paudha pila ho raha hai" (Hindi in English letters) gets wheat-specific, safe guidance', () => {
  const r = basicGuidance({ symptoms: 'genhu ka paudha pila ho raha hai' });
  assert.equal(r.source, 'basic'); assert.equal(r.plant, 'Wheat'); assert.equal(r.assessment, 'possible_issue');
  assert.match(r.possibleCauses[0].name, /nitrogen/i); assert.equal(r.possibleCauses[0].likelihood, 'medium');
  assert.ok(r.possibleCauses.slice(0, 3).some((c) => /rust/i.test(c.name)), 'wheat yellowing should consider rust');
  assert.match(r.summary, /wheat/); assert.match(r.summary, /not a confirmed diagnosis/);
  assert.ok(r.nextSteps.length <= 5); assert.match(r.nextSteps.at(-1), /KVK/);
  assert.equal(r.questions.length, 3);
});

test('Hindi in Devanagari, answered in Hindi; other languages get English', () => {
  const hi = basicGuidance({ symptoms: 'गेहूं के पत्ते पीले पड़ रहे हैं', language: 'hi' });
  assert.equal(hi.lang, 'hi'); assert.equal(hi.plant, 'गेहूँ'); assert.match(hi.summary, /गेहूँ/); assert.match(hi.possibleCauses[0].name, /नाइट्रोजन/);
  assert.doesNotMatch(allText(hi), /\b(rust|nitrogen|leaves|fertiliser|drainage)\b/i);
  const ta = basicGuidance({ symptoms: 'wheat leaves yellow', language: 'ta' });
  assert.equal(ta.lang, 'en'); assert.match(ta.summary, /wheat/);
});

test('a message with no recognisable problem still gets a reply: what is needed, plus safe checks', () => {
  for (const m of ['hello', 'help', '??', 'what can you do']) {
    const r = basicGuidance({ symptoms: m });
    assert.equal(r.assessment, 'unclear'); assert.equal(r.possibleCauses.length, 0);
    assert.ok(r.summary.length > 20); assert.equal(r.questions.length, 3); assert.ok(r.nextSteps.length >= 3);
  }
});

test('photo only (AI unavailable): says so and keeps the photo tips', () => {
  const r = basicGuidance({ hasPhoto: true });
  assert.equal(r.photoNotChecked, true); assert.match(r.summary, /photo/i);
});

test('two symptoms together both get a hearing', () => {
  const r = basicGuidance({ symptoms: 'wheat yellow and wilting' });
  const names = r.possibleCauses.map((c) => c.name).join(' ');
  assert.match(names, /nitrogen/i); assert.match(names, /water stress|root/i);
});

test('word matching: whole words for English, so "tiptoe" and "whitefly" do not trigger the wrong pattern', () => {
  assert.equal(basicGuidance({ symptoms: 'tiptoe' }).assessment, 'unclear');
  const wf = basicGuidance({ symptoms: 'whitefly on cotton' });
  assert.ok(wf.possibleCauses.some((c) => /insect|virus/i.test(c.name)));
  assert.ok(!wf.possibleCauses.some((c) => /powdery/i.test(c.name)));
});

test('never names a product or a dose, never says "high", never more than 3 causes and 5 steps', () => {
  const samples = ['yellow leaves', 'brown spots on leaves', 'white powder on leaves', 'rust stripes', 'plant is wilting', 'insects and holes', 'stunted growth', 'leaf tips burnt',
    'पत्तियाँ पीली', 'पत्तियों पर धब्बे', 'फफूंद', 'रतुआ', 'पौधा मुरझा रहा', 'कीड़े', 'बढ़वार रुक गई', 'किनारे जल गए', 'gehu pila dhabbe keede murjha'];
  for (const language of ['en', 'hi']) for (const symptoms of samples) {
    const r = basicGuidance({ symptoms, language });
    assert.ok(r.possibleCauses.length <= 3 && r.nextSteps.length <= 5, symptoms);
    assert.ok(!r.possibleCauses.some((c) => c.likelihood === 'high'), symptoms);
    for (const piece of [r.summary, r.getHelpIf, ...r.nextSteps, ...r.questions, ...r.possibleCauses.flatMap((c) => [c.name, c.signs])]) assert.ok(typeof piece === 'string' && piece.length > 3, `${symptoms}: empty text`);
    const text = allText(r);
    assert.doesNotMatch(text, /\d+\s?(ml|mg|g|kg|l|litre|gm)\b/i, `${symptoms}: dose`);
    assert.doesNotMatch(text, /mancozeb|chlorpyrifos|imidacloprid|carbendazim|copper oxychloride|\burea\b|\bdap\b|\bnpk\b|neem/i, `${symptoms}: product name`);
  }
});

test('crop from the dropdown is used even if the message does not name it', () => {
  assert.equal(basicGuidance({ crop: 'Tomato', symptoms: 'brown spots' }).plant, 'Tomato');
});

test('spelling mistakes: wrong letters, missing letters and swapped letters still find the problem', () => {
  const cases = [
    ['genhu ka paudha pilaa ho rha hai', /nitrogen/i, 'Wheat'], ['gehun ke pate pele ho rahe hain dhabe bhi hain', /nitrogen/i, 'Wheat'],
    ['wheat leavs yelow', /nitrogen/i, 'Wheat'], ['tomato leaf spts and blihgt', /leaf spot/i, 'Tomato'], ['tamater murjha gaya', /water stress|root/i, 'Tomato'],
    ['cotton whitefy keeda', /insect|virus/i, 'Cotton'], ['plant is wlit', /water stress|root/i, null],
  ];
  for (const [symptoms, cause, plant] of cases) {
    const r = basicGuidance({ symptoms });
    assert.equal(r.plant, plant, symptoms); assert.match(r.possibleCauses.map((c) => c.name).join(' '), cause, symptoms);
  }
});

test('typo tolerance does not turn ordinary words into problems', () => {
  for (const m of ['dust on the road', 'rest of the field is fine', 'tiptoe', 'bright morning', 'must go', 'hello']) assert.equal(basicGuidance({ symptoms: m }).assessment, 'unclear', m);
});

test('Devanagari spelling variants match: chandrabindu and bindu, with or without the dot', () => {
  assert.equal(basicGuidance({ symptoms: 'गेहूँ पीली', language: 'hi' }).plant, 'गेहूँ');
  assert.equal(basicGuidance({ symptoms: 'गेहूं पीली', language: 'hi' }).plant, 'गेहूँ');
  assert.equal(basicGuidance({ symptoms: 'प्याज की पत्ती पीली', language: 'hi' }).plant, 'प्याज़');
});

test('auto language: Hindi (either script) gets Hindi, English gets English; prevention tips are included and safe', () => {
  assert.equal(basicGuidance({ symptoms: 'tamater ke patte pile ho rahe hain', language: 'auto' }).lang, 'hi');
  assert.equal(basicGuidance({ symptoms: 'मेरे पौधे में धब्बे हैं', language: 'auto' }).lang, 'hi');
  assert.equal(basicGuidance({ symptoms: 'tomato leaves are yellow', language: 'auto' }).lang, 'en');
  const r = basicGuidance({ symptoms: 'yellow leaves' });
  assert.equal(r.prevention.length, 4); assert.doesNotMatch(r.prevention.join(' '), /\d+\s?(ml|mg|g|kg|l)\b|mancozeb|urea/i);
});
