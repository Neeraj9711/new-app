export const FREE_PROMPT_LIMIT = 5;
export const PLAN_PRICE_INR = 199;
export const PLAN_DURATION_DAYS = 30;
export const PLAN_NAME = 'Astro AI Premium';

/**
 * Freemium / Razorpay paywall master switch.
 * Off until live Razorpay keys are ready. Re-enable with FREEMIUM_ENABLED=true on Render.
 */
export function isFreemiumEnabled() {
  const raw = String(process.env.FREEMIUM_ENABLED || 'false').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
}
