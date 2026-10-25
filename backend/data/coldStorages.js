// Cold storages in India by State/UT, as on 31.12.2009.
// Source: Lok Sabha Starred Question No. 174, answered 05.08.2010 (Ministry of Food Processing Industries), Annexure
// "Sector-wise distribution of cold storages as on 31/12/2009", figures from DMI, Ministry of Agriculture.
// eparlib.nic.in/bitstream/123456789/590261/1/93970.pdf
// IMPORTANT: despite its title, that annexure lists only the TOTAL number and TOTAL capacity (MT) per State/UT.
// It does NOT split them into private, cooperative and public sector, so this file does not either.
// State names are as printed in the annexure (Orissa, Pondicherry, Chhatisgarh are written here as Odisha, Puducherry, Chhattisgarh).
// These are 2009 figures: old data, shown as such.
export const COLD_STORAGE_YEAR = '31 December 2009';
export const COLD_STORAGE_SOURCE = 'Directorate of Marketing & Inspection, Ministry of Agriculture, as given in Lok Sabha Starred Question 174 (5 August 2010)';

// [state, number of cold storages, capacity in metric tonnes]
const ROWS = [
  ['Andaman & Nicobar Islands', 2, 210], ['Andhra Pradesh', 290, 900606], ['Arunachal Pradesh', 1, 5000], ['Assam', 24, 88068],
  ['Bihar', 246, 1147041], ['Chandigarh', 6, 12216], ['Chhattisgarh', 69, 341885], ['Delhi', 95, 126158], ['Gujarat', 398, 1267304],
  ['Goa', 29, 7705], ['Haryana', 244, 393121], ['Himachal Pradesh', 18, 19858], ['Jammu & Kashmir', 19, 42869], ['Jharkhand', 45, 170148],
  ['Kerala', 193, 58105], ['Karnataka', 170, 407165], ['Lakshadweep', 1, 15], ['Maharashtra', 466, 546748], ['Madhya Pradesh', 197, 808052],
  ['Manipur', 0, 0], ['Meghalaya', 3, 3200], ['Mizoram', 0, 0], ['Nagaland', 2, 6150], ['Odisha', 101, 291039], ['Puducherry', 3, 85],
  ['Punjab', 422, 1345193], ['Rajasthan', 110, 324226], ['Sikkim', 1, 2000], ['Tamil Nadu', 148, 238536], ['Tripura', 11, 29450],
  ['Uttar Pradesh', 1589, 10118000], ['Uttarakhand', 15, 68499], ['West Bengal', 463, 5682000],
];
export const COLD_STORAGES = ROWS.map(([state, number, capacityMt]) => ({ state, number, capacityMt }));
// Totals printed in the annexure, kept so a test can check the rows against them.
export const COLD_STORAGE_PRINTED_TOTAL = { number: 5381, capacityMt: 24450652 };
