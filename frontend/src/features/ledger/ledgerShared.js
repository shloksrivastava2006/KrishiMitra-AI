// Shared by the expense book and the profit/loss report. Keep the category ids in step with backend/models/FarmEntry.js.
export const EXPENSE_CATEGORIES = ['seed', 'fertilizer', 'pesticide', 'labour', 'irrigation', 'machinery', 'fuel', 'transport', 'land_rent', 'storage', 'other'];
export const INCOME_CATEGORIES = ['crop_sale', 'by_product', 'subsidy', 'other'];
export const CATEGORY_LABEL = {
  seed: 'Seed', fertilizer: 'Fertilizer and manure', pesticide: 'Pesticide and spray', labour: 'Labour', irrigation: 'Irrigation and electricity',
  machinery: 'Machinery and rent', fuel: 'Diesel and fuel', transport: 'Transport', land_rent: 'Land rent', storage: 'Storage and packing', other: 'Other',
  crop_sale: 'Crop sale', by_product: 'By-product (straw, fodder, milk...)', subsidy: 'Subsidy or support',
};
export const labelOf = (c, type) => (c === 'other' && type === 'income' ? 'Other income' : CATEGORY_LABEL[c] || c);
export const today = () => new Date().toISOString().slice(0, 10);

// Query string for the ledger endpoints from a filter object; empty values are left out.
export const qs = (o) => { const p = new URLSearchParams(); Object.entries(o).forEach(([k, v]) => v && p.set(k, v)); const s = p.toString(); return s ? `?${s}` : ''; };
