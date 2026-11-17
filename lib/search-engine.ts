// lib/search-engine.ts
// Builds search URLs for all platforms given an item query

import platformsData from "@/data/platforms.json";
import { GoogleGenerativeAI } from "@google/generative-ai";
// Next.js automatically loads .env.local; no need for dotenv.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const USE_REAL_DATA = Boolean(GEMINI_API_KEY);
let geminiModel: any = null;
if (USE_REAL_DATA) {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    geminiModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  } catch (err) {
    console.warn("[search-engine] Failed to initialize Gemini model:", err);
  }
}

export interface Platform {
  id: string;
  name: string;
  logo: string;
  color: string;
  baseUrl: string;
  searchUrl: string;
  categories: string[];
  deliveryThreshold: number;
  avgDelivery: number;
  deliveryDays: string;
  paymentOffers: PaymentOffer[];
  specialOffer?: string;
  primeDiscount?: number;
}

export interface PaymentOffer {
  bank?: string;
  method?: string;
  type?: string;
  discount?: number;
  maxDiscount?: number;
  minCart?: number;
  cashback?: number;
  code?: string;
}

export interface SearchResult {
  platform: Platform;
  searchUrl: string;
  estimatedPrice: number;
  estimatedMrp: number;
  discount: number;
  deliveryCharge: number;
  totalCost: number;
  rating: number;
  reviewCount: number;
  positiveReviews: number; // percentage e.g. 87
  inStock: boolean;
  badge?: string;
  imageUrl: string;       // demo product thumbnail
  productForm: string;    // "Tablet" | "Oil" | "Cream" | "Gel" | "Syrup" | "Powder" | "Spray" etc.
  productFormWarning?: string; // highlight when form might be ambiguous
  priceInsight?: {
    label: "Low" | "Typical" | "High";
    sparkline: number[];
  };
  aiSummary?: string;
}

const platforms: Platform[] = platformsData as Platform[];

export function getCategoryPlatforms(category: string): Platform[] {
  if (!category || category === "all" || category === "other") return platforms;
  const filtered = platforms.filter((p) => p.categories.includes(category));
  return filtered.length > 0 ? filtered : platforms;
}

export function buildSearchUrl(platform: Platform, query: string): string {
  return platform.searchUrl.replace("{query}", query);
}

// ── Detect product form from query ──────────────────────────────────────────
export function detectProductForm(query: string): { form: string; warning?: string } {
  const lq = query.toLowerCase();

  const formMap: Array<{ keywords: string[]; form: string }> = [
    { keywords: ["tablet", "tab", "mg", "strip", "650", "500", "250", "100mg"], form: "Tablet" },
    { keywords: ["capsule", "cap", "softgel", "softcap"], form: "Capsule" },
    { keywords: ["syrup", "suspension", "liquid", "drops", "solution"], form: "Syrup/Liquid" },
    { keywords: ["pain relief oil", "pain oil", "massage oil", "hair oil", "coconut oil", "mustard oil",
                  "til oil", "sesame", "castor oil", "almond oil"], form: "Oil" },
    { keywords: ["cream", "lotion", "moisturiser", "moisturizer", "ointment"], form: "Cream/Lotion" },
    { keywords: ["gel", "serum", "face gel"], form: "Gel" },
    { keywords: ["spray", "nasal spray", "inhaler"], form: "Spray" },
    { keywords: ["powder", "dust", "talc", "protein powder", "whey"], form: "Powder" },
    { keywords: ["soap", "bar", "body wash"], form: "Soap/Wash" },
    { keywords: ["shampoo", "conditioner", "hair wash"], form: "Shampoo" },
    { keywords: ["injection", "vial", "ampule"], form: "Injection" },
    { keywords: ["patch", "bandage", "plaster"], form: "Patch/Bandage" },
    { keywords: ["rice", "atta", "flour", "dal", "grain", "cereal"], form: "Food/Grain" },
    { keywords: ["oil"], form: "Oil" }, // generic oil — trigger warning
  ];

  for (const { keywords, form } of formMap) {
    if (keywords.some((k) => lq.includes(k))) {
      // Add warning for commonly confused oil types
      if (form === "Oil" && !["hair", "coconut", "mustard", "castor", "almond", "sesame", "til",
          "pain relief", "massage", "cooking", "edible"].some((w) => lq.includes(w))) {
        return {
          form,
          warning: "⚠️ 'Oil' can mean cooking oil, hair oil, pain relief oil, or essential oil. Verify product image before buying!",
        };
      }
      return { form };
    }
  }
  return { form: "Item" };
}

