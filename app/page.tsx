"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { detectLanguage, getLanguageLabel, normalizeToEnglish } from "@/lib/language-detector";
import { rankResults, getAllSearchResults, SearchResult, multiSort, SortCriteria, SortField } from "@/lib/search-engine";
import { optimizeCart, CartItem, BundlePlan } from "@/lib/price-optimizer";
import {
  loadHistory,
  wasItemPurchasedBefore,
  getTotalSavings,
  downloadHistoryCSV,
  addPurchase,
  PurchaseRecord,
} from "@/lib/history-tracker";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ShoppingItem {
  id: string;
  raw: string;
  normalized: string;
  language: "en" | "hi" | "mr" | "mixed";
  category: string;
  status: "idle" | "clarifying" | "searching" | "done" | "error";
  results?: SearchResult[];
  prevPurchase?: PurchaseRecord | null;
}

interface Clarification {
  itemId: string;
  itemRaw: string;
  question: string;
  suggestions: string[];
  category: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function genId() {
  return Math.random().toString(36).slice(2, 10);
}

function renderStars(rating: number) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  let s = "★".repeat(full);
  if (half) s += "½";
  return s;
}

function formatINR(n: number) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}
// ── Cart CSV handling ────────────────────────────────────────
function addToCart(item: { item: string; platform: string; price: number; link: string }) {
  // Open the platform link in a new tab to allow user to add the item to cart.
  if (item.link) {
    window.open(item.link, "_blank");
    console.log(`addToCart: Opened ${item.platform} for ${item.item} (${formatINR(item.price)})`);
  } else {
    console.warn('addToCart: No link provided for', item);
  }
}


const QUICK_ITEMS = [
  "Dolo 650 strip",
  "Surf Excel 1kg",
  "Amul Butter 500g",
  "Colgate Toothpaste",
  "Dr Ortho Oil",
  "Tata Salt 1kg",
];

