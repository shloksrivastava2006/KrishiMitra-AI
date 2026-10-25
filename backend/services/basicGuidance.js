// Instant, offline guidance for the Crop Doctor. It reads the farmer's own words (English, Hindi, or Hindi in English
// letters such as "genhu ka paudha pila ho raha hai") and returns the common causes to check plus SAFE steps.
//
// It is used in two places: as an immediate first answer while the AI is still working, and as the answer when the AI is
// not available. So a farmer always gets a reply. It is general guidance, never a diagnosis, and it follows the same rules as the AI:
// no pesticide, fungicide or fertiliser names or doses, and "ask the agriculture officer or KVK" for anything to apply.
// Written in English and Hindi; any other language gets English (the page can translate it).
// Spelling mistakes are tolerated (see fuzzy.js), so "gehu ka paudha pilaa ho rha hai" still finds yellow wheat.
import { normDeva, phraseMatches, tokens } from './fuzzy.js';

const CAUSES = {
  nitrogen: { category: 'nutrient',
    en: ['Low nitrogen (nutrient shortage)', 'Older, lower leaves turn pale yellow first, and the whole plant looks weak and light green.'],
    hi: ['नाइट्रोजन की कमी (पोषक तत्व की कमी)', 'पहले नीचे की पुरानी पत्तियाँ हल्की पीली पड़ती हैं और पूरा पौधा कमज़ोर व हल्का हरा दिखता है।'] },
  waterlogging: { category: 'environmental',
    en: ['Too much water or poor drainage', 'Yellowing in low, wet or standing-water patches of the field; roots may look brown or smell bad.'],
    hi: ['ज़्यादा पानी या खराब जल-निकास', 'खेत के नीचे, गीले या पानी भरे हिस्सों में पीलापन; जड़ें भूरी दिख सकती हैं या बदबू आ सकती है।'] },
  drought: { category: 'environmental',
    en: ['Water stress (too little water or a hot, dry spell)', 'Leaves droop or dry from the tips and edges, worse in the afternoon, and the soil is dry.'],
    hi: ['पानी की कमी या गर्म-सूखा मौसम', 'पत्तियाँ मुरझाती हैं या सिरों और किनारों से सूखती हैं, दोपहर में ज़्यादा, और मिट्टी सूखी होती है।'] },
  aphids: { category: 'pest',
    en: ['Sucking insects such as aphids', 'Tiny insects on the underside of leaves or on new shoots; sticky leaves, curling or yellowing.'],
    hi: ['रस चूसने वाले कीट (जैसे माहू/एफिड)', 'पत्तियों के नीचे या नई कोंपलों पर छोटे कीट; पत्तियाँ चिपचिपी, मुड़ी हुई या पीली।'] },
  rust: { category: 'fungal',
    en: ['Rust (a fungal disease)', 'Yellow, orange or rusty stripes or powder on leaves that rubs off on your fingers.'],
    hi: ['रतुआ (फफूंद जनित रोग)', 'पत्तियों पर पीली, नारंगी या जंग जैसी धारियाँ या पाउडर जो उँगली पर लग जाता है।'] },
  leafspot: { category: 'fungal',
    en: ['Leaf spot or blight (fungal)', 'Brown or dark spots, sometimes with rings or a yellow edge, often after humid or rainy weather.'],
    hi: ['पत्ती धब्बा या झुलसा (फफूंद जनित)', 'भूरे या काले धब्बे, कभी-कभी छल्लों या पीले किनारे के साथ, अक्सर नमी या बारिश के बाद।'] },
  blightbact: { category: 'bacterial',
    en: ['Bacterial leaf spot or blight', 'Water-soaked or greasy-looking spots that turn brown and can spread fast in wet weather.'],
    hi: ['जीवाणु जनित पत्ती धब्बा या झुलसा', 'पानी से भीगे या चिकने दिखने वाले धब्बे जो भूरे हो जाते हैं और गीले मौसम में तेज़ी से फैल सकते हैं।'] },
  mildew: { category: 'fungal',
    en: ['Powdery mildew (fungal)', 'White or grey powdery coating on leaves and stems that can be wiped off.'],
    hi: ['सफ़ेद चूर्णी फफूंद (पाउडरी मिल्ड्यू)', 'पत्तियों और तनों पर सफ़ेद या धूसर पाउडर जैसी परत जो पोंछने पर हट जाती है।'] },
  rootrot: { category: 'fungal',
    en: ['Root or stem-base rot', 'Plant wilts even when the soil is moist; roots or stem base look brown, soft or rotten.'],
    hi: ['जड़ या तने के आधार का सड़न', 'मिट्टी में नमी होने पर भी पौधा मुरझाता है; जड़ें या तने का आधार भूरा, नरम या सड़ा दिखता है।'] },
  caterpillar: { category: 'pest',
    en: ['Chewing insects such as caterpillars', 'Holes or ragged edges in leaves, droppings, or caterpillars you can see, often at night or early morning.'],
    hi: ['पत्तियाँ खाने वाले कीट (जैसे इल्ली)', 'पत्तियों में छेद या कटे-फटे किनारे, मल के दाने, या दिखाई देने वाली इल्लियाँ; अक्सर रात या सुबह।'] },
  virus: { category: 'viral',
    en: ['Virus spread by insects (such as whitefly)', 'Leaves curl, crinkle or show a yellow-green mosaic, and the plant stays small.'],
    hi: ['कीटों से फैलने वाला विषाणु रोग (जैसे सफ़ेद मक्खी से)', 'पत्तियाँ मुड़ती या सिकुड़ती हैं या पीले-हरे चितकबरे निशान दिखते हैं, और पौधा छोटा रह जाता है।'] },
  nutrient: { category: 'nutrient',
    en: ['Nutrient shortage', 'Slow growth and pale or oddly coloured leaves, often in the same pattern across many plants.'],
    hi: ['पोषक तत्वों की कमी', 'धीमी बढ़वार और हल्की या अजीब रंग की पत्तियाँ, अक्सर कई पौधों में एक जैसा पैटर्न।'] },
  salt: { category: 'environmental',
    en: ['Salty soil or water', 'Leaf tips and edges look scorched, with a white crust on the soil surface.'],
    hi: ['खारी मिट्टी या पानी', 'पत्तियों के सिरे और किनारे जले जैसे, और मिट्टी की सतह पर सफ़ेद परत।'] },
};

