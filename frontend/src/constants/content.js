// Static site content. Hero/crop images: real photo (.jpg) is preferred, .svg is the fallback.
export const heroSlides = [
  { id: 'tractor-fields', alt: 'Tractor working green fields at sunrise', caption: 'Modern farming' },
  { id: 'smart-farming', alt: 'Farmer using a tablet with weather station in the field', caption: 'Smart farming' },
  { id: 'seedling', alt: 'Hands watering a young seedling in rich soil', caption: 'Healthy seedlings' },
  { id: 'farmer-landscape', alt: 'Farmer looking over green fields at sunset', caption: 'Our farmers' },
  { id: 'fresh-harvest', alt: 'Crate of fresh vegetables and baskets of grains', caption: 'Fresh harvest' },
  { id: 'solar-irrigation', alt: 'Solar powered pump irrigating a paddy field', caption: 'Solar irrigation' },
];

export const crops = [
  { id: 'wheat', name: 'Wheat', season: 'Rabi (sow Oct to Dec)' },
  { id: 'rice', name: 'Rice', season: 'Kharif (sow Jun to Jul)' },
  { id: 'maize', name: 'Maize', season: 'Kharif and Rabi' },
  { id: 'mustard', name: 'Mustard', season: 'Rabi (sow Oct)' },
  { id: 'sugarcane', name: 'Sugarcane', season: 'Spring and autumn planting' },
  { id: 'moong', name: 'Moong (green gram)', season: 'Kharif and Zaid (sow Jun to Jul, Mar to Apr)' },
  { id: 'tomato', name: 'Tomato', season: 'Varies by region' },
  { id: 'potato', name: 'Potato', season: 'Rabi (sow Oct to Nov)' },
  { id: 'onion', name: 'Onion', season: 'Rabi and Kharif' },
  { id: 'chickpea', name: 'Chickpea', season: 'Rabi (sow Oct to Nov)' },
  { id: 'soybean', name: 'Soybean', season: 'Kharif (sow Jun to Jul)' },
  { id: 'cotton', name: 'Cotton', season: 'Kharif (sow May to Jun)' },
  { id: 'brinjal', name: 'Brinjal', season: 'Kharif and Rabi nursery' },
  { id: 'banana', name: 'Banana', season: 'Plant Feb to Mar or Jun to Jul' },
  { id: 'mango', name: 'Mango', season: 'Plant Jul to Aug' },
];

export const features = [
  { title: 'Crop recommendation', text: 'Sowing month, soil and water in. Crops that suit them out, with a photo and a full guide for each: land, seed, water, fertilizer and yield.', to: '/recommend', status: 'live' },
  { title: 'Farm expenses and profit/loss', text: 'Write down what you spend and what you earn. See profit or loss for each crop and where your money goes.', to: '/my-expenses', status: 'live', icon: 'money' },
  { title: 'Plant disease check', text: 'Upload a leaf photo and get possible causes and next steps.', to: '/disease', status: 'live' },
  { title: 'Seed calculator (Beej matra)', text: 'How many kg of seed your land needs, from published seed rates with the source shown.', to: '/calculators/seed-calculator', status: 'live', icon: 'seed' },
  { title: 'Land calculator', text: 'State-wise: convert acre, hectare and your state\'s local units such as bigha, kanal, guntha and nali.', to: '/calculators/land-calculator', status: 'live' },
  { title: 'Fertilizer and water calculator', text: 'Pick crop and state: how much fertilizer, when to apply each dose and when to irrigate, from the ICAR advisories.', to: '/calculators/fertilizer-calculator', status: 'live' },
  { title: 'Farm and crop records', text: 'Keep every farm, crop, sowing date and harvest date in one place.', to: '/my-farm', status: 'live' },
  { title: 'Cold storages in India', text: 'State-wise number and capacity of cold storages (as on 31.12.2009), to see where storage exists for your produce.', to: '/cold-storage', status: 'live' },
  { title: 'Smart irrigation advisory', text: 'Pick your crop stage, soil and irrigation setup, add your soil moisture, and get how much water to give and when.', to: '/irrigation', status: 'live', icon: 'water' },
  { title: 'Farm reminders and tasks', text: 'Schedule sowing, spraying, irrigation and harvest dates and tick them off. Overdue jobs are flagged.', to: '/my-tasks', status: 'live', icon: 'tasks' },
  { title: 'Weather and irrigation', text: 'Forecasts for your location and simple irrigation guidance.', to: '/weather', status: 'soon' },
  { title: 'Buy and sell: seeds, inputs and fresh produce', text: 'Farmers sell their crops, vegetables and fruits directly to buyers; sellers list seeds and inputs. Buyer and seller both need an account.', to: '/marketplace', status: 'live', icon: 'seed-market' },
  { title: 'Equipment rental', text: 'Rent a tractor, rotavator or sprayer by the day, or list your own for rent.', to: '/rentals', status: 'soon', icon: 'rental' },
];

export const fieldGroups = ['Seeds', 'Fertilizers', 'Bio-pesticides', 'Organic products'];
