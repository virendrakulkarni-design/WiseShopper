// app/api/clarify/route.ts
// Uses Gemini API to analyze ambiguous item queries and return clarification questions

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { item, language } = await req.json();

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    // Return a mock clarification when API key not set
    return NextResponse.json(buildMockClarification(item));
  }

  try {
    const prompt = buildPrompt(item, language);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.3,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Gemini API error");
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = JSON.parse(text);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Gemini API error:", err);
    return NextResponse.json(buildMockClarification(item));
  }
}

function buildPrompt(item: string, language: string): string {
  return `You are a smart Indian shopping assistant. Analyze this shopping item query: "${item}"
Language detected: ${language}

Respond ONLY with valid JSON matching this schema:
{
  "needsClarification": boolean,
  "category": "medicines" | "grocery" | "stationary" | "household" | "personal_care" | "healthcare" | "other",
  "normalizedName": "English product name",
  "clarificationQuestion": "question to ask if ambiguous (in same language as query)",
  "suggestions": ["suggestion1", "suggestion2", "suggestion3"],
  "manufacturer": "brand/manufacturer if clear from query or null",
  "strength": "dosage/strength/size if mentioned or null",
  "searchTerms": ["optimized search term 1", "optimized search term 2"]
}

Rules:
- needsClarification: true if item is ambiguous (e.g. just "pain oil" without brand, "paracetamol" without strength)
- Suggest top 3 popular Indian variants of the product
- searchTerms: 2 optimized English terms to search across platforms
- Be helpful — for clearly specified items like "Dolo 650 10 tablets", needsClarification=false`;
}

function buildMockClarification(item: string): object {
  const lq = item.toLowerCase();
  
  // Check if item is ambiguous (no brand/strength mentioned)
  const hasNumbers = /\d/.test(item);
  const hasBrand = ["dolo", "crocin", "combiflam", "volini", "dr ortho", "moov", "disprin",
    "zincovit", "becosules", "liv", "pantop", "omez", "eno", "vicks", "syndopa", "shelcal"].some(b => lq.includes(b));
  
  const isMedicine = ["tablet", "capsule", "syrup", "oil", "cream", "gel", "drops", "mg", 
    "ml", "pain", "fever", "cold", "cough", "headache", "cr", "strip", "syndopa"].some(k => lq.includes(k));

  const needsClarification = isMedicine && !hasBrand && !hasNumbers;

  let suggestions: string[] = [];
  let question = "";
  let category: string = "medicines";

  if (lq.includes("pain") && lq.includes("oil")) {
    suggestions = ["Dr Ortho Pain Relief Oil Strong", "Volini Pain Relief Spray 40g", "Moov Strong Gel 50g"];
    question = "Which pain relief oil brand/strength? / कौन सा दर्द निवारक तेल चाहिए?";
    category = "medicines";
  } else if (lq.includes("syndopa")) {
    suggestions = ["Syndopa CR 10 Tablets", "Syndopa Plus 10 Tablets", "Syndopa 110mg"];
    question = "Which Syndopa variant? (CR, Plus, or standard 110mg)?";
    category = "medicines";
  } else if (lq.includes("vitamin")) {
    suggestions = ["Zincovit Tablet 15s", "Becosules Capsules 20s", "Revital H Capsules 30s"];
    question = "Which vitamin supplement? / कौन सा विटामिन?";
    category = "healthcare";
  } else if (lq.includes("shampoo")) {
    suggestions = ["Head & Shoulders 200ml", "Dove Shampoo 180ml", "Clinic Plus 175ml"];
    question = "Which shampoo brand/size? / कौन सा शैम्पू?";
    category = "personal_care";
  } else if (lq.includes("rice") || lq.includes("चावल") || lq.includes("atta") || lq.includes("आटा") || lq.includes("oil") || lq.includes("sugar") || lq.includes("milk")) {
    suggestions = ["India Gate Basmati Rice 5kg", "Fortune Sella Basmati 5kg", "Daawat Long Grain 5kg"];
    question = "Which brand/quantity?";
    category = "grocery";
  } else if (isMedicine) {
    category = "medicines";
  } else {
    needsClarification === true && suggestions.push(item + " 1 pack", item + " bulk", item + " premium");
    question = `More details for "${item}"? / "${item}" के बारे में अधिक जानकारी?`;
    category = "all";
  }

  return {
    needsClarification,
    category,
    normalizedName: item,
    clarificationQuestion: question,
    suggestions,
    manufacturer: null,
    strength: null,
    searchTerms: [item, item + " india"],
  };
}
