import Stripe from 'stripe';
import { BGOS_PLANS, type BgosPlan } from '../../shared/bgos-plans';
export function bgosStripe() {
  const key = process.env.BGOS_STRIPE_SECRET_KEY;
  if (!key) throw new Error('BGOS billing is not configured');
  return new Stripe(key);
}
export function bgosPrice(plan: BgosPlan) { return process.env[`BGOS_STRIPE_PRICE_${plan.toUpperCase()}`]; }
export async function validateBgosPrice(stripe: Stripe, plan: BgosPlan) {
  const id = bgosPrice(plan);
  if (!id) throw new Error('This plan is not configured for checkout');
  const price = await stripe.prices.retrieve(id);
  if (!price.active || price.currency !== 'inr' || price.unit_amount !== BGOS_PLANS[plan].priceInr * 100 || price.recurring?.interval !== 'month' || price.recurring.interval_count !== 1) throw new Error('Billing price does not match the published monthly INR plan');
  return id;
}
