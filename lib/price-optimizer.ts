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

  // Group by platform and find best platform for each item
  const platformMap: Record<string, Array<{ itemName: string; result: SearchResult }>> = {};

  cartItems.forEach((ci) => {
    const best = ci.results.sort((a, b) => a.totalCost - b.totalCost)[0];
    if (!best) return;
    const pid = best.platform.id;
    if (!platformMap[pid]) platformMap[pid] = [];
    platformMap[pid].push({ itemName: ci.itemName, result: best });
  });

  // Build bundle plans
  const singlePlatformPlans: BundlePlan[] = [];

  // For each platform, calculate if all items were bought there
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
    const deliveryCharge = subtotal >= platform.deliveryThreshold ? 0 : platform.avgDelivery;
    const total = subtotal + deliveryCharge;
    const savings = platformResults.reduce((s, pr) => s + (pr.result.estimatedMrp - pr.result.estimatedPrice), 0);

    singlePlatformPlans.push({
      items: platformResults,
      platform: platform.name,
      platformLogo: platform.logo,
      platformColor: platform.color,
      subtotal,
      deliveryCharge,
      total,
      savings,
      paymentOptions: buildPaymentOptions(platform.paymentOffers, total),
    });
  });

  singlePlatformPlans.sort((a, b) => a.total - b.total);

  // Best split: each item from cheapest platform
  const bestSplitItems: Array<{ itemName: string; result: SearchResult }> = [];
  cartItems.forEach((ci) => {
    const best = [...ci.results].sort((a, b) => a.totalCost - b.totalCost)[0];
    if (best) bestSplitItems.push({ itemName: ci.itemName, result: best });
  });

  const splitTotal = bestSplitItems.reduce((s, i) => s + i.result.totalCost, 0);
  const splitSavings = bestSplitItems.reduce(
    (s, i) => s + (i.result.estimatedMrp - i.result.estimatedPrice),
    0
  );

  const bestSplit: BundlePlan[] = [
    {
      items: bestSplitItems,
      platform: "Multiple",
      platformLogo: "🌐",
      platformColor: "#6B7280",
      subtotal: splitTotal,
      deliveryCharge: 0,
      total: splitTotal,
      savings: splitSavings,
      paymentOptions: [],
    },
  ];

  return {
    bestSplit,
    singlePlatformPlans: singlePlatformPlans.slice(0, 5),
    savings: singlePlatformPlans[0] ? splitTotal - singlePlatformPlans[0].total : 0,
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
