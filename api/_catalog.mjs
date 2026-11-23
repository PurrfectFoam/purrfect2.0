/* Єдине джерело правди про ціни на сервері.
   Клієнту не можна довіряти суму — ми завжди перераховуємо її тут.
   Тримайте цей список синхронним із PRODUCTS у script.js. */

/* ---------- Чорна пʼятниця 2026 ----------
   Межі в UTC, бо функція тут і живе: Київ у листопаді — UTC+2, отже
     24.11 00:00 Київ = 23.11 22:00 UTC
     01.12 00:00 Київ = 30.11 22:00 UTC
   Ті самі дати й та сама ціна продубльовані у script.js.

   Рахуємо на КОЖЕН запит, а не один раз при завантаженні модуля: Vercel
   тримає функцію «теплою» між викликами, і значення, пораховане при
   холодному старті, застрягло б після закінчення акції — сайт показував
   би повну ціну, а сервер далі брав акційну. */
const PROMO_FROM = Date.UTC(2026, 10, 23, 22, 0, 0);
const PROMO_TILL = Date.UTC(2026, 10, 30, 22, 0, 0);

export const PRICE_FULL = 499;
export const PRICE_PROMO = 349;

export const promoOn = (now = Date.now()) => now >= PROMO_FROM && now < PROMO_TILL;
export const priceNow = (now = Date.now()) => (promoOn(now) ? PRICE_PROMO : PRICE_FULL);

export const PRODUCTS = {
  'noir-essence':      'Noir Essence',
  'green-harmony':     'Green Harmony',
  'grapefruit-splash': 'Grapefruit Splash',
  'lemon-biscuit':     'Lemon Biscuit',
  'fluffy-pancakes':   'Fluffy Pancakes'
};

/* Знижка за набір — має збігатися з TIERS у script.js.
   Набір — це п'ять РІЗНИХ ароматів: 5 × 499 = 2495 ₴ → 2245 ₴.
   Вісім флаконів одного аромату набором не є й знижки не дають.

   На час Чорної п'ятниці набір вимикається: −30% діє на кожен флакон,
   тож друга знижка поверх неї не нараховується. */
const TIERS = [
  { min: 5, rate: 0.10 }
];

const SCENTS = Object.keys(PRODUCTS);
const FULL_BUNDLE_RATE = TIERS.find((t) => SCENTS.length >= t.min)?.rate || 0;

/**
 * Перераховує позиції та суму замовлення з нуля.
 * @param {Array<{id:string, qty:number}>} rawItems — те, що прислав браузер
 * @returns {{items: Array, qty: number, subtotal: number, discount: number, total: number}}
 */
export function priceOrder(rawItems, now = Date.now()) {
  const PRICE = priceNow(now);
  const BUNDLE_RATE = promoOn(now) ? 0 : FULL_BUNDLE_RATE;
  const BUNDLE_SUB = SCENTS.length * PRICE;

  const items = [];

  for (const raw of Array.isArray(rawItems) ? rawItems : []) {
    const name = PRODUCTS[raw?.id];
    if (!name) continue;

    const qty = Math.min(99, Math.max(1, Math.floor(Number(raw.qty) || 0)));
    if (!qty) continue;

    const existing = items.find((i) => i.id === raw.id);
    if (existing) existing.qty = Math.min(99, existing.qty + qty);
    else items.push({ id: raw.id, name, qty, price: PRICE });
  }

  const qty = items.reduce((a, i) => a + i.qty, 0);
  const subtotal = qty * PRICE;

  /* Скільки повних наборів зібрано. Набір вимагає всіх п'яти ароматів,
     тож їхня кількість дорівнює мінімуму по ароматах: по два кожного,
     крім одного, де лише 1, — це один набір, а не два. Усе понад цей
     мінімум іде за повною ціною. Та сама логіка, що в setCount()
     у script.js, — інакше сайт і сервер рахували б різні суми. */
  const byId = new Map(items.map((i) => [i.id, i.qty]));
  const sets = Math.min(...SCENTS.map((id) => byId.get(id) || 0));
  const discount = sets > 0 ? Math.round(sets * BUNDLE_SUB * BUNDLE_RATE) : 0;

  items.forEach((i) => { i.sum = i.qty * PRICE; });

  return { items, qty, subtotal, discount, total: subtotal - discount };
}
