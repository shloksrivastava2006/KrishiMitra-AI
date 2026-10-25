import { ApiError } from '../utils/ApiError.js';
import { STATES, SOURCE } from '../data/landUnits.js';

const STANDARD = [
  { id: 'hectare', name: 'Hectare', hectare: 1 },
  { id: 'acre', name: 'Acre', hectare: 0.404686 },
  { id: 'sqm', name: 'Square metre', hectare: 0.0001 },
  { id: 'sqft', name: 'Square foot', hectare: 0.0000092903 },
];

export const listLandStates = () => ({ source: SOURCE, standard: STANDARD, states: STATES });

// Converts an area entered in any unit (standard, or one of the state's local units) into every unit that state uses.
export function convertLand({ state, unit, value }) {
  const st = STATES.find((s) => s.id === state);
  if (!st) throw new ApiError(422, 'Choose a state from the list');
  if (!(value > 0) || !Number.isFinite(value)) throw new ApiError(422, 'Area must be greater than zero');
  const all = [...STANDARD, ...st.units];
  const from = all.find((u) => u.id === unit);
  if (!from) throw new ApiError(422, `${unit || 'This unit'} is not used in ${st.name}`);
  const ha = value * from.hectare;
  return {
    state: st.name, stateNote: st.note || null, source: SOURCE,
    input: { value, unit: from.name, check: Boolean(from.check), note: from.note || null },
    hectare: ha,
    results: all.map((u) => ({ id: u.id, name: u.name, value: ha / u.hectare, local: !STANDARD.includes(u), factorHectare: u.hectare, check: Boolean(u.check), derived: Boolean(u.derived), note: u.note || null })),
  };
}
