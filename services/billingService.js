import UsageQuota from '../models/UsageQuota.js';
import {
  FREE_PROMPT_LIMIT,
  PLAN_DURATION_DAYS,
  PLAN_PRICE_INR,
} from '../constants/billing.js';

function isActiveSubscription(quota) {
  if (!quota?.isSubscribed || !quota.subscriptionExpiresAt) return false;
  return new Date(quota.subscriptionExpiresAt).getTime() > Date.now();
}

export async function getOrCreateQuota(guestId) {
  if (!guestId || typeof guestId !== 'string') {
    throw new Error('guestId is required');
  }
  let quota = await UsageQuota.findOne({ guestId });
  if (!quota) {
    quota = await UsageQuota.create({ guestId, promptCount: 0 });
  }
  if (quota.isSubscribed && quota.subscriptionExpiresAt && !isActiveSubscription(quota)) {
    quota.isSubscribed = false;
    await quota.save();
  }
  return quota;
}

export function quotaPayload(quota) {
  const subscribed = isActiveSubscription(quota);
  const used = quota.promptCount || 0;
  const remaining = subscribed ? null : Math.max(0, FREE_PROMPT_LIMIT - used);
  return {
    guestId: quota.guestId,
    freeLimit: FREE_PROMPT_LIMIT,
    promptsUsed: used,
    promptsRemaining: remaining,
    isSubscribed: subscribed,
    subscriptionExpiresAt: quota.subscriptionExpiresAt,
    planPriceInr: PLAN_PRICE_INR,
    planDurationDays: PLAN_DURATION_DAYS,
    paywall: !subscribed && used >= FREE_PROMPT_LIMIT,
  };
}

export async function assertCanSendPrompt(guestId) {
  const quota = await getOrCreateQuota(guestId);
  const status = quotaPayload(quota);
  if (status.paywall) {
    const err = new Error('Free limit reached');
    err.code = 'PAYWALL';
    err.status = 402;
    err.quota = status;
    throw err;
  }
  return { quota, status };
}

export async function consumePrompt(guestId) {
  const quota = await getOrCreateQuota(guestId);
  if (isActiveSubscription(quota)) {
    return quotaPayload(quota);
  }
  quota.promptCount = (quota.promptCount || 0) + 1;
  await quota.save();
  return quotaPayload(quota);
}

export async function activateSubscription(guestId, paymentId) {
  const quota = await getOrCreateQuota(guestId);
  const expires = new Date();
  expires.setDate(expires.getDate() + PLAN_DURATION_DAYS);
  quota.isSubscribed = true;
  quota.subscriptionExpiresAt = expires;
  quota.lastPaymentId = paymentId || quota.lastPaymentId;
  await quota.save();
  return quotaPayload(quota);
}