// Every step is a safe, non-chemical action. Nothing here names a product or a dose.
const STEPS = {
  observe: ['Look at the pattern: do older (lower) leaves or new leaves show it, the whole field or only patches, an even colour or spots and stripes?',
    'पैटर्न देखें: पुरानी (नीचे की) पत्तियों पर है या नई पर, पूरे खेत में है या कुछ हिस्सों में, एक-सा रंग है या धब्बे और धारियाँ?'],
  drainage: ['Check for standing water or very dry, hard soil. Fix drainage or irrigate lightly as needed, and avoid over-watering.',
    'पानी भरा है या मिट्टी बहुत सूखी और सख़्त है, यह देखें। जल-निकास ठीक करें या ज़रूरत हो तो हल्की सिंचाई करें, और ज़्यादा पानी न दें।'],
  underside: ['Check the underside of leaves and the stems for tiny insects, eggs or webs. Tap a leaf over white paper to see them.',
    'पत्तियों के नीचे और तनों पर छोटे कीट, अंडे या जाले देखें। सफ़ेद कागज़ पर पत्ती थपथपाने से कीट दिख जाते हैं।'],
  remove: ['Remove the worst affected leaves or plants and keep them away from the field. Wash hands and tools after touching sick plants.',
    'सबसे ज़्यादा प्रभावित पत्तियाँ या पौधे हटाकर खेत से दूर रखें। बीमार पौधे छूने के बाद हाथ और औज़ार धो लें।'],
  airflow: ['Avoid working in the field when plants are wet, keep weeds down, and give plants space for air to move.',
    'पौधे गीले हों तब खेत में काम न करें, खरपतवार कम रखें और पौधों के बीच हवा चलने की जगह रखें।'],
  soiltest: ['Get your soil tested (ask the agriculture office or KVK about a Soil Health Card) before adding any fertiliser.',
    'कोई भी खाद डालने से पहले मिट्टी की जाँच कराएँ (कृषि कार्यालय या केवीके से सॉइल हेल्थ कार्ड के बारे में पूछें)।'],
  photos: ['Take clear daylight photos of an affected leaf and a healthy one, and use the photo check for a closer look.',
    'प्रभावित पत्ती और स्वस्थ पत्ती की दिन की रोशनी में साफ़ फ़ोटो लें और बारीकी से जाँच के लिए फ़ोटो जाँच इस्तेमाल करें।'],
  noSpray: ['Do not spray or add anything until the cause is known. For any product or dose, ask your local agriculture officer or KVK.',
    'कारण पता चलने तक कोई स्प्रे या खाद न डालें। किसी भी दवा या मात्रा के लिए अपने स्थानीय कृषि अधिकारी या केवीके से पूछें।'],
};

