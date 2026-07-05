// lib/cart-tracker.ts
// Simple cart management for selected items, persisted in localStorage and exportable as CSV

export interface CartItem {
  id: string; // unique timestamp id
  item: string; // normalized item name
  platform: string;
  price: number;
  link: string;
  addedAt: string; // ISO timestamp
}

const CART_KEY = "wiseshopper_cart";

export function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CartItem[];
  } catch {
    return [];
  }
}

export function saveCart(items: CartItem[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export function addToCart(item: Omit<CartItem, "id" | "addedAt">): CartItem {
  const cart = loadCart();
  const newItem: CartItem = {
    ...item,
    id: Date.now().toString(),
    addedAt: new Date().toISOString(),
  };
  cart.unshift(newItem);
  saveCart(cart);
  return newItem;
}

export function exportCartCSV(): string {
  const cart = loadCart();
  const header = ["id","item","platform","price","link","addedAt"].join(",");
  const rows = cart.map((c) =>
    [c.id, `"${c.item}"`, `"${c.platform}"`, c.price, `"${c.link}"`, c.addedAt].join(",")
  );
  return [header, ...rows].join("\n");
}

export function downloadCartCSV(): void {
  const csv = exportCartCSV();
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `wiseshopper_cart_${new Date().toISOString().slice(0,10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