// ── Build demo image URL using Picsum (consistent per item+platform) ─────────
function buildImageUrl(query: string, platformId: string): string {
  // Use Picsum to generate a consistent placeholder image that actually loads
  const seed = encodeURIComponent(`${query}-${platformId}`);
  return `https://picsum.photos/seed/${seed}/120/120`;
}



// ── Real Gemini fetch ───────────────────────────────────────
async function fetchRealResults(
  normalizedQuery: string,
  category: string = "all",
  cartValue: number = 0
): Promise<SearchResult[]> {
  if (!geminiModel) throw new Error("Gemini model not initialized");

  console.log("[fetchRealResults] Query:", normalizedQuery);
  const relevantPlatforms = getCategoryPlatforms(category);
  const platformNames = relevantPlatforms.map((p) => p.name).join(", ");
  const prompt = `You are a price‑comparison engine. Provide a JSON array with one entry for each of the following platforms: ${platformNames}. For the product "${normalizedQuery}", include these fields for each platform:\n- platformId (match platform.id)\n- searchUrl (the URL a user would open to view the product on that platform)\n- estimatedPrice (numeric, in INR)\n- estimatedMrp (numeric, in INR)\n- discount (percentage integer)\n- deliveryCharge (numeric, INR)\n- totalCost (numeric, INR)\n- rating (0‑5 number with one decimal)\n- reviewCount (integer)\n- positiveReviews (percentage integer)\n- inStock (boolean)\n- imageUrl (a real image URL, preferably product thumbnail)\n- productForm (e.g. "Oil", "Tablet", "Cream", etc.)\n- productFormWarning (optional string if ambiguous)\n- badge (optional string like "Best Value" etc.)\nReturn only raw JSON without any extra text.`;

  console.log("[fetchRealResults] Prompt prepared");
  const response = await geminiModel.generateContent(prompt);
  const text = await response.text();
  console.log("[fetchRealResults] Raw Gemini response:", text);
  // Extract JSON block if wrapped in markdown
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const jsonString = jsonMatch ? jsonMatch[1] : text.trim();
  let data: any[];
  try {
    data = JSON.parse(jsonString) as any[];
  } catch (e) {
    console.error("[fetchRealResults] JSON parse error", e, "raw string:", jsonString);
    throw e;
  }
  // Map raw data to SearchResult type ensuring proper fields
  return data.map((d) => {
    const platform = relevantPlatforms.find((p) => p.id === d.platformId) || platforms.find((p) => p.id === d.platformId) || relevantPlatforms[0];
    return {
      platform,
      searchUrl: d.searchUrl,
      estimatedPrice: d.estimatedPrice,
      estimatedMrp: d.estimatedMrp,
      discount: d.discount,
      deliveryCharge: d.deliveryCharge,
      totalCost: d.totalCost,
      rating: d.rating,
      reviewCount: d.reviewCount,
      positiveReviews: d.positiveReviews,
      inStock: d.inStock,
      imageUrl: d.imageUrl,
      productForm: d.productForm ?? "Item",
      productFormWarning: d.productFormWarning,
      badge: d.badge,
      priceInsight: generateMockPriceInsight(d.totalCost),
      aiSummary: generateMockAiSummary(d.rating, d.positiveReviews),
    } as SearchResult;
  });
}

