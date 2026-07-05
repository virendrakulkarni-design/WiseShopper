// lib/language-detector.ts
// Detects Hindi, Marathi, or English in item text and normalizes to English search queries

const hindiMarathiMap: Record<string, string> = {
  // Common medicines / healthcare
  "दवाई": "medicine", "दवा": "medicine", "औषध": "medicine",
  "पेनकिलर": "pain killer", "दर्द": "pain", "सर्दी": "cold",
  "खांसी": "cough", "खोकला": "cough", "ताप": "fever", "बुखार": "fever",
  "एंटीबायोटिक": "antibiotic", "विटामिन": "vitamin", "कैल्शियम": "calcium",
  "बीपी": "blood pressure", "शुगर": "sugar diabetes", "मलेरिया": "malaria",

  // Grocery
  "चावल": "rice", "गेहूं": "wheat", "आटा": "wheat flour", "दाल": "lentils",
  "चीनी": "sugar", "नमक": "salt", "तेल": "oil", "घी": "ghee",
  "दूध": "milk", "दही": "curd", "मसाला": "spices", "हल्दी": "turmeric",
  "मिर्ची": "chilli", "धनिया": "coriander", "जीरा": "cumin",
  "बेसन": "gram flour", "सूजी": "semolina", "मैदा": "maida",
  "किराना": "grocery", "सब्जी": "vegetable", "फल": "fruit",

  // Household
  "साबुन": "soap", "शैम्पू": "shampoo", "टूथपेस्ट": "toothpaste",
  "डिटर्जेंट": "detergent", "झाड़ू": "broom", "पोछा": "mop",
  "सफाई": "cleaning", "बर्तन": "utensils", "बाल्टी": "bucket",

  // Stationary
  "पेन": "pen", "पेंसिल": "pencil", "कॉपी": "notebook",
  "किताब": "book", "रबड़": "eraser", "स्केल": "ruler",
  "कटर": "cutter", "स्टेपलर": "stapler",

  // Common qualifiers
  "मजबूत": "strong", "शक्तिशाली": "powerful", "बड़ा": "large",
  "छोटा": "small", "सस्ता": "cheap", "अच्छा": "good quality",
  "तेज": "fast acting", "तुरंत": "instant",
};

export function detectLanguage(text: string): "en" | "hi" | "mr" | "mixed" {
  const devanagariPattern = /[\u0900-\u097F]/;
  const hasDevanagari = devanagariPattern.test(text);
  const hasLatin = /[a-zA-Z]/.test(text);

  if (hasDevanagari && hasLatin) return "mixed";
  if (hasDevanagari) return "hi"; // simplified — Marathi also uses Devanagari
  return "en";
}

export function normalizeToEnglish(text: string): string {
  let normalized = text;
  for (const [hindi, english] of Object.entries(hindiMarathiMap)) {
    normalized = normalized.replace(new RegExp(hindi, "g"), english);
  }
  return normalized.trim();
}

export function getLanguageLabel(lang: "en" | "hi" | "mr" | "mixed"): string {
  const labels: Record<string, string> = {
    en: "English",
    hi: "हिंदी",
    mr: "मराठी",
    mixed: "Mixed",
  };
  return labels[lang] || "English";
}

export function buildSearchQuery(rawItem: string): {
  query: string;
  language: "en" | "hi" | "mr" | "mixed";
  normalized: string;
} {
  const language = detectLanguage(rawItem);
  const normalized = language !== "en" ? normalizeToEnglish(rawItem) : rawItem;
  const query = encodeURIComponent(normalized);
  return { query, language, normalized };
}
