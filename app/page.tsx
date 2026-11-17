"use client";

import { useState, useCallback, useEffect } from "react";
import { detectLanguage, normalizeToEnglish } from "@/lib/language-detector";
import { rankResults, SearchResult } from "@/lib/search-engine";
import { optimizeCart, BundlePlan } from "@/lib/price-optimizer";
import {
  loadHistory,
  wasItemPurchasedBefore,
  getTotalSavings,
  addPurchase,
  PurchaseRecord,
} from "@/lib/history-tracker";
import { getSavedLocation, saveSelectedLocation, LocationInfo } from "@/lib/locations";

// Modular Components
import { Navbar } from "@/components/navbar/Navbar";
import { SearchSection, ShoppingItem } from "@/components/search/SearchSection";
import { ResultsTable } from "@/components/results/ResultsTable";
import { CartOptimizer } from "@/components/optimizer/CartOptimizer";
import { HistoryView } from "@/components/history/HistoryView";
import { SavingsDashboard } from "@/components/savings/SavingsDashboard";
import { ClarificationModal, ClarificationData } from "@/components/ui/ClarificationModal";

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function WiseShopper() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [clarification, setClarification] = useState<ClarificationData | null>(null);
  const [isSearchingAll, setIsSearchingAll] = useState(false);
  const [cartPlans, setCartPlans] = useState<BundlePlan[]>([]);
  const [splitPlan, setSplitPlan] = useState<BundlePlan[]>([]);
  const [splitSavings, setSplitSavings] = useState(0);
  const [history, setHistory] = useState<PurchaseRecord[]>([]);
  const [stats, setStats] = useState({ totalSavings: 0, totalOrders: 0, topPlatform: "—", totalPoints: 0 });
  const [view, setView] = useState<"home" | "results" | "history" | "savings">("home");
  const [location, setLocationState] = useState<LocationInfo>(getSavedLocation());
  const [theme, setTheme] = useState<string>("light");
  const [cartSelections, setCartSelections] = useState<Record<string, boolean>>({});
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const setLocation = (loc: LocationInfo) => {
    setLocationState(loc);
    saveSelectedLocation(loc);
    showToast(`📍 Location updated to ${loc.area}, ${loc.city} (${loc.pincode})`);
  };

  useEffect(() => {
    setHistory(loadHistory());
    setStats(getTotalSavings());
    setLocationState(getSavedLocation());
  }, []);

  useEffect(() => {
    document.body.classList.remove("theme-light", "theme-dark", "theme-professional");
    document.body.classList.add(`theme-${theme}`);
  }, [theme]);

  // ── Add single item ──
  const addItem = (itemText: string) => {
    const lang = detectLanguage(itemText);
    const normalized = lang !== "en" ? normalizeToEnglish(itemText) : itemText;
    const prev = wasItemPurchasedBefore(normalized);
    const newItem: ShoppingItem = {
      id: genId(),
      raw: itemText,
      normalized,
      language: lang,
      category: "all",
      status: "idle",
      results: undefined,
      prevPurchase: prev,
    };
    setItems((prevItems) => [...prevItems, newItem]);
    showToast(`🛒 Added "${itemText}"`);
  };

  // ── Add multiple items ──
  const addMultipleItems = (itemTexts: string[]) => {
    const newItems: ShoppingItem[] = itemTexts.map((text) => {
      const lang = detectLanguage(text);
      const normalized = lang !== "en" ? normalizeToEnglish(text) : text;
      const prev = wasItemPurchasedBefore(normalized);
      return {
        id: genId(),
        raw: text,
        normalized,
        language: lang,
        category: "all",
        status: "idle",
        results: undefined,
        prevPurchase: prev,
      };
    });
    setItems((prev) => [...prev, ...newItems]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const clearItems = () => {
    setItems([]);
  };

  // ── Clarify item with Gemini ──
  const clarifyItem = useCallback(async (item: ShoppingItem) => {
    try {
      const res = await fetch("/api/clarify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item: item.normalized, language: item.language }),
      });
      const data = await res.json();

      if (data.needsClarification && data.suggestions?.length > 0) {
        setClarification({
          itemId: item.id,
          itemRaw: item.raw,
          question: data.clarificationQuestion || "Please clarify specification:",
          suggestions: data.suggestions,
          category: data.category || "all",
        });
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, status: "clarifying" } : i))
        );
        return false;
      }

      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? { ...i, category: data.category || "all", normalized: data.normalizedName || i.normalized }
            : i
        )
      );
      return true;
    } catch {
      return true;
    }
  }, []);

  // ── Search single item ──
  const searchItem = useCallback(async (item: ShoppingItem): Promise<SearchResult[]> => {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: "searching" } : i)));

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item: item.normalized, category: item.category }),
      });
      const data = await res.json();
      const results: SearchResult[] = data.results || [];

      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, status: "done", results } : i
        )
      );
      return results;
    } catch {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: "error" } : i)));
      return [];
    }
  }, []);

  // ── Immediate Single Item Search ──
  const handleInstantSearch = async (text: string) => {
    if (!text || !text.trim()) return;
    const clean = text.trim();
    const lang = detectLanguage(clean);
    const normalized = lang !== "en" ? normalizeToEnglish(clean) : clean;
    const prev = wasItemPurchasedBefore(normalized);
    const newItem: ShoppingItem = {
      id: genId(),
      raw: clean,
      normalized,
      language: lang,
      category: "all",
      status: "searching",
      results: undefined,
      prevPurchase: prev,
    };

    setItems((prevItems) => {
      const existing = prevItems.filter((i) => i.raw.toLowerCase() !== clean.toLowerCase());
      return [...existing, newItem];
    });

    setActiveItemId(newItem.id);
    setView("results");
    setIsSearchingAll(true);

    // Run direct search immediately without blocking
    const results = await searchItem(newItem);
    if (results.length > 0) {
      setActiveItemId(newItem.id);
      const { singlePlatformPlans, bestSplit, savings } = optimizeCart([
        { itemName: newItem.normalized, results },
      ]);
      setCartPlans(singlePlatformPlans);
      setSplitPlan(bestSplit);
      setSplitSavings(savings);
    }
    setIsSearchingAll(false);
  };

  // ── Search ALL items & run cart optimizer ──
  const searchAll = async () => {
    if (items.length === 0) return;
    setIsSearchingAll(true);
    setView("results");

    const completedItems: { itemName: string; results: SearchResult[] }[] = [];
    let firstFoundId: string | null = null;

    for (const item of items) {
      if (item.status === "done" && item.results && item.results.length > 0) {
        completedItems.push({ itemName: item.normalized, results: item.results });
        if (!firstFoundId) firstFoundId = item.id;
        continue;
      }
      const results = await searchItem(item);
      if (results.length > 0) {
        completedItems.push({ itemName: item.normalized, results });
        if (!firstFoundId) firstFoundId = item.id;
      }
    }

    if (firstFoundId) {
      setActiveItemId(firstFoundId);
    } else if (items[0]) {
      setActiveItemId(items[0].id);
    }

    if (completedItems.length > 0) {
      const { singlePlatformPlans, bestSplit, savings } = optimizeCart(completedItems);
      setCartPlans(singlePlatformPlans);
      setSplitPlan(bestSplit);
      setSplitSavings(savings);
    }
    setIsSearchingAll(false);
  };

  // ── Clarification resolution ──
  const resolveClarification = async (selectedText: string) => {
    if (!clarification) return;
    const { itemId, category } = clarification;
    const updatedItem = items.find((i) => i.id === itemId);
    if (!updatedItem) return;

    const newItem: ShoppingItem = {
      ...updatedItem,
      normalized: selectedText,
      category,
      status: "searching",
    };

    setItems((prev) => prev.map((i) => (i.id === itemId ? newItem : i)));
    setClarification(null);
    setIsSearchingAll(true);

    const results = await searchItem(newItem);
    if (results.length > 0) {
      setActiveItemId(newItem.id);
      const { singlePlatformPlans, bestSplit, savings } = optimizeCart([
        { itemName: newItem.normalized, results },
      ]);
      setCartPlans(singlePlatformPlans);
      setSplitPlan(bestSplit);
      setSplitSavings(savings);
    }
    setIsSearchingAll(false);
  };

  // ── Search generic alternative ──
  const searchGenericAlternative = (genericName: string) => {
    addItem(genericName);
    showToast(`🌿 Added generic "${genericName}" to comparison list!`);
  };

  // ── Toggle cart selection ──
  const toggleCartSelection = (key: string, result: SearchResult, item: ShoppingItem) => {
    setCartSelections((prev) => {
      const next = { ...prev };
      if (next[key]) {
        delete next[key];
      } else {
        next[key] = true;
      }
      return next;
    });
  };

  // ── Direct Browser CSV Export (Serverless Safe) ──
  const exportCartCsv = () => {
    const rows: string[] = [];
    rows.push(["Platform", "Item", "Price (INR)", "Delivery (INR)", "Total (INR)", "Link"].join(","));

    for (const key of Object.keys(cartSelections)) {
      if (!cartSelections[key]) continue;
      const [platformId, itemId] = key.split("-");
      const item = items.find((it) => it.id === itemId);
      if (!item || !item.results) continue;
      const result = item.results.find((r) => r.platform.id === platformId);
      if (!result) continue;

      rows.push([
        `"${result.platform.name}"`,
        `"${item.normalized}"`,
        result.estimatedPrice,
        result.deliveryCharge,
        result.totalCost,
        `"${result.searchUrl}"`,
      ].join(","));
    }

    if (rows.length <= 1) {
      showToast("Select at least 1 item using checkboxes to export.");
      return;
    }

    const csvContent = rows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `wiseshopper_cart_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("📥 Exported selected cart to CSV!");
  };

  // ── Record a purchase ──
  const handleRecordPurchase = (item: ShoppingItem, result: SearchResult) => {
    addPurchase({
      item: item.normalized,
      specification: item.raw,
      platform: result.platform.name,
      price: result.estimatedPrice,
      delivery: result.deliveryCharge,
      total: result.totalCost,
      mrp: result.estimatedMrp,
      savings: result.estimatedMrp - result.estimatedPrice,
      rating: result.rating,
      link: result.searchUrl,
      category: item.category,
      points_earned: Math.floor(result.estimatedPrice * 0.01),
      pincode: location.pincode,
      payment_method: "UPI",
    });
    setHistory(loadHistory());
    setStats(getTotalSavings());
    showToast(`✅ Purchase recorded! Saved ₹${result.estimatedMrp - result.estimatedPrice} on ${item.normalized}`);
  };

  const hasDoneResults = items.some((i) => i.status === "done" && i.results && i.results.length > 0);

  return (
    <div className="main-content">
      {/* Toast Notification */}
      {toastMsg && <div className="toast-notification">{toastMsg}</div>}

      {/* Navbar */}
      <Navbar
        view={view}
        setView={setView}
        theme={theme}
        setTheme={setTheme}
        location={location}
        setLocation={setLocation}
        hasResults={hasDoneResults}
      />

      {/* Clarification Modal */}
      <ClarificationModal
        clarification={clarification}
        onClose={() => setClarification(null)}
        onResolve={resolveClarification}
      />

      {/* HOME VIEW */}
      {view === "home" && (
        <SearchSection
          items={items}
          onAddItem={addItem}
          onAddMultipleItems={addMultipleItems}
          onRemoveItem={removeItem}
          onClearItems={clearItems}
          onSearchAll={searchAll}
          onInstantSearch={handleInstantSearch}
          isSearchingAll={isSearchingAll}
          onSelectActiveItem={(id) => {
            setActiveItemId(id);
            setView("results");
          }}
          showToast={showToast}
        />
      )}

      {/* RESULTS VIEW */}
      {view === "results" && (
        <section className="results-section">
          <div className="results-header">
            <div>
              <div className="results-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span>📊 Multi-Platform Price Comparison</span>
                <span style={{ fontSize: 12, padding: "2px 8px", background: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.4)", borderRadius: 12, fontWeight: 700 }}>
                  v2.2.0
                </span>
              </div>
              <div className="results-subtitle">
                Delivering to <strong>{location.area}, {location.city} ({location.pincode})</strong> • Real-time offers & live delivery charges
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-secondary" onClick={() => setView("home")}>
                ← Back to Search
              </button>
              {isSearchingAll && (
                <span className="btn-secondary">
                  <span className="spinner" /> Searching…
                </span>
              )}
            </div>
          </div>

          <div className="demo-notice">
            ℹ️ <strong>Live Price Mode</strong>: Prices shown are real-time estimates across Indian platforms. Click &nbsp;<strong>&ldquo;Store Name ↗&rdquo;</strong>&nbsp; to open the direct product page.
          </div>

          <ResultsTable
            items={items}
            activeItemId={activeItemId}
            setActiveItemId={setActiveItemId}
            cartSelections={cartSelections}
            onToggleCartSelection={toggleCartSelection}
            onRecordPurchase={handleRecordPurchase}
            onSearchGeneric={searchGenericAlternative}
            onExportCsv={exportCartCsv}
            pincode={location.pincode}
          />

          {/* Cart Optimizer Section */}
          <CartOptimizer
            plans={cartPlans}
            splitPlan={splitPlan}
            savings={splitSavings}
          />
        </section>
      )}

      {/* HISTORY VIEW */}
      {view === "history" && <HistoryView history={history} />}

      {/* SAVINGS VIEW */}
      {view === "savings" && <SavingsDashboard stats={stats} history={history} />}

      {/* FOOTER */}
      <footer className="footer">
        <div>🛒 WiseShopper — Smart Price Comparison & Cart Optimizer | Location: {location.city} ({location.pincode})</div>
        <div style={{ marginTop: 6 }}>
          Compare prices across Amazon, Flipkart, Blinkit, Zepto, Swiggy Instamart, 1mg, Apollo, Netmeds, DMart & 10+ Indian stores.
        </div>
      </footer>
    </div>
  );
}