function generateMockAiSummary(rating: number, positiveReviews: number): string {
  if (rating >= 4.5 && positiveReviews > 90) {
    return "Users love the excellent quality and fast results, highly recommended.";
  } else if (rating >= 4.0) {
    return "Good overall value; some users noted minor packaging issues.";
  } else {
    return "Mixed reviews; users cite average performance but decent pricing.";
  }
}

export async function getAllSearchResults(
  normalizedQuery: string,
  category: string = "all",
  cartValue: number = 0
): Promise<SearchResult[]> {
  // If a Gemini API key is present, try real fetch first
  if (USE_REAL_DATA) {
    try {
      const real = await fetchRealResults(normalizedQuery, category, cartValue);
      if (real && real.length) return real;
    } catch (e) {
      console.warn("Real data fetch failed, falling back to demo mode:", e);
    }
  }

  let effectiveCategory = category;
  if (!effectiveCategory || effectiveCategory === "all" || effectiveCategory === "other") {
    const lq = normalizedQuery.toLowerCase();
    if (lq.includes("milk") || lq.includes("bread") || lq.includes("sugar") || lq.includes("rice") || lq.includes("atta")) {
      effectiveCategory = "grocery";
    } else if (
      lq.includes("dolo") ||
      lq.includes("ortho") ||
      lq.includes("syndopa") ||
      lq.includes("tablet") ||
      lq.includes("capsule") ||
      lq.includes("cr") ||
      lq.includes("strip") ||
      lq.includes("medicine")
    ) {
      effectiveCategory = "medicines";
    } else {
      effectiveCategory = "all";
    }
  }

  // Demo fallback (original simulation)
  const relevantPlatforms = getCategoryPlatforms(effectiveCategory);
  const { form, warning } = detectProductForm(normalizedQuery);

  return relevantPlatforms.map((platform) => {
    const basePrice = simulatePrice(normalizedQuery, effectiveCategory);
    const mrp = Math.round(basePrice * (1 + Math.random() * 0.3 + 0.1));
    const price = Math.round(basePrice * (0.85 + Math.random() * 0.25));
    const discountPct = Math.round(((mrp - price) / mrp) * 100);

    const deliveryCharge =
      cartValue >= platform.deliveryThreshold && platform.deliveryThreshold > 0
        ? 0
        : price >= platform.deliveryThreshold && platform.deliveryThreshold > 0
        ? 0
        : platform.deliveryThreshold === 0
        ? 0
        : platform.avgDelivery;

    const total = price + deliveryCharge;
    const rating = parseFloat((3.5 + Math.random() * 1.5).toFixed(1));
    const reviewCount = Math.floor(Math.random() * 5000) + 100;
    const positiveReviews = Math.floor(70 + Math.random() * 28);

    return {
      platform,
      searchUrl: buildSearchUrl(platform, encodeURIComponent(normalizedQuery)),
      estimatedPrice: price,
      estimatedMrp: mrp,
      discount: discountPct,
      deliveryCharge,
      totalCost: total,
      rating,
      reviewCount,
      positiveReviews,
      inStock: Math.random() > 0.1,
      imageUrl: buildImageUrl(normalizedQuery, platform.id),
      productForm: form,
      productFormWarning: warning,
      priceInsight: generateMockPriceInsight(total),
    };
  });
}

function simulatePrice(query: string, category: string): number {
  const lq = query.toLowerCase();

  if (category === "medicines" || lq.includes("tablet") || lq.includes("capsule") || lq.includes("syrup") || lq.includes("syndopa") || lq.includes("cr")) {
    if (lq.includes("syndopa")) return 280;
    if (lq.includes("dolo") || lq.includes("crocin") || lq.includes("650")) return 30;
    if (lq.includes("strip") || lq.includes("pack")) return 120;
    return 80 + Math.random() * 200;
  }
  if (category === "grocery" || lq.includes("rice") || lq.includes("flour") || lq.includes("oil")) {
    return 50 + Math.random() * 300;
  }
  if (lq.includes("shampoo") || lq.includes("soap") || lq.includes("toothpaste")) {
    return 80 + Math.random() * 400;
  }
  if (category === "household" || lq.includes("detergent") || lq.includes("cleaner")) {
    return 100 + Math.random() * 500;
  }
  if (category === "stationary" || lq.includes("pen") || lq.includes("notebook")) {
    return 20 + Math.random() * 200;
  }
  return 100 + Math.random() * 500;
}