// General prevention, safe for any problem. No products, no doses.
const PREVENTION = [
  ['Use healthy, disease-free seed or seedlings, and rotate crops instead of growing the same crop in the same field every season.',
    'स्वस्थ, रोग-मुक्त बीज या पौध इस्तेमाल करें, और हर मौसम एक ही खेत में एक ही फसल की जगह फसल चक्र अपनाएँ।'],
  ['Keep proper spacing for air to move, avoid over-watering, and keep weeds down.',
    'पौधों के बीच हवा चलने की जगह रखें, ज़्यादा पानी न दें और खरपतवार कम रखें।'],
  ['Keep the field clean: remove and destroy infected plant parts and old crop residue.',
    'खेत साफ़ रखें: संक्रमित पौधों के हिस्से और पुराने फसल अवशेष हटाकर नष्ट करें।'],
  ['Walk the field every few days and act early, when only a few plants are affected.',
    'हर कुछ दिन में खेत देखें और शुरू में ही कदम उठाएँ, जब कुछ ही पौधे प्रभावित हों।'],
];

const QUESTIONS = [
  ['Which part of the plant is affected: lower leaves, upper leaves, stem or fruit?', 'समस्या पौधे के किस हिस्से पर है: नीचे की पत्तियाँ, ऊपर की पत्तियाँ, तना या फल?'],
  ['Since when, and how many plants or how much of the field?', 'यह कब से है, और कितने पौधों या खेत के कितने हिस्से में है?'],
  ['Recent weather and watering, and any fertiliser or spray already used?', 'हाल का मौसम और सिंचाई कैसी रही, और कोई खाद या स्प्रे पहले डाला हो तो बताएँ।'],
];

// Keywords are lower case. Latin words match whole words only (so "tip" does not match "tiptoe"); other scripts match as substrings.
const PATTERNS = [
  { id: 'yellow', issue: ['yellowing leaves', 'पत्तियों का पीला पड़ना'], causes: ['nitrogen', 'waterlogging', 'aphids', 'rust'], steps: ['observe', 'drainage', 'underside', 'soiltest'],
    words: ['yellow', 'yellowing', 'yellowish', 'pila', 'pilaa', 'peela', 'peelaa', 'pili', 'peeli', 'pile', 'peele', 'पीला', 'पीली', 'पीले', 'पीलापन'] },
  { id: 'spots', issue: ['spots on leaves', 'पत्तियों पर धब्बे'], causes: ['leafspot', 'blightbact', 'nutrient'], steps: ['observe', 'remove', 'airflow', 'photos'],
    words: ['spot', 'spots', 'blight', 'dhabba', 'dhabbe', 'dhabbey', 'daag', 'jhulsa', 'jhulasa', 'धब्बा', 'धब्बे', 'दाग', 'झुलसा', 'झुलस'] },
  { id: 'powder', issue: ['a white powdery coating', 'सफ़ेद पाउडर जैसी परत'], causes: ['mildew', 'rust'], steps: ['remove', 'airflow', 'observe'],
    words: ['powdery', 'mildew', 'white powder', 'white coating', 'white patches', 'safed powder', 'safed parat', 'phaphund', 'fafund', 'फफूंद', 'फफूँद', 'सफेद पाउडर', 'सफ़ेद पाउडर', 'सफेद परत', 'सफ़ेद परत'] },
  { id: 'rust', issue: ['rust-like stripes or powder', 'रतुआ जैसी धारियाँ या पाउडर'], causes: ['rust', 'leafspot'], steps: ['observe', 'remove', 'photos'],
    words: ['rust', 'ratua', 'ratuwa', 'orange powder', 'stripe rust', 'yellow rust', 'रतुआ'] },
  { id: 'wilt', issue: ['wilting or drying', 'मुरझाना या सूखना'], causes: ['drought', 'rootrot', 'waterlogging'], steps: ['drainage', 'observe', 'remove'],
    words: ['wilt', 'wilting', 'wilted', 'murjha', 'murjhana', 'murjhaya', 'drooping', 'drying', 'sookh', 'sookhna', 'sukh', 'sukhne', 'मुरझा', 'सूख'] },
  { id: 'pest', issue: ['insect damage or curling leaves', 'कीटों से नुकसान या पत्तियों का मुड़ना'], causes: ['aphids', 'caterpillar', 'virus'], steps: ['underside', 'remove', 'photos'],
    words: ['insect', 'insects', 'pest', 'pests', 'keeda', 'keede', 'kide', 'kida', 'aphid', 'aphids', 'mahu', 'mahoo', 'caterpillar', 'sundi', 'illi', 'hole', 'holes', 'chewed', 'whitefly', 'safed makkhi', 'curl', 'curling', 'कीड़ा', 'कीड़े', 'कीट', 'माहू', 'इल्ली', 'सुंडी', 'छेद', 'मक्खी', 'मुड़', 'सिकुड़'] },
  { id: 'stunted', issue: ['slow or stunted growth', 'धीमी या रुकी हुई बढ़वार'], causes: ['nutrient', 'rootrot', 'virus'], steps: ['observe', 'soiltest', 'drainage'],
    words: ['stunted', 'not growing', 'slow growth', 'growth stopped', 'badhwar', 'bardhwar', 'badhvar', 'बढ़वार', 'बढ़ नहीं', 'बौना', 'रुक गई', 'रुक गया'] },
  { id: 'tips', issue: ['dry or burnt leaf tips and edges', 'पत्तियों के सिरों और किनारों का सूखना या जलना'], causes: ['drought', 'salt', 'nutrient'], steps: ['drainage', 'soiltest', 'observe'],
    words: ['tip', 'tips', 'edge', 'edges', 'kinare', 'kinara', 'burnt', 'burn', 'jalna', 'किनारे', 'किनारा', 'सिरे', 'जले', 'जलना', 'जल गई'] },
];

