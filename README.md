# KrishiMitra AI

Smart agriculture platform for Indian farmers. React + Vite + Tailwind frontend, Node/Express + MongoDB backend.

**Status:** core modules are built (see "What is built" below). Modules listed under "Not built yet" show a "coming soon" page in the UI.

## Run locally
Requirements: Node 20+, a MongoDB Atlas connection string.

```bash
npm run install:all
cp backend/.env.example backend/.env      # fill MONGODB_URI and JWT_SECRET
cp frontend/.env.example frontend/.env
npm run dev:backend      # http://localhost:5000/api/health
npm run dev:frontend     # http://localhost:5173
npm run test:backend     # calculator unit tests
npm run build:frontend   # production build
```

Create an administrator (public signup cannot create admins):
`ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-long-password' npm run seed:admin`

## What is built
- Auth: register as farmer, seller or customer (admin never via signup), login by email or mobile, JWT with server-side revocation on logout, bcrypt (12 rounds), admin only via seed script, rate-limited auth routes. Admin signs in only at the private /admin/login. **Signup needs a mobile OTP (compulsory) and can have an email OTP (optional); login has Forgot password by OTP and Google / Apple sign-in; see "Sign-up, OTP, Google / Apple and forgot password" below.**
- Customer accounts: register as a customer (a buyer: shop in the marketplace, rent equipment, track orders; no farm tools, cannot sell). The role is forced by `POST /api/auth/register-customer`; the login page has Farmer, Seller and Customer tabs.
- Customer dashboard (`/customer`, customer role only): totals of orders, orders on the way, money spent on delivered orders, active rentals, recent orders, upcoming equipment bookings and latest notifications, all from the customer's own records (`GET /api/customer/summary`). Orders, bookings, notifications and profile show inside the same customer sidebar.
- Farms and crops: full CRUD, every query scoped to the logged-in owner (another user's id returns 404).
- Farmer dashboard: overview from real records, crop distribution chart, upcoming harvests, responsive sidebar.
- Calculators (server-side, unit-tested): land area (bigha needs a local size), fertilizer quantity from the user's own rate. Expense records and profit/loss are in Farm expenses.
- Homepage: hero slider (auto 4.5 s, arrows, dots, pause on hover/focus), features, how it works, crop guide.

## Sign-up, OTP, Google / Apple and forgot password
Works the same for farmers, sellers and customers (the three tabs on `/register` and `/login`).

**Signup (`/register`)**
- The mobile number must be verified with an OTP before the account can be created. The email can optionally be verified with an OTP too (it then shows as verified and also works for password reset). Flow: `POST /api/auth/otp/send` `{channel:'phone'|'email', target}` then `POST /api/auth/otp/verify` `{channel, target, code}` returns a signed `proof` (15 minutes, only valid for that exact number/email). The signup call sends `phoneProof` (and optionally `emailProof`) with the form, and the server checks them again.
- OTP rules (`backend/services/otpService.js`): 6 digits, valid 5 minutes, one use, 5 wrong guesses kill the code, 30 seconds between sends, 5 codes per number per hour, plus an IP rate limit. Only a keyed hash of the code is stored (`otps` collection, auto-deleted).
- **Google / Apple signup:** "Sign up with Google/Apple" on the signup page fills in the name and the (provider-verified) email and hides the password fields. The mobile OTP is still required; sellers still give their business details. `POST /api/auth/social/register`. Such accounts start with no password; the owner can set one with Forgot password.

**Login (`/login`)**
- Password login as before, or Google / Apple (`POST /api/auth/social/login`). If nobody has signed up with that Google/Apple account the page sends the person to signup with their details filled in. An existing password account is linked to Google/Apple only when the provider says the email is verified.
- **Forgot password** (`/forgot-password`): type the email or mobile number, get an OTP (SMS for a number, email for an email), enter it with a new password. The reply to "send code" is identical whether or not the account exists. A successful reset signs the account out everywhere (`tokenVersion`). Administrators cannot use it (they use the seed script / main admin).

**Switching it on (`backend/.env`)**
| Feature | Settings |
| --- | --- |
| Mobile OTP | `SMS_PROVIDER=msg91` + `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID` (India: needs a DLT-approved OTP template), or `SMS_PROVIDER=twilio` + `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`. The default `console` prints the code in the backend terminal for development and is **refused when `NODE_ENV=production`**. |
| Email OTP | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` (any SMTP: Gmail app password, Brevo, SES). Without `SMTP_HOST` the code is only printed in development. |
| Google | `GOOGLE_CLIENT_ID`: Google Cloud Console > Credentials > OAuth client ID (Web); add your site URL under Authorized JavaScript origins (e.g. `http://localhost:5173`). |
| Apple | `APPLE_CLIENT_ID` (the Services ID) and `APPLE_REDIRECT_URI` (a Return URL registered for it). Apple requires HTTPS and a verified domain, so test Apple on a deployed site, not on localhost. |
The Google and Apple buttons appear only when the server has the matching id (`GET /api/auth/config`), so the frontend needs no extra settings. Run `npm run install:all` once because `nodemailer` was added. If you use a Content-Security-Policy, allow `https://accounts.google.com` and `https://appleid.cdn-apple.com`.

**Good to know**
- Existing accounts keep working. They are not marked verified until they use OTP or Google/Apple. Changing the mobile number on the profile page marks it unverified (no OTP step there yet).
- Gmail addresses are now stored exactly as typed (lower-case). Before, the validator silently removed dots and `+tags`, which made some people unable to log in with the address they typed.
- Tests: `backend/tests/unit/social.test.js` (no database) checks that forged, expired, wrong-audience and `alg`-downgraded tokens are refused. `otp`, `passwordReset` and `social` integration tests need `TEST_MONGODB_URI` like the others. Signup tests now mint the OTP receipt through `tests/helpers/proofs.js`.

## Languages (one menu, whole site)
The language menu (navbar, login, mobile menu) lists every language. **English** and the **hand-written Hindi** come from dictionaries (`frontend/src/i18n/en.js`, `hi.js`); the dictionaries only cover part of the site, because many pages have English written directly in them. So **Hindi also runs through Google Website Translator** (`HINDI_MODE = 'hybrid'` in `frontend/src/i18n/googleTranslate.js`): the hand-written Hindi stays underneath and Google translates the English that is left. If Google cannot load, the hand-written (partial) Hindi still shows. Set `HINDI_MODE` to `'google-only'` if Google changes the hand-written Hindi in a way you dislike (Hindi then works like Tamil), or `'dictionary'` to switch Google off for Hindi. People who chose Hindi earlier, or pick it on the Register page, get the complete page automatically. **Every other language** translates the whole page with Google (`googleTranslate.js`): Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, Punjabi, Odia, Assamese, Urdu, Nepali, Sindhi, Sanskrit, plus Bhojpuri, Maithili, Dogri, Konkani, Meiteilon and Mizo. That covers text written directly in pages, not only the dictionaries. The choice is stored in the `googtrans` cookie in that browser only. Switching between languages, or back to English, reloads the page once.
- Privacy: Google's script is loaded only after someone picks one of these languages, and then the text shown on the page is sent to Google. A notice says so (with a "Show original" button). Brand name, buyer name/phone/address and the profile name/email/phone are marked `translate="no"`. Other pages that show personal text are not, so add `translate="no"` wherever you show more.
- Quality: machine translation can be wrong, including crop names, prices and anything about medicines. The notice tells people to re-check in English. If you need a language to be reliable, write a dictionary for it.
- Not covered: Bodo, Kashmiri and Santali (not offered here). Bhojpuri, Maithili, Dogri, Konkani, Meiteilon and Mizo were added to Google Translate in 2024; confirm each works in the website widget and delete any that does not from `GOOGLE_LANGS`. Urdu and Sindhi are right-to-left and the layout is not mirrored.
- Needs internet access to `translate.google.com`. If it cannot load, the site stays in English and says so.
- Google Translate rewrites the page, which can make React throw `removeChild` errors; `installTranslateGuard()` applies the usual workaround, only when such a language is active.
- The plant disease check answers in the language chosen on its own page; it starts from the site language when that is one of its 11.

## Weather and plant disease check
- `/weather`: forecast from Open-Meteo by device location, place search, or a saved farm's coordinates; rule-based irrigation guidance.
- `/disease` (farmer): add a leaf photo, a written description of the problem, or both; Gemini returns possible causes and non-chemical next steps. The description can be typed in any Indian language, and the answer is written in the language the farmer picks (English, Hindi, Marathi, Gujarati, Punjabi, Bengali, Tamil, Telugu, Kannada, Malayalam, Odia; the choice is remembered in the browser). Menus and buttons are still English/Hindi only. With no photo the answer is capped at "medium" likelihood and marked as description-only. The description is treated as untrusted prompt input (control and bidi characters and angle brackets removed, 600-character cap, joiners kept for Indic scripts) and is stored with the written result; photos are never stored. No medicine names or doses by design. Needs `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`) in `backend/.env`; without it the page says it is not set up. The photo is resized in the browser (this also removes GPS data) and is not stored, only the written result. 15 checks per account per hour.

