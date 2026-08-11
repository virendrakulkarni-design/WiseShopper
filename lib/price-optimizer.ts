// lib/price-optimizer.ts
// Optimizes cart across platforms to minimize total cost including delivery

import { SearchResult } from "./search-engine";
import { PaymentOffer } from "./search-engine";

export interface CartItem {
  itemName: string;
  results: SearchResult[];
  selectedResult?: SearchResult;
}

export interface BundlePlan {
  items: Array<{ itemName: string; result: SearchResult }>;
  platform: string;
  platformLogo: string;
  platformColor: string;
  subtotal: number;
  deliveryCharge: number;
  total: number;
  savings: number;
  deliveryBreakdown?: Array<{ platform: string; subtotal: number; delivery: number; freeThreshold: number }>;
  thresholdTip?: string;
  paymentOptions: PaymentOptionSummary[];
}

export interface PaymentOptionSummary {
  method: string;
  discount: number;
  finalTotal: number;
  savingsText: string;
  code?: string;
}

export function optimizeCart(cartItems: CartItem[]): {
  bestSplit: BundlePlan[];
  singlePlatformPlans: BundlePlan[];
  savings: number;
} {
  if (cartItems.length === 0) return { bestSplit: [], singlePlatformPlans: [], savings: 0 };

  // 1. Single platform plans: calculate if all items were bought on one platform
  const singlePlatformPlans: BundlePlan[] = [];
  const allPlatforms = new Set(
    cartItems.flatMap((ci) => ci.results.map((r) => r.platform.id))
  );

  allPlatforms.forEach((pid) => {
    const platformResults: Array<{ itemName: string; result: SearchResult }> = [];
    let subtotal = 0;
    let allAvailable = true;

    cartItems.forEach((ci) => {
      const result = ci.results.find((r) => r.platform.id === pid);
      if (!result) { allAvailable = false; return; }
      platformResults.push({ itemName: ci.itemName, result });
      subtotal += result.estimatedPrice;
    });

    if (!allAvailable || platformResults.length === 0) return;

    const platform = platformResults[0].result.platform;
    const deliveryCharge = (platform.deliveryThreshold > 0 && subtotal >= platform.deliveryThreshold) || platform.deliveryThreshold === 0 ? 0 : platform.avgDelivery;
    const total = subtotal + deliveryCharge;
    const savings = platformResults.reduce((s, pr) => s + (pr.result.estimatedMrp - pr.result.estimatedPrice), 0);

    let thresholdTip: string | undefined;
    if (deliveryCharge > 0 && platform.deliveryThreshold > subtotal) {
      const diff = platform.deliveryThreshold - subtotal;
      thresholdTip = `Add ₹${diff} more on ${platform.name} for FREE delivery!`;
    }

    singlePlatformPlans.push({
      items: platformResults,
      platform: platform.name,
      platformLogo: platform.logo,
      platformColor: platform.color,
      subtotal,
      deliveryCharge,
      total,
      savings,
      thresholdTip,
      paymentOptions: buildPaymentOptions(platform.paymentOffers, total),
    });
  });

  singlePlatformPlans.sort((a, b) => a.total - b.total);

  // 2. Best split: pick the cheapest option for each item across platforms
  const bestSplitItems: Array<{ itemName: string; result: SearchResult }> = [];
  cartItems.forEach((ci) => {
    const best = [...ci.results].sort((a, b) => a.totalCost - b.totalCost)[0];
    if (best) bestSplitItems.push({ itemName: ci.itemName, result: best });
  });

  // Calculate per-platform subtotal and delivery for the split
  const platformSubtotals: Record<string, { platform: SearchResult["platform"]; subtotal: number; items: string[] }> = {};
  bestSplitItems.forEach((item) => {
    const pid = item.result.platform.id;
    if (!platformSubtotals[pid]) {
      platformSubtotals[pid] = { platform: item.result.platform, subtotal: 0, items: [] };
    }
    platformSubtotals[pid].subtotal += item.result.estimatedPrice;
    platformSubtotals[pid].items.push(item.itemName);
  });

  let splitSubtotal = 0;
  let totalSplitDelivery = 0;
  const deliveryBreakdown: Array<{ platform: string; subtotal: number; delivery: number; freeThreshold: number }> = [];

  Object.values(platformSubtotals).forEach(({ platform, subtotal }) => {
    splitSubtotal += subtotal;
    const fee = (platform.deliveryThreshold > 0 && subtotal >= platform.deliveryThreshold) || platform.deliveryThreshold === 0
      ? 0
      : platform.avgDelivery;
    totalSplitDelivery += fee;
    deliveryBreakdown.push({
      platform: platform.name,
      subtotal,
      delivery: fee,
      freeThreshold: platform.deliveryThreshold,
    });
  });

  const splitTotal = splitSubtotal + totalSplitDelivery;
  const splitSavings = bestSplitItems.reduce(
    (s, i) => s + (i.result.estimatedMrp - i.result.estimatedPrice),
    0
  );

  const bestSplit: BundlePlan[] = [
    {
      items: bestSplitItems,
      platform: "Split across " + Object.keys(platformSubtotals).length + " Stores",
      platformLogo: "🌐",
      platformColor: "#6B7280",
      subtotal: splitSubtotal,
      deliveryCharge: totalSplitDelivery,
      total: splitTotal,
      savings: splitSavings,
      deliveryBreakdown,
      paymentOptions: [],
    },
  ];

  // Compare best single store vs split
  const bestSingleTotal = singlePlatformPlans[0]?.total ?? splitTotal;
  const savings = bestSingleTotal > splitTotal ? bestSingleTotal - splitTotal : 0;

  return {
    bestSplit,
    singlePlatformPlans: singlePlatformPlans.slice(0, 5),
    savings,
  };
}

function buildPaymentOptions(offers: PaymentOffer[], cartTotal: number): PaymentOptionSummary[] {
  const options: PaymentOptionSummary[] = [];

  // Default: no discount
  options.push({
    method: "Cash / Default",
    discount: 0,
    finalTotal: cartTotal,
    savingsText: "No additional discount",
  });

  offers.forEach((offer) => {
    if (offer.cashback && offer.cashback > 0) {
      const meetsMin = !offer.minCart || cartTotal >= offer.minCart;
      if (meetsMin) {
        const disc = Math.min(offer.cashback, cartTotal * 0.1);
        options.push({
          method: `${offer.method || offer.bank} (Cashback)`,
          discount: disc,
          finalTotal: cartTotal - disc,
          savingsText: `₹${disc} cashback`,
          code: offer.code,
        });
      }
    }
    if (offer.discount && offer.discount > 0) {
      const disc = Math.min(
        (cartTotal * offer.discount) / 100,
        offer.maxDiscount || Infinity
      );
      const label = offer.bank
        ? `${offer.bank} ${offer.type || "Card"}`
        : offer.method || "Special Offer";
      const meetsMin = !offer.minCart || cartTotal >= offer.minCart;
      if (meetsMin) {
        options.push({
          method: label,
          discount: disc,
          finalTotal: cartTotal - disc,
          savingsText: `${offer.discount}% off (max ₹${offer.maxDiscount || disc})`,
          code: offer.code,
        });
      }
    }
  });

  return options.sort((a, b) => a.finalTotal - b.finalTotal);
}