function generateMockPriceInsight(currentPrice: number) {
  // Generate 7 data points (last 7 days or something)
  const sparkline = Array.from({ length: 7 }, () => {
    // vary between 80% and 130% of current price to create some interesting spikes
    return currentPrice * (0.8 + Math.random() * 0.5);
  });
  
  // ensure the last point connects reasonably to current price
  sparkline.push(currentPrice);

  const max = Math.max(...sparkline);
  const min = Math.min(...sparkline);
  
  // Normalize sparkline values to 0-100 scale for CSS graph
  const range = max - min || 1;
  const normalizedSparkline = sparkline.map(v => Math.round(((v - min) / range) * 100));

  const avgSpark = sparkline.reduce((a, b) => a + b, 0) / sparkline.length;
  let label: "Low" | "Typical" | "High" = "Typical";
  
  if (currentPrice < avgSpark * 0.95) label = "Low";
  else if (currentPrice > avgSpark * 1.05) label = "High";

  return { label, sparkline: normalizedSparkline };
}

export function rankResults(results: SearchResult[]): SearchResult[] {
  if (!results || results.length === 0) return [];

  const sorted = [...results].sort((a, b) => {
    const costDiff = a.totalCost - b.totalCost;
    if (Math.abs(costDiff) < 5) return b.rating - a.rating;
    return costDiff;
  });

  sorted[0].badge = "🏆 Best Value";
  const fastest = [...results].sort((a, b) =>
    a.platform.deliveryDays.localeCompare(b.platform.deliveryDays)
  )[0];
  if (fastest && fastest.platform.id !== sorted[0].platform.id) {
    const fi = sorted.findIndex((r) => r.platform.id === fastest.platform.id);
    if (fi !== -1) sorted[fi].badge = "⚡ Fastest";
  }
  const bestRated = [...sorted].sort((a, b) => b.rating - a.rating)[0];
  if (bestRated && bestRated.platform.id !== sorted[0].platform.id) {
    const ri = sorted.findIndex((r) => r.platform.id === bestRated.platform.id);
    if (ri !== -1 && !sorted[ri].badge) sorted[ri].badge = "⭐ Best Rated";
  }

  return sorted;
}

// ── Multi-attribute sort ─────────────────────────────────────────────────────
export type SortField = "price" | "total" | "delivery" | "rating" | "reviews" | "positiveReviews" | "discount";
export type SortDir = "asc" | "desc";

export interface SortCriteria {
  field: SortField;
  dir: SortDir;
}

export function multiSort(results: SearchResult[], criteria: SortCriteria[]): SearchResult[] {
  if (!criteria.length) return results;
  return [...results].sort((a, b) => {
    for (const { field, dir } of criteria) {
      let va = 0, vb = 0;
      switch (field) {
        case "price":         va = a.estimatedPrice; vb = b.estimatedPrice; break;
        case "total":         va = a.totalCost;       vb = b.totalCost;       break;
        case "delivery":      va = a.deliveryCharge;  vb = b.deliveryCharge;  break;
        case "rating":        va = a.rating;          vb = b.rating;          break;
        case "reviews":       va = a.reviewCount;     vb = b.reviewCount;     break;
        case "positiveReviews": va = a.positiveReviews; vb = b.positiveReviews; break;
        case "discount":      va = a.discount;        vb = b.discount;        break;
      }
      if (va !== vb) return dir === "asc" ? va - vb : vb - va;
    }
    return 0;
  });
}