const SORT_FIELDS: { field: SortField; label: string; icon: string; defaultDir: "asc" | "desc" }[] = [
  { field: "total",          label: "Total Price",      icon: "₹",  defaultDir: "asc"  },
  { field: "price",          label: "Item Price",       icon: "🏷️", defaultDir: "asc"  },
  { field: "delivery",       label: "Delivery",         icon: "🚚", defaultDir: "asc"  },
  { field: "rating",         label: "Rating",           icon: "⭐", defaultDir: "desc" },
  { field: "reviews",        label: "No. of Reviews",   icon: "💬", defaultDir: "desc" },
  { field: "positiveReviews",label: "Positive Reviews", icon: "👍", defaultDir: "desc" },
  { field: "discount",       label: "Discount %",       icon: "🎯", defaultDir: "desc" },
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function WiseShopper() {
  const [inputText, setInputText] = useState("");
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [clarification, setClarification] = useState<Clarification | null>(null);
  const [clarificationInput, setClarificationInput] = useState("");
  const [isSearchingAll, setIsSearchingAll] = useState(false);
  const [cartPlans, setCartPlans] = useState<BundlePlan[]>([]);
  const [selectedPlanIdx, setSelectedPlanIdx] = useState(0);
  const [history, setHistory] = useState<PurchaseRecord[]>([]);
  const [stats, setStats] = useState({ totalSavings: 0, totalOrders: 0, topPlatform: "—", totalPoints: 0 });
  const [view, setView] = useState<"home" | "results" | "history" | "savings">("home");
  const [detectedLang, setDetectedLang] = useState<"en" | "hi" | "mr" | "mixed">("en");
  // Multi-sort state: array of {field, dir} in priority order
  const [sortCriteria, setSortCriteria] = useState<SortCriteria[]>([]);
  // Filter state (intelligent filters)
  const [filterFreeOnly, setFilterFreeOnly] = useState(false);
  const [filterInStockOnly, setFilterInStockOnly] = useState(false);
  const [filterPriceMin, setFilterPriceMin] = useState<string>('');
  const [filterPriceMax, setFilterPriceMax] = useState<string>('');
  const [filterRatingMin, setFilterRatingMin] = useState<string>('');
  const [filterDiscountMin, setFilterDiscountMin] = useState<string>('');
  // Theme selector state
  const [theme, setTheme] = useState<string>('light');
  // Image zoom overlay
  const [zoomImg, setZoomImg] = useState<{ url: string; platform: string; x: number; y: number } | null>(null);
  // Cart selections state (checkboxes)
  const [cartSelections, setCartSelections] = useState<Record<string, boolean>>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setHistory(loadHistory()); setStats(getTotalSavings()); }, []);

  // Export cart to CSV
  const exportCartCsv = async () => {
    try {
      const response = await fetch("/api/saveCartCsv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selections: cartSelections,
          items,
          timestamp: new Date().toISOString().replace(/[:.]/g, "-")
        })
      });
      const data = await response.json();
      if (data.success && data.fileName) {
        const link = document.createElement("a");
        link.href = `/${data.fileName}`;
        link.download = data.fileName;
        link.click();
      } else {
        alert("Failed to export CSV");
      }
    } catch (e) {
      console.error(e);
      alert("Error exporting CSV");
    }
  };

  // Sync cart selections to CSV on each change
  useEffect(() => {
    if (Object.keys(cartSelections).length === 0) return;
    (async () => {
      try {
        await fetch("/api/saveCartCsv", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            selections: cartSelections,
            items,
            timestamp: new Date().toISOString().replace(/[:.]/g, "-")
          })
        });
      } catch (e) {
        console.error("Failed to sync cart CSV", e);
      }
    })();
  }, [cartSelections, items]);

  // Apply theme class to root element
  useEffect(() => {
    document.body.classList.remove('theme-light', 'theme-dark', 'theme-professional');
    document.body.classList.add(`theme-${theme}`);
  }, [theme]);

  // ── Language detection on typing ──
  const handleInputChange = (val: string) => {
    setInputText(val);
    const lang = detectLanguage(val);
    setDetectedLang(lang);
  };

  // ── Parse lines from textarea into item list ──
  const parseItems = () => {
    const lines = inputText
      .split(/[\n,]+/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length === 0) return;
    const newItems: ShoppingItem[] = lines.map((line) => {
      const language = detectLanguage(line);
      const normalized = language !== "en" ? normalizeToEnglish(line) : line;
      const prev = wasItemPurchasedBefore(normalized);
      return {
        id: genId(),
        raw: line,
        normalized,
        language,
        category: "all",
        status: "idle",
        results: undefined,
        prevPurchase: prev,
      };
    });
    setItems((prev) => [...prev, ...newItems]);
    setInputText("");
    textareaRef.current?.focus();
  };

  // ── Clarify one item via Gemini API ──
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
          question: data.clarificationQuestion || "Please specify:",
          suggestions: data.suggestions,
          category: data.category || "all",
        });
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, status: "clarifying" } : i))
        );
        return false; // needs clarification
      }

      // Update category from Gemini
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? { ...i, category: data.category || "all", normalized: data.normalizedName || i.normalized }
            : i
        )
      );
      return true; // can search directly
    } catch {
      return true; // proceed without clarification on error
    }
  }, []);

  // ── Search a single item ──
  const searchItem = useCallback(async (item: ShoppingItem) => {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: "searching" } : i)));

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item: item.normalized, category: item.category }),
      });
      const data = await res.json();

      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, status: "done", results: data.results || [] } : i
        )
      );
    } catch {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: "error" } : i)));
    }
  }, []);

  // ── Search ALL items ──
  const searchAll = async () => {
    if (items.length === 0) return;
    setIsSearchingAll(true);
    setView("results");

    for (const item of items) {
      if (item.status === "done") continue;
      const canSearch = await clarifyItem(item);
      if (canSearch) await searchItem(item);
    }

    // Build cart optimizer plans
    const cartItems: CartItem[] = items
      .filter((i) => i.results && i.results.length > 0)
      .map((i) => ({ itemName: i.normalized, results: i.results! }));

    const { singlePlatformPlans } = optimizeCart(cartItems);
    setCartPlans(singlePlatformPlans);
    setIsSearchingAll(false);
  };

  // ── Handle clarification resolution ──
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
    await searchItem(newItem);
  };

  // ── Record a purchase ──
  const recordPurchase = (item: ShoppingItem, result: SearchResult) => {
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
      pincode: "411017",
      payment_method: "UPI",
    });
    setHistory(loadHistory());
    setStats(getTotalSavings());
    alert(`✅ Purchase recorded! You saved ${formatINR(result.estimatedMrp - result.estimatedPrice)} on ${item.normalized}`);
  };

  const activeItem = activeItemId ? items.find((i) => i.id === activeItemId) : null;

  return (
    <div>
      {/* ─── NAVBAR ─────────────────────────────────────────────── */}
      <nav className="navbar">
        <div className="logo">
          <span className="logo-icon">🛒</span>
          WiseShopper
        </div>
        <div className="nav-links">
          <button className={`nav-btn ${view === "home" ? "active" : ""}`} onClick={() => setView("home")}>
            🏠 Home
          </button>
          {items.some((i) => i.status === "done") && (
            <button className={`nav-btn ${view === "results" ? "active" : ""}`} onClick={() => setView("results")}>
              📊 Results
            </button>
          )}
          <button className={`nav-btn ${view === "history" ? "active" : ""}`} onClick={() => { setView("history"); setHistory(loadHistory()); setStats(getTotalSavings()); }}>
            📋 History
          </button>
          <button className={`nav-btn ${view === "savings" ? "active" : ""}`} onClick={() => setView("savings")}>
            💰 Savings
          </button>
        </div>
        <div className="pincode-badge">
          📍 411017 Pune
        </div>
        <div className="theme-select">
          <select value={theme} onChange={e => setTheme(e.target.value)} className="theme-dropdown">
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="professional">Professional</option>
          </select>
        </div>
      </nav>

      {/* ─── CLARIFICATION MODAL ────────────────────────────────── */}
      {clarification && (
        <div className="modal-overlay" onClick={() => setClarification(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">🔍 एक मिनट / Clarification Needed</div>
            <div className="modal-question">
              <strong>"{clarification.itemRaw}"</strong> — {clarification.question}
            </div>
            {clarification.suggestions.map((s) => (
              <button key={s} className="suggestion-btn" onClick={() => resolveClarification(s)}>
                {s}
              </button>
            ))}
            <div className="manual-input-group" style={{ marginTop: 16 }}>
              <input
                className="manual-input"
                placeholder="Type exact product name / सटीक नाम लिखें..."
                value={clarificationInput}
                onChange={(e) => setClarificationInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && clarificationInput && resolveClarification(clarificationInput)}
              />
              <button
                className="btn-primary"
                style={{ flex: "0 0 auto", minWidth: "unset", padding: "10px 16px" }}
                onClick={() => clarificationInput && resolveClarification(clarificationInput)}
              >
                OK
              </button>
            </div>
            <button className="btn-secondary" style={{ marginTop: 12, width: "100%", justifyContent: "center" }}
              onClick={() => { setClarification(null); resolveClarification(clarification.itemRaw); }}>
              Search as-is / जैसा है वैसे खोजें
            </button>
          </div>
        </div>
      )}

      {/* ─── HOME VIEW ──────────────────────────────────────────── */}
      {view === "home" && (
        <>
          {/* Platform Categories */}
          <div className="platform-strip" style={{ marginTop: 40, gap: 12 }}>
            <div className="platform-pill" style={{ background: "rgba(59, 130, 246, 0.1)", color: "#60a5fa", borderColor: "rgba(59, 130, 246, 0.3)" }}>
              💊 Pharmacy & Medical
            </div>
            <div className="platform-pill" style={{ background: "rgba(249, 115, 22, 0.1)", color: "#fb923c", borderColor: "rgba(249, 115, 22, 0.3)" }}>
              🛒 Grocery & Daily Needs
            </div>
            <div className="platform-pill" style={{ background: "rgba(168, 85, 247, 0.1)", color: "#c084fc", borderColor: "rgba(168, 85, 247, 0.3)" }}>
              💄 Health, Beauty & Nutrition
            </div>
            <div className="platform-pill" style={{ background: "rgba(34, 197, 94, 0.1)", color: "#4ade80", borderColor: "rgba(34, 197, 94, 0.3)" }}>
              🛍️ General E-Commerce
            </div>
          </div>

          {/* Stats */}
          {stats.totalOrders > 0 && (
            <div className="savings-strip">
              <div className="stat-card">
                <div className="stat-icon">💰</div>
                <div className="stat-value">{formatINR(stats.totalSavings)}</div>
                <div className="stat-label">Total Saved</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🛍️</div>
                <div className="stat-value">{stats.totalOrders}</div>
                <div className="stat-label">Orders Tracked</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🏆</div>
                <div className="stat-value" style={{fontSize:16}}>{stats.topPlatform}</div>
                <div className="stat-label">Top Platform</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">⭐</div>
                <div className="stat-value">{stats.totalPoints}</div>
                <div className="stat-label">Points Earned</div>
              </div>
            </div>
          )}

          {/* Search card */}
          <section className="search-section">
            <div className="search-card">
              <div className="search-header">
                <span className="search-label">🛒 Add items to your shopping list</span>
                <span className={`lang-badge lang-${detectedLang}`}>
                  {getLanguageLabel(detectedLang)}
                </span>
              </div>
              <textarea
                ref={textareaRef}
                className="item-input"
                value={inputText}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    parseItems();
                  }
                }}
                placeholder={`Type items and press Enter (one per line or comma-separated)\nExamples:\nDolo 650 tablets\nAmul Butter 500g\nDr Ortho Pain Oil Strong\n\nहिंदी में भी लिख सकते हैं: दर्द की दवाई, चावल 5kg\nमराठी: साबण, कांदा पावडर`}
              />
              <div className="quick-adds">
                <span style={{fontSize:11, color:'var(--text-muted)', alignSelf:'center'}}>Quick add:</span>
                {QUICK_ITEMS.map((q) => (
                  <button key={q} className="quick-chip" onClick={() => { setInputText(q); handleInputChange(q); }}>
                    {q}
                  </button>
                ))}
              </div>
              <div className="search-actions">
                <button className="btn-primary" onClick={parseItems} disabled={!inputText.trim()}>
                  ➕ Add to List
                </button>
                <button
                  className="btn-primary"
                  style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", boxShadow: "0 4px 15px rgba(34,197,94,0.35)" }}
                  onClick={searchAll}
                  disabled={items.length === 0 || isSearchingAll}
                >
                  {isSearchingAll ? <><span className="spinner" />&nbsp;Searching…</> : "🔍 Search Best Prices"}
                </button>
                {items.length > 0 && (
                  <button className="btn-secondary" onClick={() => setItems([])}>
                    🗑️ Clear
                  </button>
                )}
              </div>
            </div>

            {/* Item list */}
            {items.length > 0 && (
              <div className="item-list">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={`item-tag ${item.prevPurchase ? "purchased" : ""} ${item.status === "searching" ? "searching" : ""}`}
                    onClick={() => { if (item.status === "done") { setActiveItemId(item.id); setView("results"); }}}
                    style={{ cursor: item.status === "done" ? "pointer" : "default" }}
                  >
                    <span style={{fontSize: 20}}>
                      {item.status === "searching" ? "⏳" : item.status === "done" ? "✅" : item.status === "error" ? "❌" : "📦"}
                    </span>
                    <div style={{flex:1}}>
                      <div className="item-tag-name">{item.raw}</div>
                      {item.normalized !== item.raw && (
                        <div style={{fontSize:11, color:'var(--text-muted)'}}>→ {item.normalized}</div>
                      )}
                    </div>
                    {item.prevPurchase && (
                      <span className="item-badge badge-purchased">
                        ⭐ Prev. Purchased
                      </span>
                    )}
                    {item.category !== "all" && (
                      <span className="item-badge badge-cat">{item.category}</span>
                    )}
                    {item.status === "done" && (
                      <span className="item-badge badge-done">
                        {item.results?.length} platforms
                      </span>
                    )}
                    <button className="item-remove" onClick={(e) => { e.stopPropagation(); setItems((prev) => prev.filter((i) => i.id !== item.id)); }}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* ─── FIXED ZOOM OVERLAY ─────────────────────────────────── */}
      {zoomImg && (
        <div
          className={`img-zoom-overlay visible`}
          style={{ top: Math.min(zoomImg.y - 30, window.innerHeight - 290), left: Math.min(zoomImg.x + 20, window.innerWidth - 250) }}
        >
          <img src={zoomImg.url} alt="Product preview" />
          <div className="zoom-footer">{zoomImg.platform} — Image preview. Click Open ↗ for real photo.</div>
        </div>
      )}

      {/* ─── RESULTS VIEW ───────────────────────────────────────── */}
      {view === "results" && (
        <section className="results-section">
          <div className="results-header">
            <div>
              <div className="results-title">📊 Price Comparison Results</div>
              <div className="results-subtitle">
                Delivery to 411017 Pune • Prices are indicative — click platform to verify live price
              </div>
            </div>
            <div style={{display:"flex", gap:8}}>
              <button className="btn-secondary" onClick={() => setView("home")}>← Back</button>
              {isSearchingAll && <span className="btn-secondary"><span className="spinner" /> Searching…</span>}
            </div>
          </div>

          {/* Demo notice */}
          <div className="demo-notice">
            ℹ️ <strong>Demo Mode</strong>: Prices shown are estimated ranges for illustration. Click &nbsp;<strong>"Open ↗"</strong>&nbsp; for actual live price on each platform. Images are demo placeholders.
          </div>

          {/* Item tabs */}
          <div className="item-tabs">
            {items.filter(i => i.results && i.results.length > 0).map((item) => (
              <button
                key={item.id}
                className={`item-tab ${activeItemId === item.id ? "active" : ""}`}
                onClick={() => setActiveItemId(item.id)}
              >
                {item.prevPurchase && "⭐ "}{item.normalized}
              </button>
            ))}
          </div>
          {/* Results for selected item */}
          {activeItem?.results && activeItem.results.length > 0 && (() => {
            // Apply multi-sort on top of default ranking
            let sortedResults = sortCriteria.length > 0
               ? multiSort(activeItem.results, sortCriteria)
               : activeItem.results;
            // Apply intelligent filters
            const filteredResults = sortedResults.filter(r => {
              if (filterFreeOnly && r.deliveryCharge !== 0) return false;
              if (filterInStockOnly && !r.inStock) return false;
              if (filterPriceMin && r.estimatedPrice < Number(filterPriceMin)) return false;
              if (filterPriceMax && r.estimatedPrice > Number(filterPriceMax)) return false;
              if (filterRatingMin && r.rating < Number(filterRatingMin)) return false;
              if (filterDiscountMin && r.discount < Number(filterDiscountMin)) return false;
              return true;
            });
            const displayResults = filteredResults;
            // Product-form warning from first result
            const formWarning = activeItem.results[0]?.productFormWarning;
            const productForm = activeItem.results[0]?.productForm ?? "Item";

            return (
            <div className="results-table-wrap">
              {/* Previously purchased banner */}
              {activeItem.prevPurchase && (
                <div style={{padding:"14px 20px", background:"rgba(251,191,36,0.08)", borderBottom:"1px solid rgba(251,191,36,0.2)", fontSize:13, color:"#fbbf24", display:"flex", alignItems:"center", gap:8}}>
                  ⭐ <strong>Previously purchased</strong> on {activeItem.prevPurchase.platform} for {formatINR(activeItem.prevPurchase.total)} on {activeItem.prevPurchase.date}
                  {stats.totalPoints > 0 && <span style={{marginLeft:8, color:"#94a3b8"}}>• You have <strong>{stats.totalPoints} points</strong> that may apply!</span>}
                </div>
              )}

              {/* Ambiguity / confusion warning */}
              {formWarning && (
                <div className="ambiguity-banner">
                  <span style={{fontSize:18}}>⚠️</span>
                  <div>
                    <strong>Verify product type before buying!</strong> {formWarning}
                    <br/>
                    <span style={{color:"#94a3b8"}}>Tip: hover over any product image to zoom in, or click "Open ↗" to confirm on platform. You can also refine the search term (e.g. "Dr Ortho pain relief oil" instead of just "oil").</span>
                  </div>
                </div>
              )}

              {/* Sort bar */}
              <div className="sort-bar">
                <span className="sort-label">Sort by:</span>
                {SORT_FIELDS.map(({ field, label, icon, defaultDir }) => {
                  const idx = sortCriteria.findIndex(c => c.field === field);
                  const isActive = idx !== -1;
                  const criteria = isActive ? sortCriteria[idx] : null;
                  return (
                    <button
                      key={field}
                      className={`sort-chip ${isActive ? "active" : ""}`}
                      onClick={() => {
                        setSortCriteria(prev => {
                           const existing = prev.findIndex(c => c.field === field);
                           if (existing === -1) {
                             // Add with default direction
                             return [...prev, { field, dir: defaultDir }];
                           } else {
                             const currentDir = prev[existing].dir;
                             if (currentDir === "asc") {
                               // Switch to desc
                               const updated = [...prev];
                               updated[existing] = { field, dir: "desc" };
                               return updated;
                             } else {
                               // Remove criterion (none)
                               return prev.filter(c => c.field !== field);
                             }
                           }
                         });
                      }}
                      title={isActive ? `Priority ${idx+1} — click to toggle ↑↓, right-click to remove` : `Click to sort by ${label}`}
                    >
                      {isActive && <span className="sort-priority">{idx + 1}</span>}
                      <span>{icon} {label}</span>
                      {isActive && criteria && (
                        <span className="sort-dir-arrow">{criteria.dir === "asc" ? "↑" : "↓"}</span>
                      )}
                    </button>
                  );
                })}
                {sortCriteria.length > 0 && (
                  <button className="sort-clear-btn" onClick={() => setSortCriteria([])}>
                    ✕ Clear sort
                  </button>
                )}
                 {/* Intelligent Filters */}
                 <div className="filter-group">
                   <label className="filter-chip">
                     <input type="checkbox" checked={filterFreeOnly} onChange={() => setFilterFreeOnly(!filterFreeOnly)} />
                     <span>Free Delivery</span>
                   </label>
                   <label className="filter-chip">
                     <input type="checkbox" checked={filterInStockOnly} onChange={() => setFilterInStockOnly(!filterInStockOnly)} />
                     <span>In Stock</span>
                   </label>
                   <label className="filter-chip">
                     <span>Min Price (₹)</span>
                     <input type="number" min="0" value={filterPriceMin} onChange={e=>setFilterPriceMin(e.target.value)} />
                   </label>
                   <label className="filter-chip">
                     <span>Max Price (₹)</span>
                     <input type="number" min="0" value={filterPriceMax} onChange={e=>setFilterPriceMax(e.target.value)} />
                   </label>
                   <label className="filter-chip">
                     <span>Min Rating</span>
                     <input type="number" min="0" max="5" step="0.1" value={filterRatingMin} onChange={e=>setFilterRatingMin(e.target.value)} style={{width: 45}} />
                   </label>
                   <label className="filter-chip">
                     <span>Min Discount %</span>
                     <input type="number" min="0" max="100" value={filterDiscountMin} onChange={e=>setFilterDiscountMin(e.target.value)} style={{width: 45}} />
                   </label>
                 </div>
              </div>
              <table className="results-table">
                <thead>
                  <tr>
                    <th>Photo</th>
                    <th>Platform</th>
                    <th>Product Form</th>
                    <th>Price</th>
                    <th>Discount</th>
                    <th>Delivery</th>
                    <th>Delivery Date</th>
                    <th>Total</th>
                    <th>Rating & Reviews</th>
                    <th>Offer</th>
                    <th>Add to Cart</th>
                  </tr>
                </thead>
                <tbody>
                  {displayResults.map((r, idx) => (
                    <tr key={r.platform.id} className={idx === 0 && sortCriteria.length === 0 ? "best-row" : ""}>
                      {/* Product image with hover zoom */}
                      <td>
                        <div
                          className="img-thumb-wrap"
                          onMouseEnter={(e) => {
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            setZoomImg({ url: r.imageUrl, platform: r.platform.name, x: rect.right, y: rect.top });
                          }}
                          onMouseLeave={() => setZoomImg(null)}
                        >
                          <img
                            className="img-thumb"
                            src={r.imageUrl}
                            alt={`${activeItem.normalized} on ${r.platform.name}`}
                            loading="lazy"
                            onError={(e) => { (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='52' height='52'%3E%3Crect width='52' height='52' fill='%231a2235'/%3E%3Ctext x='26' y='34' text-anchor='middle' font-size='24'%3E📦%3C/text%3E%3C/svg%3E"; }}
                          />
                        </div>
                      </td>
                      {/* Platform */}
                      <td>
                        <div className="platform-cell">
                          <div className="platform-logo-circle" style={{ background: r.platform.color + "22" }}>
                            {r.platform.logo}
                          </div>
                          <div>
                            <a href={r.searchUrl} target="_blank" rel="noopener noreferrer" className="platform-link">{r.platform.name}</a>
                            <div className="platform-delivery">🚚 {r.platform.deliveryDays}</div>
                          </div>
                        </div>
                      </td>
                      {r.inStock ? (
                        <>
                          {/* Product form badge */}
                          <td>
                            <span className="form-badge">{r.productForm}</span>
                            {r.productFormWarning && (
                              <div style={{fontSize:10, color:"#fbbf24", marginTop:3}} title={r.productFormWarning}>⚠️ Verify</div>
                            )}
                          </td>
                          <td>
                            <div className="price-cell">{formatINR(r.estimatedPrice)}</div>
                            <div className="mrp-strike">MRP {formatINR(r.estimatedMrp)}</div>
                          </td>
                          <td><span className="discount-pct">-{r.discount}%</span></td>
                          <td>
                            {r.deliveryCharge === 0
                              ? <span className="delivery-free">FREE</span>
                              : <span className="delivery-paid">{formatINR(r.deliveryCharge)}</span>}
                          </td>
                          <td>{r.platform.deliveryDays}</td>
                          <td className="total-cell">{formatINR(r.totalCost)}</td>
                          <td>
                            <div className="rating-cell">
                              <span className="stars">{renderStars(r.rating)}</span>
                              <span>{r.rating}</span>
                            </div>
                            <div className="review-count">({r.reviewCount.toLocaleString("en-IN")} reviews)</div>
                            {/* Positive review bar */}
                            <div className="review-bar-wrap">
                              <div className="review-bar-track">
                                <div className="review-bar-fill" style={{ width: `${r.positiveReviews}%` }} />
                              </div>
                              <span className="review-bar-pct">{r.positiveReviews}% 👍</span>
                            </div>
                          </td>
                          <td>
                            {r.badge && (
                              <span className={`result-badge ${
                                r.badge.includes("Value") ? "badge-best" :
                                r.badge.includes("Fast") ? "badge-fastest" : "badge-rated"
                              }`}>{r.badge}</span>
                            )}
                            {r.platform.specialOffer && (
                              <div style={{fontSize:10, color:"#94a3b8", marginTop:2}}>{r.platform.specialOffer}</div>
                            )}
                            </td>
                          <td>
                            <input
                              type="checkbox"
                              checked={!!cartSelections[`${r.platform.id}-${activeItem.id}`]}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                if (checked) {
                                  addToCart({
                                    item: activeItem.normalized,
                                    platform: r.platform.name,
                                    price: r.estimatedPrice,
                                    link: r.searchUrl,
                                  });
                                  setCartSelections((prev) => ({
                                    ...prev,
                                    [`${r.platform.id}-${activeItem.id}`]: true,
                                  }));
                                }
                              }}
                              title="Add to cart"
                            />
                          </td>
                        </>
                      ) : (
                        <td colSpan={9} style={{ textAlign: "center", color: "var(--text-muted)", fontStyle: "italic", background: "rgba(0,0,0,0.1)" }}>
                          Product not found or currently out of stock on {r.platform.name}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            );
          })()}

          {/* Cart Optimizer */}
          {cartPlans.length > 0 && (

            <div className="optimizer-section">
              <div className="optimizer-title">
                🛒 Cart Optimizer
                <span style={{fontSize:13, fontWeight:400, color:"var(--text-muted)"}}>
                  — Best way to buy all items together
                </span>
              </div>

              <div className="plan-cards">
                {cartPlans.slice(0, 4).map((plan, idx) => (
                  <div
                    key={idx}
                    className={`plan-card ${selectedPlanIdx === idx ? "selected" : ""}`}
                    onClick={() => setSelectedPlanIdx(idx)}
                  >
                    <div className="plan-card-header">
                      <div className="plan-logo">{plan.platformLogo}</div>
                      <div className="plan-name">{plan.platform}</div>
                      {idx === 0 && <span className="plan-rank" style={{background:"rgba(249,115,22,0.2)",color:"#f97316"}}>Best</span>}
                    </div>
                    <div className="plan-items">
                      {plan.items.slice(0, 3).map((it) => `• ${it.itemName}`).join("\n")}
                      {plan.items.length > 3 && `\n+ ${plan.items.length - 3} more`}
                    </div>
                    <div className="plan-totals">
                      <span>Subtotal: {formatINR(plan.subtotal)}</span>
                      <span>{plan.deliveryCharge === 0 ? "🟢 Free delivery" : `+ ${formatINR(plan.deliveryCharge)} delivery`}</span>
                    </div>
                    <div className="plan-total-price">{formatINR(plan.total)}</div>
                    <div className="plan-savings">You save {formatINR(plan.savings)} off MRP</div>
                  </div>
                ))}
              </div>

              {/* Payment options for selected plan */}
              {cartPlans[selectedPlanIdx]?.paymentOptions?.length > 0 && (
                <div className="results-table-wrap">
                  <div style={{padding:"16px 20px", borderBottom:"1px solid var(--border)", fontWeight:700, fontSize:15}}>
                    💳 Payment Options — {cartPlans[selectedPlanIdx].platform}
                    <span style={{fontSize:12, fontWeight:400, color:"var(--text-muted)", marginLeft:8}}>
                      Cart: {formatINR(cartPlans[selectedPlanIdx].total)}
                    </span>
                  </div>
                  <table className="payment-table">
                    <thead>
                      <tr>
                        <th>Payment Method</th>
                        <th>Discount / Cashback</th>
                        <th>Final Total</th>
                        <th>Your Savings</th>
                        <th>Promo Code</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cartPlans[selectedPlanIdx].paymentOptions.map((opt, i) => (
                        <tr key={i} className={i === 0 ? "best-payment" : ""}>
                          <td>{i === 0 ? "🏆 " : ""}{opt.method}</td>
                          <td style={{color:"#4ade80"}}>{opt.savingsText}</td>
                          <td style={{fontWeight:700}}>{formatINR(opt.finalTotal)}</td>
                          <td style={{color:"#4ade80"}}>{opt.discount > 0 ? `Save ${formatINR(opt.discount)}` : "—"}</td>
                          <td>{opt.code ? <code style={{background:"rgba(255,255,255,0.08)", padding:"2px 6px", borderRadius:4, fontSize:11}}>{opt.code}</code> : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* ─── HISTORY VIEW ───────────────────────────────────────── */}
      {view === "history" && (
        <section className="history-section">
          <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24}}>
            <div className="results-title">📋 Purchase History</div>
            <div style={{display:"flex", gap:8}}>
              <button className="btn-secondary" onClick={downloadHistoryCSV}>
                📥 Download CSV
              </button>
            </div>
          </div>
          {history.length === 0 ? (
            <div style={{textAlign:"center", padding:"60px 20px", color:"var(--text-muted)"}}>
              <div style={{fontSize:48, marginBottom:16}}>📭</div>
              <div>No purchases recorded yet.</div>
              <div style={{fontSize:13, marginTop:8}}>Mark items as "Bought" after comparing prices to track your history.</div>
            </div>
          ) : (
            history.map((rec) => (
              <div key={rec.id} className="history-card">
                <div className="history-icon">
                  {rec.category === "medicines" ? "💊" : rec.category === "grocery" ? "🧺" : "📦"}
                </div>
                <div className="history-info">
                  <div className="history-name">{rec.item}</div>
                  <div className="history-meta">
                    {rec.platform} • {rec.date} • {rec.pincode} •&nbsp;
                    {rec.payment_method}
                    {rec.points_earned > 0 && <span style={{color:"#fbbf24"}}> • ⭐ {rec.points_earned} pts</span>}
                  </div>
                </div>
                <div className="history-price">
                  <div className="history-total">{formatINR(rec.total)}</div>
                  <div className="history-saved">Saved {formatINR(rec.savings)}</div>
                </div>
                <a
                  className="open-btn"
                  href={rec.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{marginLeft:8}}
                >
                  Open ↗
                </a>
              </div>
            ))
          )}
        </section>
      )}

      {/* ─── SAVINGS VIEW ───────────────────────────────────────── */}
      {view === "savings" && (
        <section className="history-section">
          <div className="results-title" style={{marginBottom:24}}>💰 Savings Dashboard</div>
          <div className="savings-strip" style={{maxWidth:"100%", padding:0, marginBottom:32}}>
            <div className="stat-card">
              <div className="stat-icon">💰</div>
              <div className="stat-value">{formatINR(stats.totalSavings)}</div>
              <div className="stat-label">Total Saved vs MRP</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🛍️</div>
              <div className="stat-value">{stats.totalOrders}</div>
              <div className="stat-label">Orders Tracked</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🏆</div>
              <div className="stat-value" style={{fontSize:16}}>{stats.topPlatform}</div>
              <div className="stat-label">Most Used Platform</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⭐</div>
              <div className="stat-value">{stats.totalPoints}</div>
              <div className="stat-label">Reward Points</div>
            </div>
          </div>
          {stats.totalOrders === 0 && (
            <div style={{textAlign:"center", padding:"40px", color:"var(--text-muted)", fontSize:14}}>
              Start tracking purchases to see your savings grow! 🌱
            </div>
          )}
          {stats.totalSavings > 0 && (
            <div style={{background:"rgba(34,197,94,0.08)", border:"1px solid rgba(34,197,94,0.2)", borderRadius:16, padding:20, textAlign:"center"}}>
              <div style={{fontSize:32, marginBottom:8}}>🎉</div>
              <div style={{fontSize:18, fontWeight:700, color:"#4ade80"}}>
                WiseShopper saved you {formatINR(stats.totalSavings)}!
              </div>
              <div style={{fontSize:13, color:"var(--text-muted)", marginTop:6}}>
                That's money back in your pocket. Keep shopping smart!
              </div>
            </div>
          )}
        </section>
      )}

      {/* ─── FOOTER ─────────────────────────────────────────────── */}
      <footer className="footer">
        <div>🛒 WiseShopper — Compare smarter, save more | Delivery: 411017 Pune</div>
        <div style={{marginTop:6}}>
          Prices are indicative (Demo Mode). Click platform links for live prices.&nbsp;
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">
            Add Gemini API key
          </a>
          &nbsp;for smarter AI clarification.
        </div>
      </footer>
    </div>
  );
}
