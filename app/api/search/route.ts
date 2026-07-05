// app/api/search/route.ts
// Returns ranked search results for an item across all relevant platforms

import { NextRequest, NextResponse } from "next/server";
import { getAllSearchResults, rankResults } from "@/lib/search-engine";
import { buildSearchQuery } from "@/lib/language-detector";

export async function POST(req: NextRequest) {
  const { item, category = "all", cartValue = 0 } = await req.json();

  if (!item || item.trim() === "") {
    return NextResponse.json({ error: "Item name required" }, { status: 400 });
  }

  const { normalized, language, query } = buildSearchQuery(item.trim());
  const results = await getAllSearchResults(normalized, category, cartValue);
  const ranked = rankResults(results);

  return NextResponse.json({
    item,
    normalized,
    language,
    results: ranked,
    totalPlatforms: ranked.length,
    bestPrice: ranked[0]?.totalCost,
    bestPlatform: ranked[0]?.platform.name,
  });
}
