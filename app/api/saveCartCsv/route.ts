import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { selections, items, timestamp } = await request.json();
    // selections: {"platformId-itemId": true}
    // items: array of items with id, normalized, results
    const rows: string[] = [];
    const header = ['Platform', 'Item', 'Price (INR)', 'Link'];
    rows.push(header.join(','));
    for (const key of Object.keys(selections)) {
      if (!selections[key]) continue;
      const [platformId, itemId] = key.split('-');
      const item = items.find((it: any) => it.id === itemId);
      if (!item || !item.results) continue;
      const result = item.results.find((r: any) => r.platform.id === platformId);
      if (!result) continue;
      const line = [
        `"${result.platform.name}"`,
        `"${item.normalized}"`,
        result.estimatedPrice,
        `"${result.searchUrl}"`
      ].join(',');
      rows.push(line);
    }
    const csvContent = rows.join('\n');
    const fileName = `cart_selections_${timestamp}.csv`;
    const publicDir = path.join(process.cwd(), 'public');
    const filePath = path.join(publicDir, fileName);
    await fs.writeFile(filePath, csvContent, 'utf8');
    return NextResponse.json({ success: true, fileName });
  } catch (error) {
    console.error('[saveCartCsv] error', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
