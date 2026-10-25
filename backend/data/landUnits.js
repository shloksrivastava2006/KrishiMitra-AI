// Local land units by state, in hectares per unit.
//
// SOURCE: Agriculture Statistics Manual (ASM-III), Appendix-IV "Statewise information regarding conversion of local units
// into hectares (Sch. AS 1.0 & 1.1)", pages 33-34 of the manual. These are the factors state agencies use to turn local units
// into hectares in crop-area surveys; they are rounded to 4 decimals in the manual. Local units vary by district and by
// the local revenue record, so the farmer's own land record always wins.
//
// check: true marks a value that looks inconsistent inside the manual itself. The calculator still uses the manual's number
// (that is the data asked for) but shows the note next to every result that uses it.
// derived: true marks a value that is NOT taken from the factor column: it is worked out from a remark in the manual, or
// from a unit definition (1 bigha = 20 bishwa, 1 bishwa = 20 bishwansi; 1 cent is about 40.5 sq m) where the printed factor is
// clearly wrong. The note says what was used instead.
//
// Acre, hectare, square metre and square foot are standard everywhere and are not repeated per state. The manual's own
// "Acre 0.4047" and "Acre/Decimal 0.4047" rows are covered by the standard acre.
export const SOURCE = 'Agriculture Statistics Manual (ASM-III), Appendix-IV: statewise conversion of local units into hectares';

const KANAL = { id: 'kanal', name: 'Kanal', hectare: 0.0506 };
const MARLA = { id: 'marla', name: 'Marla', hectare: 0.0025 };
const DECIMAL = { id: 'decimal', name: 'Decimal', hectare: 0.004 };
const GUNTHA = { id: 'guntha', name: 'Guntha', hectare: 0.0101 };
const CENT = { id: 'cent', name: 'Cent', hectare: 0.004 };
const BISHWA_NOTE = 'The manual prints about 1,618 sq m for Bishwa, which cannot be right: a bishwa is 1/20 of a bigha. This calculator uses 1 Bigha = 20 Bishwa instead.';

export const STATES = [
  { id: 'andhra-pradesh', name: 'Andhra Pradesh', units: [{ id: 'cent', name: 'Cent', hectare: 0.004, derived: true, note: 'The manual prints 0.0101 ha for Cent here, but that is the Guntha value. This calculator uses 0.0040 ha (about 40.5 sq m), the value the manual gives for Cent in Karnataka and Kerala.' }] },
  { id: 'assam', name: 'Assam', note: 'The manual gives two sets of units for different districts: Bigha, Katha and Chatak in some, Bigha, Katha and Latcha in others. The two Katha values differ.',
    units: [{ id: 'bigha', name: 'Bigha', hectare: 0.1338 }, { id: 'katha', name: 'Katha (Chatak districts)', hectare: 0.0067 }, { id: 'chatak', name: 'Chatak', hectare: 0.0004 }, { id: 'katha-latcha', name: 'Katha (Latcha districts)', hectare: 0.0268 }, { id: 'latcha', name: 'Latcha', hectare: 0.0013 }] },
  { id: 'bihar', name: 'Bihar', units: [DECIMAL] },
  { id: 'chhattisgarh', name: 'Chhattisgarh', units: [] },
  { id: 'gujarat', name: 'Gujarat', note: 'The manual lists hectare, with acre and guntha used in about 25% of cases but gives no factor for them.', units: [] },
  { id: 'haryana', name: 'Haryana', units: [{ ...KANAL, note: 'The manual marks this as the maximum value.' }, MARLA, { id: 'bigha', name: 'Bigha', hectare: 0.0843 }] },
  { id: 'himachal-pradesh', name: 'Himachal Pradesh', units: [{ id: 'bigha', name: 'Bigha', hectare: 0.0809 }] },
  { id: 'jammu-kashmir', name: 'Jammu & Kashmir', units: [KANAL, MARLA] },
  { id: 'jharkhand', name: 'Jharkhand', units: [DECIMAL] },
  { id: 'karnataka', name: 'Karnataka', units: [GUNTHA, CENT] },
  { id: 'kerala', name: 'Kerala', units: [CENT] },
  { id: 'madhya-pradesh', name: 'Madhya Pradesh', units: [] },
  { id: 'maharashtra', name: 'Maharashtra', units: [GUNTHA] },
  { id: 'odisha', name: 'Odisha', units: [] },
  { id: 'puducherry', name: 'Puducherry', units: [] },
  { id: 'punjab', name: 'Punjab', units: [{ ...KANAL, note: 'The manual marks this as the maximum value.' }, MARLA] },
  { id: 'rajasthan', name: 'Rajasthan', units: [{ id: 'bigha', name: 'Bigha', hectare: 0.2529 }, { id: 'bishwa', name: 'Bishwa', hectare: 0.2529 / 20, derived: true, note: BISHWA_NOTE }, { id: 'bishwansi', name: 'Bishwansi', hectare: 0.2529 / 400, derived: true, note: 'The manual prints about 2,161 sq m for Bishwansi, which is larger than a Bishwa and cannot be right. This calculator uses 1 Bishwa = 20 Bishwansi instead.' }] },
  { id: 'tamil-nadu', name: 'Tamil Nadu', units: [] },
  { id: 'uttar-pradesh', name: 'Uttar Pradesh', units: [{ id: 'bigha', name: 'Bigha', hectare: 0.253 }, { id: 'bishwa', name: 'Bishwa', hectare: 0.253 / 20, derived: true, note: BISHWA_NOTE }] },
  { id: 'uttarakhand', name: 'Uttarakhand', note: 'From the manual: 1 Nali = 200 sq m, 16 Muthi = 1 Nali, and 1 Bigha = 2 1/3 Nali (Bigha in Udham Singh Nagar district).',
    units: [{ id: 'nali', name: 'Nali', hectare: 0.02, derived: true, note: '1 Nali = 200 sq m, from the manual remark.' }, { id: 'muthi', name: 'Muthi', hectare: 0.00125, derived: true, note: '16 Muthi = 1 Nali, from the manual remark.' },
      { id: 'bigha', name: 'Bigha', hectare: 0.063, check: true, note: 'The table gives 0.0630 ha, but the remark says 1 Bigha = 2 1/3 Nali, which is about 0.0467 ha. The two disagree. Check with your local revenue record.' }] },
  { id: 'west-bengal', name: 'West Bengal', units: [DECIMAL] },
];