## Marketplace (seeds and farm inputs)
- Farmers and vendors list products at `/my-products`; every new or materially edited listing waits for admin approval (`/admin/products`). Seeds, fertilizers and bio-pesticides require a licence/registration number, shown to buyers; the admin checks it. This is a process aid, not legal advice: check the licensing rules that apply to your sellers.
- Buyers use `/marketplace`, `/cart`, `/checkout`, `/my-orders`. One seller per order. Prices are always computed on the server, in integer paise. Delivery charges are not modelled; buyer and seller agree them.
- Payment: cash on delivery, or online via Razorpay (set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`; webhook URL `/api/payments/razorpay/webhook`, events `payment.captured` and `order.paid`). Without keys, online payment is switched off and COD still works. Payment is confirmed by a verified signature and by the webhook (amount-checked, idempotent). Unpaid online orders are cancelled after 30 minutes and their stock is released.
- Money lands in YOUR Razorpay account. Paying sellers, refunds (`refund_due` orders) and commission are manual until you add Razorpay Route or a payout process. Deploying: allow `https://checkout.razorpay.com` in your frontend Content-Security-Policy.
- Sellers see a buyer's name, phone and address only for orders placed with them. Seller email/phone are never public.

## Crop recommendation (`/recommend`, public)
Rule-based, no AI key needed. The user picks the sowing month (defaulting to this month, or "any month"), soil type (or "not sure") and water available (low/medium/high). Signed-in farmers can fill soil and water from one of their saved farms (irrigation method gives a starting guess for water). `GET /api/recommend?month=&soil=&water=` (or `season=kharif|rabi|zaid|any` instead of `month`) returns crops that fit the sowing month (each crop's own sowing months), the soil (when known) and a water supply at least as large as the crop's need, ranked: soil "good" 2 points, "ok" 1, water need equal to supply +1. It does not predict yield or profit and the page says so.
**Crop guide merged in:** the old `/crops` page now redirects here. Crops are grouped (grains, pulses, oilseeds, vegetables, fruits, cash crops); each card has a picture, and tapping it opens the full guide from `backend/data/cropGuide.js`: sowing and harvest calendar, land and soil preparation, seed rate and spacing, water, fertilizer and expected yield (per acre). `/recommend?crop=wheat` opens that crop directly. 35 crops. Like the suitability data, the guide is general guidance for the Indian plains and must be checked with your KVK.

## Calculators
`/calculators` is a list; each calculator is its own page and does only what its name says: `/calculators/seed-calculator`, `/calculators/land-calculator` (state-wise: the farmer picks the state and converts between acre, hectare, sq m, sq ft and that state's local units; unit sizes for 21 states come from the Agriculture Statistics Manual ASM-III, Appendix-IV, stored in `backend/data/landUnits.js`; where the printed factor is clearly wrong (Bishwa and Bishwansi in UP and Rajasthan, Cent in Andhra Pradesh) the unit definition is used instead and marked `derived` with a note, and the one value that disagrees with its own remark (Uttarakhand Bigha) is flagged with `check`; `GET /api/calculator/land-units`, `POST /api/calculator/land`; "Other state" keeps the old own-bigha-size converter), `/calculators/fertilizer-calculator` (crop-wise, state-wise: the farmer picks crop, state and variety/condition and gets kg of urea, DAP or SSP, MOP etc. for the field, WHEN each dose goes on (days after sowing/transplanting/planting, and calendar dates if a sowing date is given) and WHEN to irrigate, with a "Remind me" link into My tasks. Data: `backend/data/fertilizerPlans.js`, 117 plans for 15 crops in 22 states, built only from the two ICAR PDFs, each with its PDF page; doses are per hectare, nutrient plans are converted with standard grades (urea 46% N, DAP 18-46-0, SSP 16% P2O5, MOP 60% K2O) and the N in DAP is subtracted from urea; per-acre and per-kanal advisories are converted; where the advisory gives no day the step shows the stage only. `GET /api/calculator/fertilizer-plans`, `POST /api/calculator/fertilizer-plan`. "Other crop" keeps the old own-rate quantity calculator, `POST /api/calculator/fertilizer`), and a card that opens Farm expenses and profit/loss (`/my-expenses`, farmer login). The old expense add-up calculator was removed. API: `POST /api/calculator/area|fertilizer`.

## Farm reminders and tasks (farmer role)
`/my-tasks`: the farmer schedules a job (description, crop, category: sowing, irrigation, fertilizer, spraying, weeding, harvest, other; date; notes), sees active tasks with overdue / due today / tomorrow flags, ticks them done (kept under "Completed") or deletes them. The form can be opened pre-filled (`/my-tasks?title=&crop=&category=&date=`), which the irrigation advisor uses. API: `GET/POST /api/tasks`, `PATCH /api/tasks/:id` (`{ done }`), `DELETE /api/tasks/:id`; farmer-only and scoped to the signed-in owner. There are no push or SMS alerts yet; the flags show inside the app.

## Smart irrigation advisory
`/irrigation` (open to every role, farmers see it inside their sidebar). Inputs: crop, growth stage, soil type, irrigation setup (drip, sprinkler, flood, rain-fed) and the current soil moisture (0 to 100, from a sensor or the finger test on the page). Output: status (optimal, irrigate soon, irrigate today, too wet, stop at maturity), water volume in mm and litres per acre, next watering, best timing and a tip, plus a button that creates a reminder in `/my-tasks`. `GET /api/irrigation/advice?crop=&stage=&soil=&method=&moisture=`. Rule-based (`services/irrigationService.js`, tests in `tests/unit/irrigation.test.js`): a floor moisture per stage, how fast each soil and crop dries, and a refill target of about 70 percent. It does not use rainfall or temperature, so the page tells the farmer to check the weather and their KVK.

## Farm expenses and profit/loss (farmer role)
`/my-expenses`: the farmer writes down every expense (seed, fertilizer, pesticide, labour, irrigation, machinery, fuel, transport, land rent, storage, other) and every income (crop sale, by-product, subsidy), optionally against a crop and a farm; list with filters and CSV download. `/my-profit-loss`: totals, profit or loss with return on money spent, crop-wise table, and a spending-by-category breakdown, for all time, this financial year (from 1 April), this calendar year, last 30 days or custom dates. API: `GET/POST /api/ledger`, `DELETE /api/ledger/:id`, `GET /api/ledger/profit-loss`, `GET /api/ledger/categories`, farmer-only and scoped to the signed-in owner. Profit is never stored; it is calculated from the entries (`services/ledgerService.js`, tests in `tests/unit/ledger.test.js`).
**The crop data (`backend/data/cropSuitability.js`) is general agronomic guidance, not a sourced regional dataset** (unlike `seedRates.js`). Suitability varies by state, rainfall, variety and sowing date: have each record checked against your state agricultural university / ICAR package of practices or a local KVK, and add a `source` when you can. Gaps are shown honestly as "no match" (for example rabi on laterite soil). Tests: `tests/unit/recommend.test.js`.

## Sell my produce (farmers sell crops, vegetables, fruits)
Farmers sell what they grow at `/sell-produce` (menu: "Sell my produce"; also a button on My overview and "Sell this crop" on every crop in My Crops, which pre-fills name, variety and harvest date). It reuses the marketplace, cart, orders, reviews, notifications and admin review, so nothing is duplicated.
- Produce categories: grains and pulses, vegetables, fruits, oilseeds, spices, flowers, other farm produce. A listing counts as "produce" only because of its category (`PRODUCE_CATEGORIES` in `backend/services/marketRules.js`), so the two can never disagree. No licence number is needed for produce.
- Produce details on `Product` (all optional): `variety`, `harvestDate` (harvested in the last 60 days, or expected within the next 90), `grade` (A/B/C), `organic`, `village`. They are dropped for non-produce categories. Units `dozen` and `bunch` were added. Quantities are whole numbers (use a unit like quintal for bulk).
- Photos (up to 5) use the existing upload endpoint. Every new listing waits for admin approval. Changing name, variety, category, description, photos or the organic claim sends it back for review; price, quantity, grade and harvest date can change any time (the page has quick price/quantity update, pause and resume).
- Marketplace: tabs All / Fresh from farmers / Seeds and inputs, plus an "organic only" filter and a district filter (`GET /api/products?type=produce|inputs&organic=true&district=...`). Cards and the product page show organic, grade, variety, harvest date and village.
- **Payment for farmers is cash/UPI on delivery only.** Online payments land in your Razorpay account and are paid out by hand, and only vendors have payout details on file (Admin > Sellers > Record payout). A farmer has none, so online money could not reach them. The server refuses online payment for orders from farmers (HTTP 422) and checkout shows COD only. To change this, add `'farmer'` to `ONLINE_PAYMENT_SELLER_ROLES` in `marketRules.js` after building farmer payout details.
- Notifications now link farmers to pages they can open (`/my-sales`, `/sell-produce`) instead of `/seller/*`, which is vendor-only.
- The admin cannot verify an organic claim; the review screen flags it so it is checked by hand.
- No database migration: new fields are optional and old products keep working. Old listings in vegetables/fruits/grains now appear under "Sell my produce" instead of "My products" (which is for seeds and other inputs).

## Seller dashboard (vendor role)
Farmers and sellers share `/login` and `/register` (two tabs each). Seller signup (`POST /api/auth/register-seller`) collects shop name, address, PIN, licence and payout details; the server forces role `vendor` and verification `pending`. After login a seller lands on `/seller`.

- Sidebar pages: Dashboard, My Profile, Add Product, My Products, Orders, Equipment Rentals, Earnings & Payments, Sales Analytics, Reviews & Ratings, Notifications, Settings, Logout.
- Products: photos (up to 5, JPG/PNG/WebP, 3 MB each, checked by file bytes, saved in `backend/uploads`, served at `/uploads/...`), subcategory, discount, minimum order, delivery area, licence number. Every new or materially edited listing is `pending` until an admin approves it (`/admin/products`). Sellers can pause/resume a live listing and change price/stock without a new review. Statuses shown: Pending, Live, Rejected (with reason), Paused, Out of stock.
- Orders reuse the existing order flow: new -> confirmed (packing) -> dispatched -> delivered, plus reject/cancel. The server enforces which moves are allowed.
- Earnings are computed from real orders: gross = paid orders (verified online payment, or COD cash once marked delivered), commission = `PLATFORM_COMMISSION_PERCENT`, refunds = paid orders that were cancelled. **The app does not move money.** Customer payments land in your Razorpay account; you pay sellers by bank/UPI and record it in Admin > Sellers > Record payout (capped at what the seller is owed). The seller sees it under Payout history. Sales report downloads as CSV.
- Analytics: daily/weekly/monthly revenue, best sellers, low stock (10 or fewer).
- Reviews: only a buyer with a delivered order can review a product, once. Sellers can reply, not edit or delete.
- Equipment rental: sellers (and farmers) list equipment; anyone signed in can request a booking at `/rentals`; the owner confirms. Two confirmed bookings can never overlap (checked on request, on confirm, and again after confirm). The site does not collect rent or deposit; renter and owner settle at handover. Admin can hide a listing (Admin > Rentals).
- Notifications (all roles, `/notifications`): new order, payment received, low stock (5 or fewer), product approved/rejected, cancellation, rental request/update, seller verification, payout, new review.
- Admin > Sellers: verify, reject, suspend (ends their sessions at once), reinstate, record payouts.
- Permissions: `/api/seller/*` needs role `vendor`, and every query is filtered by the logged-in seller's id. A seller cannot edit another seller's product, order, review or rental, cannot set their own verification status or role, and cannot reach `/api/admin/*`.

## Admin login
The public login page has no admin option. Admins sign in at the private URL `/admin/login` (not linked anywhere), which calls `POST /api/auth/admin/login`. That endpoint accepts only admin accounts (10 attempts per 15 minutes per IP), the admin session ends with the browser tab, and `POST /api/auth/login` now refuses admin accounts. Create the first admin with `npm run seed:admin` (script: `backend/scripts/seedAdmin.js`).

## Database changes and environment
No migration is needed; Mongoose adds the new fields on first save and old products keep working.
- `User`: new `seller` sub-document (shopName, address, pincode, licenceNumber, upiId, bank fields, verification, verificationNote). Full bank account number is stored with `select: false` and never returned; only its last 4 digits are.
- `Product`: subcategory, images, discountPercent, salePaise (price buyers pay), minOrderQty, deliveryAvailable, deliveryLocation, approvedAt; new status `inactive`; new categories (grains-pulses, vegetables, fruits, machinery, solar) and unit `quintal`.
- New collections: `notifications`, `reviews`, `payouts`, `rentals`, `rentalbookings`.
- New env var: `PLATFORM_COMMISSION_PERCENT` (default 0). Uploaded photos live on local disk; on Render/Heroku-style hosts that disk is wiped on deploy, so move uploads to Cloudinary or S3 before going live.

## Tests
`npm run test:backend` runs everything in `backend/tests/`. Unit tests (`tests/unit`: pricing, discount, commission, upload sniffing, calculators, weather, disease) need no database. The integration tests (`tests/integration`: `auth`, `market`, `seller`) need a throwaway MongoDB: `TEST_MONGODB_URI=mongodb://127.0.0.1:27017/krishimitra_test`. `npm test` in `frontend` checks English/Hindi key parity. `tests/unit/produce.test.js` covers produce categories, filters, harvest dates and the farmer payment rule; `tests/integration/produce.integration.test.js` covers the listing, review and notification flow.

## Not built yet
Gemini farming assistant (`/ai-assistant`), mandi prices (`/mandi`), admin settings, email, crop activity log, and charts for expenses/revenue/irrigation.

## Images
No internet was available when this was generated, so `public/images` holds **illustrations, not photographs**: one for each of the 35 crops, the shop categories (seeds, fertilizers, bio-pesticides, organic inputs, fresh produce) and the equipment tiles. Regenerate them with `node scripts/generate-illustrations.mjs` (in `frontend`).
`SmartImage` loads `name.jpg` first and falls back to `name.svg`. Add real photos with the same base names
(for example `public/images/hero/wheat-field.jpg`, `public/images/crops/rice.jpg`) from a source whose licence you have (your own photos, Unsplash, Pexels).

## Deployment outline
Frontend on Vercel/Netlify (`VITE_API_URL` = your API URL), backend on Render (set the backend env vars, `CLIENT_ORIGINS` = frontend URL, health check `/api/health`), database on MongoDB Atlas (allow the backend's IP). Use Cloudinary or similar for uploads once added; local disk is ephemeral on most hosts.

## Routes
One website, one navbar and footer before and after login. Farmers and sellers sign in at `/login` and sign up at `/register` (tabs); administrators use the private `/admin/login`.
Public: `/`, `/features`, `/recommend` (`/crops` redirects here), `/irrigation`, `/weather`, `/mandi`, `/marketplace`, `/rentals`, `/calculators`, `/calculators/seed-calculator`, `/login`, `/register`.
Customer role: `/customer`.
Signed in: `/profile`, `/notifications`, `/my-orders`, `/my-bookings`. Farmer role: `/sell-produce`, `/my-overview` (optional, not a forced landing page), `/my-farm`, `/my-crops`, `/my-tasks`, `/my-expenses`, `/my-profit-loss`, `/my-calculations`.
Seller role: `/seller`, `/seller/profile`, `/seller/products`, `/seller/products/new`, `/seller/orders`, `/seller/rentals`, `/seller/earnings`, `/seller/analytics`, `/seller/reviews`, `/seller/notifications`, `/seller/settings`.
Admin role: `/admin`, `/admin/users`, `/admin/sellers`, `/admin/products`, `/admin/orders`, `/admin/rentals` (settings is a placeholder). Old `/farmer/...`, `/dashboard/...`, `/admin/dashboard` URLs redirect.
Backend: `POST /api/auth/logout` revokes all of the account's tokens (tokenVersion); `/api/admin/*` requires the admin role checked against the database.

## Project structure
```
krishimitra-ai/
├── package.json              root shortcuts: install:all, dev:backend, dev:frontend, test:backend, seed:admin
├── README.md
├── backend/                  Node + Express + MongoDB API
│   ├── server.js             starts the server
│   ├── app.js                Express app: middleware + routes
│   ├── config/               env.js, db.js
│   ├── routes/               URL -> controller (one file per module)
│   ├── controllers/          request handling (one file per module)
│   ├── services/             business logic (pricing, payments, weather, disease, images ...)
│   ├── models/               Mongoose schemas
│   ├── validators/           express-validator rules
│   ├── middleware/           auth, validate, errorHandler
│   ├── utils/                ApiError, asyncHandler
│   ├── data/                 seedRates.js (sourced seed-rate records)
│   ├── scripts/              doctor.js, seedAdmin.js
│   ├── tests/unit/           no database needed
│   ├── tests/integration/    need TEST_MONGODB_URI
│   └── uploads/              uploaded photos (git-ignored, .gitkeep only)
└── frontend/                 React + Vite + Tailwind
    ├── index.html, vite.config.js, tailwind.config.js, postcss.config.js
    ├── public/images/        hero, crops, products, equipment illustrations (.svg)
    ├── scripts/              generate-placeholders.mjs (re-creates the .svg illustrations)
    ├── tests/                i18n.test.mjs (English/Hindi key parity)
    └── src/
        ├── main.jsx, App.jsx, index.css     entry point and all routes
        ├── components/
        │   ├── common/       shared UI: Field, Toast, SmartImage, NotFound, PagePlaceholder, LanguageSelect, ui.jsx
        │   └── layout/       Navbar, Footer, PublicLayout
        ├── routes/           ProtectedRoute (role check)
        ├── services/         api.js (axios, token, error helpers)
        ├── i18n/             en.js, hi.js, I18nProvider, translate
        ├── constants/        content.js (hero slides, crop list, feature list)
        └── features/         one folder per module, one page per file
            ├── home/  crops/  weather/  disease/  calculators/
            ├── auth/         login, register, admin login, AuthContext
            ├── farms/  dashboard/    farmer pages (my farm, overview)
            ├── account/      profile, notifications, mandi, my calculations
            ├── market/       marketplace, product, cart, checkout, orders, my products
            ├── rentals/      rentals, my bookings
            ├── seller/       seller dashboard pages (one file per sidebar page)
            └── admin/        admin pages (one file per tab)
```

## Seed rates
Data lives in `backend/data/seedRates.js`, served at `GET /api/calculator/seed-rates`. Every record carries region, source document, URL, status and last-verified date.
Current records come from ICAR Rabi Agro-Advisory 2021-22 state pages (wheat, rice, maize, mustard, chickpea). They are regional and seasonal, not national norms.
Pigeon pea, soybean and peas have no sourced record yet, so users enter their own rate. Add records only with a real source.

## Live mandi prices (`/mandi`, public)
State, then district, mandi and crop; prices per quintal (min, max, modal) from the Agmarknet feed on data.gov.in (resource `9ef84268-d588-465a-a308-a864a43d0070`). The server calls the API with `DATA_GOV_API_KEY` from `backend/.env` (never sent to the browser, never in git), caches each state/crop for 30 minutes, and the page remembers the last state in the browser. Without the key the page says prices are not set up. A few states are spelled differently by Agmarknet (Uttrakhand, Chattisgarh, Orissa...); the service tries both spellings. API: `GET /api/mandi/states`, `GET /api/mandi/prices?state=&district=&commodity=&market=`. Not every mandi reports every crop every day, so rows can carry older dates.

## Cold storages (`/cold-storage`, public)
State-wise number and capacity (MT) of cold storages as on 31.12.2009, from Lok Sabha Starred Question 174 (5 Aug 2010, annexure "Sector-wise distribution of cold storages", DMI, Ministry of Agriculture). Data in `backend/data/coldStorages.js` (33 States/UTs; a test checks the rows against the printed totals, 5,381 storages and 24,450,652 MT). That annexure is titled sector-wise but has NO private/cooperative/public split, so none is shown. `GET /api/cold-storage`. It is 2009 data and the page says so; replace it with a newer DMI/NHB table when you have one.

**Mandi by location:** "Use my location" on `/mandi` sends the device position (rounded to about 1 km) to `GET /api/mandi/locate?lat=&lon=`, which asks OpenStreetMap Nominatim (no key; identifying User-Agent, results cached) for the state and district, maps the state to the Agmarknet spelling and picks the district if the feed has it. Signed-in farmers get their profile state and district preselected the first time. The position is not stored.


## AI Crop Doctor (dashboard)

Page: `/disease` (farmer sidebar). Backend: `/api/disease/*`.

- Two input tabs: photo, or describe the symptoms (with quick symptom chips and voice typing). Both can be used together.
- Result panel: disease name, confidence, crop / plant part / type / scientific name, tabs for Overview, Symptoms, Causes, Treatment, Prevention and More info, Download PDF (browser print), Share, and "Ask the AI more".
- Spelling mistakes: the Gemini prompt tells the model to silently correct them (Roman-letter Hindi included). The built-in offline guidance does the same with `backend/services/fuzzy.js`.
- Language: "Same language as my message" (default) or any language in the list. The AI answers in the chosen language.
- If the AI is off, slow, or over the hourly limit, the farmer still gets the built-in guidance (English and Hindi).
- Treatment text may name common active ingredients as examples, never brands, doses or spray intervals. To make it stricter, edit the rule that starts with "For a chemical option" in `SYSTEM_PROMPT` in `backend/services/diseaseService.js`.
- Needs `GEMINI_API_KEY` in `backend/.env`. Photos are never stored.
