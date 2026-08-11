import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { selections, items, timestamp } = await request.json();
    const rows: string[] = [];
    const header = ['Platform', 'Item', 'Price (INR)', 'Link'];
    rows.push(header.join(','));
    for (const key of Object.keys(selections || {})) {
      if (!selections[key]) continue;
      const [platformId, itemId] = key.split('-');
      const item = (items || []).find((it: any) => it.id === itemId);
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
    const fileName = `cart_selections_${timestamp || Date.now()}.csv`;
    return NextResponse.json({ success: true, fileName, csvContent });
  } catch (error) {
    console.error('[saveCartCsv] error', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

