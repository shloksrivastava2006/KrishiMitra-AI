// Crop suitability used by /api/recommend.
//
// IMPORTANT: this is GENERAL agronomic guidance written from common Indian practice. It is NOT a sourced regional dataset
// (unlike data/seedRates.js, where every record carries a document and URL). Suitability changes a lot by state, rainfall,
// variety and sowing date. Before relying on it, check each record against your state agricultural university / ICAR
// "package of practices" and your local Krishi Vigyan Kendra (KVK), and add a `source` field when you have one.
//
//   seasons: kharif (sown Jun-Jul), rabi (sown Oct-Dec), zaid (summer, sown Feb-Apr)
//   soil.good / soil.ok: soil types from the Farm model. A soil that is in neither list is treated as unsuitable.
//   water: how much water the crop needs. low = mostly rain-fed or 1-2 irrigations, medium = a few regular irrigations,
//          high = assured or frequent irrigation (standing water for rice).
//   days: rough sowing-to-harvest range; varies by variety.
//   image: file name in frontend/public/images/crops (without extension); the page falls back to a generic picture.
//   Category, sowing months and the full growing guide for each crop live in data/cropGuide.js.
export const CROPS = [
  { id: 'rice', seasons: ['kharif'], soil: { good: ['alluvial', 'clay'], ok: ['loamy', 'black', 'laterite'] }, water: 'high', days: [100, 150], image: 'rice' },
  { id: 'maize', seasons: ['kharif', 'rabi', 'zaid'], soil: { good: ['loamy', 'alluvial'], ok: ['red', 'sandy', 'black'] }, water: 'medium', days: [85, 120], image: 'maize' },
  { id: 'soybean', seasons: ['kharif'], soil: { good: ['black', 'loamy'], ok: ['alluvial', 'red'] }, water: 'medium', days: [90, 120], image: 'soybean' },
  { id: 'pigeon-pea', seasons: ['kharif'], soil: { good: ['black', 'red'], ok: ['loamy', 'alluvial', 'clay', 'laterite'] }, water: 'low', days: [150, 270], image: 'pigeon-pea' },
  { id: 'groundnut', seasons: ['kharif'], soil: { good: ['sandy', 'red'], ok: ['loamy', 'alluvial', 'laterite'] }, water: 'low', days: [100, 130], image: 'groundnut' },
  { id: 'cotton', seasons: ['kharif'], soil: { good: ['black'], ok: ['alluvial', 'red', 'loamy', 'clay'] }, water: 'medium', days: [150, 180], image: 'cotton' },
  { id: 'bajra', seasons: ['kharif'], soil: { good: ['sandy', 'loamy'], ok: ['red', 'alluvial', 'laterite'] }, water: 'low', days: [75, 90], image: 'bajra' },
  { id: 'jowar', seasons: ['kharif', 'rabi'], soil: { good: ['black', 'loamy'], ok: ['red', 'alluvial', 'clay'] }, water: 'low', days: [100, 120], image: 'jowar' },
  { id: 'ragi', seasons: ['kharif'], soil: { good: ['red', 'laterite'], ok: ['sandy', 'loamy'] }, water: 'low', days: [100, 130], image: 'ragi' },
  { id: 'moong', seasons: ['kharif', 'zaid'], soil: { good: ['loamy', 'alluvial'], ok: ['sandy', 'red', 'black', 'laterite'] }, water: 'low', days: [60, 75], image: 'moong' },
  { id: 'urad', seasons: ['kharif'], soil: { good: ['loamy', 'black'], ok: ['alluvial', 'red', 'clay'] }, water: 'low', days: [70, 90], image: 'urad' },
  { id: 'sesame', seasons: ['kharif'], soil: { good: ['sandy', 'loamy'], ok: ['red', 'alluvial', 'laterite'] }, water: 'low', days: [80, 100], image: 'sesame' },
  { id: 'okra', seasons: ['kharif', 'zaid'], soil: { good: ['loamy', 'alluvial'], ok: ['sandy', 'red'] }, water: 'medium', days: [90, 120], image: 'okra' },
  { id: 'wheat', seasons: ['rabi'], soil: { good: ['alluvial', 'loamy'], ok: ['black', 'clay'] }, water: 'medium', days: [110, 150], image: 'wheat' },
  { id: 'mustard', seasons: ['rabi'], soil: { good: ['alluvial', 'loamy'], ok: ['sandy', 'red', 'black'] }, water: 'low', days: [110, 140], image: 'mustard' },
  { id: 'chickpea', seasons: ['rabi'], soil: { good: ['black', 'loamy'], ok: ['alluvial', 'sandy', 'red', 'clay'] }, water: 'low', days: [100, 130], image: 'chickpea' },
  { id: 'lentil', seasons: ['rabi'], soil: { good: ['loamy', 'alluvial'], ok: ['black', 'clay'] }, water: 'low', days: [110, 140], image: 'lentil' },
  { id: 'pea', seasons: ['rabi'], soil: { good: ['loamy', 'alluvial'], ok: ['black', 'clay'] }, water: 'medium', days: [90, 120], image: 'pea' },
  { id: 'barley', seasons: ['rabi'], soil: { good: ['loamy', 'sandy'], ok: ['alluvial', 'red'] }, water: 'low', days: [110, 130], image: 'barley' },
  { id: 'potato', seasons: ['rabi'], soil: { good: ['loamy', 'alluvial'], ok: ['sandy', 'red'] }, water: 'medium', days: [90, 120], image: 'potato' },
  { id: 'onion', seasons: ['rabi', 'kharif'], soil: { good: ['loamy', 'alluvial'], ok: ['black', 'red', 'sandy'] }, water: 'medium', days: [120, 150], image: 'onion' },
  { id: 'tomato', seasons: ['rabi', 'kharif'], soil: { good: ['loamy', 'red'], ok: ['alluvial', 'sandy', 'black'] }, water: 'medium', days: [100, 140], image: 'tomato' },
  { id: 'cauliflower', seasons: ['rabi'], soil: { good: ['loamy', 'alluvial'], ok: ['black', 'clay'] }, water: 'medium', days: [90, 120], image: 'cauliflower' },
  { id: 'sugarcane', seasons: ['rabi', 'zaid'], soil: { good: ['loamy', 'alluvial'], ok: ['black', 'clay'] }, water: 'high', days: [300, 365], image: 'sugarcane' },
  { id: 'watermelon', seasons: ['zaid'], soil: { good: ['sandy', 'loamy'], ok: ['alluvial', 'red'] }, water: 'medium', days: [80, 100], image: 'watermelon' },
  { id: 'bottle-gourd', seasons: ['zaid', 'kharif'], soil: { good: ['loamy', 'alluvial'], ok: ['sandy', 'black'] }, water: 'medium', days: [90, 120], image: 'bottle-gourd' },
  { id: 'banana', seasons: ['kharif', 'zaid'], soil: { good: ['loamy', 'alluvial'], ok: ['black', 'clay', 'red'] }, water: 'high', days: [300, 420], image: 'banana' },
  { id: 'papaya', seasons: ['kharif', 'zaid'], soil: { good: ['loamy', 'sandy'], ok: ['alluvial', 'red'] }, water: 'medium', days: [270, 330], image: 'papaya' },
  { id: 'mango', seasons: ['kharif'], soil: { good: ['alluvial', 'loamy'], ok: ['red', 'laterite', 'black'] }, water: 'low', days: [1460, 1825], image: 'mango' },
  { id: 'guava', seasons: ['kharif'], soil: { good: ['loamy', 'alluvial'], ok: ['sandy', 'red', 'black', 'laterite'] }, water: 'low', days: [730, 1095], image: 'guava' },
  { id: 'brinjal', seasons: ['kharif', 'rabi'], soil: { good: ['loamy', 'alluvial'], ok: ['red', 'sandy', 'black'] }, water: 'medium', days: [120, 180], image: 'brinjal' },
  { id: 'chilli', seasons: ['kharif', 'rabi'], soil: { good: ['loamy', 'black'], ok: ['alluvial', 'red', 'sandy'] }, water: 'medium', days: [150, 210], image: 'chilli' },
  { id: 'cabbage', seasons: ['kharif', 'rabi'], soil: { good: ['loamy', 'alluvial'], ok: ['black', 'clay'] }, water: 'medium', days: [90, 120], image: 'cabbage' },
  { id: 'spinach', seasons: ['rabi'], soil: { good: ['loamy', 'alluvial'], ok: ['sandy', 'black'] }, water: 'medium', days: [30, 50], image: 'spinach' },
  { id: 'carrot', seasons: ['kharif', 'rabi'], soil: { good: ['sandy', 'loamy'], ok: ['alluvial', 'red'] }, water: 'medium', days: [90, 120], image: 'carrot' },
];

