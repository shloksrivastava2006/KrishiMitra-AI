import test from 'node:test';
import assert from 'node:assert/strict';
import { viewOf, shareText, addPhrase, confidenceTone } from '../src/features/disease/diseaseView.js';

const old = { source: 'basic', summary: 'For wheat, yellowing leaves can have more than one cause.', plant: 'Wheat', assessment: 'possible_issue',
  possibleCauses: [{ name: 'Low nitrogen', category: 'nutrient', likelihood: 'medium', signs: 'Older leaves turn pale' }, { name: 'Rust', category: 'fungal', likelihood: 'low', signs: 'Orange stripes' }],
  nextSteps: ['Look at the pattern'], questions: ['Since when?'], getHelpIf: 'it spreads' };

test('an older or basic result still fills every dashboard card', () => {
  const v = viewOf(old);
  assert.equal(v.name, 'Low nitrogen'); assert.equal(v.confidence, 55); assert.equal(v.type, 'nutrient');
  assert.deepEqual(v.symptoms, ['Older leaves turn pale', 'Orange stripes']); assert.deepEqual(v.causes, ['Low nitrogen', 'Rust']);
  assert.deepEqual(v.treatment, ['Look at the pattern']); assert.equal(v.overview, old.summary);
});

test('a new AI result uses its own fields', () => {
  const v = viewOf({ ...old, diseaseName: 'Leaf Rust', confidence: 85, overview: 'A fungal disease.', symptoms: ['Orange pustules'], causes: ['Cool humid weather'], treatment: ['Remove leaves'], prevention: ['Rotate crops'], importantNote: 'AI first look.', followUps: ['a', 'b', 'c'] });
  assert.equal(v.name, 'Leaf Rust'); assert.equal(v.confidence, 85); assert.deepEqual(v.symptoms, ['Orange pustules']); assert.deepEqual(v.prevention, ['Rotate crops']); assert.equal(v.followUps.length, 3);
});

test('an empty or unclear result does not break the page', () => {
  const v = viewOf({ summary: 'Please add details.' });
  assert.equal(v.name, null); assert.equal(v.confidence, null); assert.deepEqual(v.symptoms, []); assert.equal(v.overview, 'Please add details.');
  assert.doesNotThrow(() => viewOf(undefined)); assert.equal(confidenceTone(80).includes('leaf'), true);
});

test('share text has the main points and the safety line, and no blank double lines', () => {
  const s = shareText({ ...old, diseaseName: 'Leaf Rust', confidence: 85 }, 'Wheat');
  assert.match(s, /Leaf Rust - 85%/); assert.match(s, /Treatment:\n- Look at the pattern/); assert.match(s, /KVK/); assert.doesNotMatch(s, /\n\n\n/);
});

test('quick chips add a phrase once, keep what was typed, and respect the limit', () => {
  assert.equal(addPhrase('', 'Yellow leaves'), 'Yellow leaves');
  assert.equal(addPhrase('wheat is sick.', 'Yellow leaves'), 'wheat is sick, Yellow leaves');
  assert.equal(addPhrase('wheat, yellow leaves', 'Yellow leaves'), 'wheat, yellow leaves');
  assert.equal([...addPhrase('x'.repeat(595), 'Yellow leaves')].length, 600);
});
