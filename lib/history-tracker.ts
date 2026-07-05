// lib/history-tracker.ts
// Local CSV purchase history management using papaparse

import Papa from "papaparse";
import { format } from "date-fns";

export interface PurchaseRecord {
  id: string;
  date: string;
  item: string;
  specification: string;
  platform: string;
  price: number;
  delivery: number;
  total: number;
  mrp: number;
  savings: number;
  rating: number;
  link: string;
  category: string;
  points_earned: number;
  pincode: string;
  payment_method: string;
}

const STORAGE_KEY = "wiseshopper_history";

export function loadHistory(): PurchaseRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = Papa.parse<PurchaseRecord>(raw, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
    });
    return parsed.data || [];
  } catch {
    return [];
  }
}

export function saveHistory(records: PurchaseRecord[]): void {
  if (typeof window === "undefined") return;
  const csv = Papa.unparse(records, { header: true });
  localStorage.setItem(STORAGE_KEY, csv);
}

export function addPurchase(record: Omit<PurchaseRecord, "id" | "date">): PurchaseRecord {
  const history = loadHistory();
  const newRecord: PurchaseRecord = {
    ...record,
    id: Date.now().toString(),
    date: format(new Date(), "yyyy-MM-dd HH:mm"),
  };
  history.unshift(newRecord);
  saveHistory(history);
  return newRecord;
}

export function wasItemPurchasedBefore(itemName: string): PurchaseRecord | null {
  const history = loadHistory();
  const lq = itemName.toLowerCase().trim();
  return (
    history.find((r) =>
      r.item.toLowerCase().includes(lq) || lq.includes(r.item.toLowerCase())
    ) || null
  );
}

export function getTotalSavings(): {
  totalSavings: number;
  totalOrders: number;
  topPlatform: string;
  totalPoints: number;
} {
  const history = loadHistory();
  const totalSavings = history.reduce((sum, r) => sum + (r.savings || 0), 0);
  const totalPoints = history.reduce((sum, r) => sum + (r.points_earned || 0), 0);

  const platformCounts: Record<string, number> = {};
  history.forEach((r) => {
    platformCounts[r.platform] = (platformCounts[r.platform] || 0) + 1;
  });
  const topPlatform =
    Object.entries(platformCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  return {
    totalSavings,
    totalOrders: history.length,
    topPlatform,
    totalPoints,
  };
}

export function exportHistoryCSV(): string {
  const history = loadHistory();
  return Papa.unparse(history, { header: true });
}

export function downloadHistoryCSV(): void {
  const csv = exportHistoryCSV();
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `wiseshopper_history_${format(new Date(), "yyyyMMdd")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function getPointsByPlatform(): Record<string, number> {
  const history = loadHistory();
  const points: Record<string, number> = {};
  history.forEach((r) => {
    points[r.platform] = (points[r.platform] || 0) + (r.points_earned || 0);
  });
  return points;
}
