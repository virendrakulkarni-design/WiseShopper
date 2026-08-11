// app/api/vision/route.ts
// Analyzes images (prescriptions, product photos, handwritten lists) using Gemini 1.5 Flash Vision
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mimeType = "image/jpeg" } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Strip data url prefix if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    if (GEMINI_API_KEY && GEMINI_API_KEY !== "your_gemini_api_key_here") {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `You are a smart shopping assistant for Indian e-commerce.
Analyze this image, which could be:
1. A photo of a physical product or package
2. A handwritten or printed grocery shopping list
3. A medical prescription or medicine packaging

Extract all identifiable items to buy.
Return ONLY valid JSON with this exact schema:
{
  "detectedType": "prescription" | "product_photo" | "grocery_list" | "other",
  "items": [
    {
      "name": "Exact standard product name with brand/weight/dosage",
      "category": "medicines" | "grocery" | "personal_care" | "household" | "electronics" | "other",
      "confidence": "high" | "medium" | "low"
    }
  ],
  "summary": "Brief 1-sentence description of what was detected"
}`;

      const imagePart = {
        inlineData: {
          data: base64Data,
          mimeType: mimeType,
        },
      };

      const result = await model.generateContent([prompt, imagePart]);
      const text = result.response.text();

      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : text.trim();
      const parsed = JSON.parse(jsonStr);

      return NextResponse.json(parsed);
    } else {
      // Fallback demo response if no Gemini API key configured
      return NextResponse.json({
        detectedType: "product_photo",
        items: [
          { name: "Tata Salt 1kg", category: "grocery", confidence: "high" },
          { name: "Fortune Sunflower Oil 1L", category: "grocery", confidence: "medium" },
        ],
        summary: "Demo mode: Detected household grocery items (Add Gemini API key for live OCR vision)",
      });
    }
  } catch (error) {
    console.error("[api/vision] error:", error);
    return NextResponse.json(
      {
        detectedType: "product_photo",
        items: [{ name: "Tata Salt 1kg", category: "grocery", confidence: "medium" }],
        summary: "Could not complete live OCR, fell back to sample item.",
      },
      { status: 200 }
    );
  }
}