// [id, English name, Hindi name, spoken-form keywords]. Used for the "plant" label and to put wheat rust higher when it fits.
const CROPS = [
  ['wheat', 'Wheat', 'गेहूँ', ['wheat', 'gehu', 'gehun', 'genhu', 'gehoon', 'गेहूं', 'गेहूँ', 'गेहु', 'गेंहू']],
  ['rice', 'Rice', 'धान', ['rice', 'paddy', 'dhan', 'chawal', 'धान', 'चावल']],
  ['maize', 'Maize', 'मक्का', ['maize', 'corn', 'makka', 'makki', 'मक्का', 'मक्की']],
  ['tomato', 'Tomato', 'टमाटर', ['tomato', 'tamatar', 'टमाटर']],
  ['potato', 'Potato', 'आलू', ['potato', 'aloo', 'alu', 'आलू']],
  ['mustard', 'Mustard', 'सरसों', ['mustard', 'sarson', 'sarso', 'सरसों', 'सरसो']],
  ['cotton', 'Cotton', 'कपास', ['cotton', 'kapas', 'कपास']],
  ['sugarcane', 'Sugarcane', 'गन्ना', ['sugarcane', 'ganna', 'गन्ना']],
  ['gram', 'Gram (chickpea)', 'चना', ['gram', 'chickpea', 'chana', 'चना']],
  ['onion', 'Onion', 'प्याज़', ['onion', 'pyaz', 'pyaaz', 'प्याज', 'प्याज़']],
  ['soybean', 'Soybean', 'सोयाबीन', ['soybean', 'soyabean', 'सोयाबीन']],
  ['brinjal', 'Brinjal (aubergine)', 'बैंगन', ['brinjal', 'eggplant', 'baingan', 'बैंगन']],
  ['chilli', 'Chilli', 'मिर्च', ['chilli', 'chili', 'mirch', 'मिर्च']],
];

const norm = (s) => normDeva(String(s || '').toLowerCase().normalize('NFC'));
const prep = (s) => { const text = norm(s); return { text, words: tokens(text) }; };
// Latin keywords match whole words, and also a word with a typing mistake in it ("pilaa", "tamater", "wlit").
// Keywords in other scripts match anywhere (those scripts have no reliable word boundary in JS regexes).
function has(ctx, word) {
  if (/^[a-z ]+$/.test(word)) return new RegExp(`(^|[^a-z])${word}([^a-z]|$)`).test(ctx.text) || phraseMatches(ctx.words, word);
  return ctx.text.includes(normDeva(word));
}
const findCrop = (ctx) => CROPS.find(([, en, , words]) => words.some((w) => has(ctx, w)) || has(ctx, en.toLowerCase()));

// Hindi written in English letters, or in Devanagari: used when the farmer picks "same language as my message".
const HINGLISH = new Set(['hai', 'hain', 'ho', 'raha', 'rahi', 'rahe', 'paudha', 'paudhe', 'patte', 'patta', 'pattiyan', 'pattiyon', 'fasal', 'kheti', 'khet', 'dhabbe', 'keede', 'pila', 'pili', 'peele', 'peeli', 'nahi', 'kya', 'kyun', 'mera', 'meri', 'mere', 'ka', 'ki', 'ke']);
const looksHindi = (text) => /[\u0900-\u097F]/.test(text) || tokens(String(text).toLowerCase()).filter((w) => HINGLISH.has(w)).length >= 2 || tokens(String(text).toLowerCase()).some((w) => ['paudha', 'patte', 'pattiyan', 'fasal', 'raha', 'rahi', 'rahe'].includes(w));

const unique = (list) => [...new Set(list)];

// language: 'hi' gets Hindi, anything else English. crop is the farmer's dropdown choice (if any); the message can name a crop too.
export function basicGuidance({ crop = '', symptoms = '', language = 'en', hasPhoto = false } = {}) {
  const hi = language === 'hi' || (language === 'auto' && looksHindi(symptoms)); const i = hi ? 1 : 0; const lang = hi ? 'hi' : 'en';
  const text = prep(`${crop} ${symptoms}`);
  const cropRow = findCrop(prep(crop)) || findCrop(text);
  const plant = cropRow ? (hi ? cropRow[2] : cropRow[1]) : null;

  const matched = PATTERNS.map((p, order) => ({ p, order, score: p.words.filter((w) => has(text, w)).length }))
    .filter((m) => m.score > 0).sort((a, b) => b.score - a.score || a.order - b.order).slice(0, 2).map((m) => m.p);

  // Take the top cause of each matched problem first, so two symptoms together (say yellow and wilting) both get a hearing.
  const depth = Math.max(0, ...matched.map((p) => p.causes.length));
  let causeIds = unique(Array.from({ length: depth }, (_, n) => matched.map((p) => p.causes[n])).flat().filter(Boolean));
  // Wheat in cool weather: rust is a very common reason for yellow leaves, so check it early.
  if (cropRow?.[0] === 'wheat') {
    const at = causeIds.indexOf('rust');
    if (at > 1) { causeIds.splice(at, 1); causeIds.splice(1, 0, 'rust'); }
  }
  causeIds = causeIds.slice(0, 3);
  const possibleCauses = causeIds.map((id, n) => ({ name: CAUSES[id][lang][0], category: CAUSES[id].category, likelihood: n === 0 ? 'medium' : 'low', signs: CAUSES[id][lang][1] }));

  const stepIds = unique(matched.length ? matched.flatMap((p) => p.steps) : ['observe', 'underside', 'photos']).slice(0, 4);
  const nextSteps = [...stepIds, 'noSpray'].map((id) => STEPS[id][i]);

  let summary;
  if (matched.length) {
    const who = hi ? (plant || 'आपके पौधे') : (plant ? plant.toLowerCase() : 'your plant');
    const issue = matched[0].issue[i];
    summary = hi
      ? `${who} में ${issue}: इसके कई कारण हो सकते हैं। नीचे सबसे आम कारण और आज ही किए जा सकने वाले सुरक्षित कदम दिए हैं। यह पक्की जाँच नहीं है।`
      : `For ${who}, ${issue} can have more than one cause. Below are the most common ones to check first, with safe steps you can take today. This is not a confirmed diagnosis.`;
  } else if (hasPhoto && !symptoms) {
    summary = hi ? 'अभी फ़ोटो की AI जाँच नहीं हो सकी। कृपया एक मिनट बाद फिर कोशिश करें। तब तक ये सुरक्षित जाँचें कर सकते हैं।'
      : 'The photo could not be checked by AI right now. Please try again in a minute. Meanwhile, here are some safe checks you can do.';
  } else {
    summary = hi ? 'सिर्फ़ इस संदेश से समस्या समझ नहीं आई। कृपया थोड़ी और जानकारी या फ़ोटो जोड़ें, तब दोबारा जाँच हो सकेगी।'
      : 'I could not tell the problem from this message alone. Please add a few details, or a photo, and I can look again.';
  }

  return {
    source: 'basic', lang, summary, imageUsable: true, imageIssue: null, plant,
    assessment: possibleCauses.length ? 'possible_issue' : 'unclear', basis: 'description',
    possibleCauses, nextSteps, questions: QUESTIONS.map((q) => q[i]),
    prevention: PREVENTION.map((p) => p[i]),
    getHelpIf: hi ? 'कुछ ही दिनों में समस्या ज़्यादा पौधों में फैल जाए, पौधे मरने लगें, या आप समझ न पा रहे हों कि क्या करें।'
      : 'the problem spreads to more plants within a few days, plants start dying, or you are not sure what to do.',
    photoNotChecked: Boolean(hasPhoto),
  };
}
