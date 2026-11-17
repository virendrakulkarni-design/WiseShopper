"use client";

import React, { useState } from "react";
import { SearchResult, SortCriteria, SortField, multiSort } from "@/lib/search-engine";
import { ShoppingItem } from "../search/SearchSection";
import { findGenericSubstitute, GenericSubstitute } from "@/lib/medicine-substitutes";
import { GenericSubstituteModal } from "./GenericSubstituteModal";

interface ResultsTableProps {
  items: ShoppingItem[];
  activeItemId: string | null;
  setActiveItemId: (id: string) => void;
  cartSelections: Record<string, boolean>;
  onToggleCartSelection: (key: string, result: SearchResult, item: ShoppingItem) => void;
  onRecordPurchase: (item: ShoppingItem, result: SearchResult) => void;
  onSearchGeneric: (genericName: string) => void;
  onExportCsv: () => void;
  pincode: string;
}

const SORT_FIELDS: { field: SortField; label: string; icon: string; defaultDir: "asc" | "desc" }[] = [
  { field: "total", label: "Total Cost", icon: "₹", defaultDir: "asc" },
  { field: "price", label: "Item Price", icon: "🏷️", defaultDir: "asc" },
  { field: "delivery", label: "Delivery Fee", icon: "🚚", defaultDir: "asc" },
  { field: "rating", label: "Rating", icon: "⭐", defaultDir: "desc" },
  { field: "positiveReviews", label: "Positive %", icon: "👍", defaultDir: "desc" },
  { field: "discount", label: "Discount %", icon: "🎯", defaultDir: "desc" },
];

function formatINR(n: number) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

function renderStars(rating: number) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  let s = "★".repeat(full);
  if (half) s += "½";
  return s;
}

export const ResultsTable: React.FC<ResultsTableProps> = ({
  items,
  activeItemId,
  setActiveItemId,
  cartSelections,
  onToggleCartSelection,
  onRecordPurchase,
  onSearchGeneric,
  onExportCsv,
  pincode,
}) => {
  const [sortCriteria, setSortCriteria] = useState<SortCriteria[]>([]);
  const [filterFreeOnly, setFilterFreeOnly] = useState(false);
  const [filterInStockOnly, setFilterInStockOnly] = useState(false);
  const [filterPriceMin, setFilterPriceMin] = useState<string>("");
  const [filterPriceMax, setFilterPriceMax] = useState<string>("");
  const [filterRatingMin, setFilterRatingMin] = useState<string>("");
  const [filterDiscountMin, setFilterDiscountMin] = useState<string>("");
  const [selectedSubstitute, setSelectedSubstitute] = useState<GenericSubstitute | null>(null);
  const [hoveredCard, setHoveredCard] = useState<{ result: SearchResult; x: number; y: number } | null>(null);
  const [quickDetailResult, setQuickDetailResult] = useState<SearchResult | null>(null);

  const handleMouseEnter = (e: React.MouseEvent, r: SearchResult) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const isRightNearEdge = rect.right + 380 > (typeof window !== "undefined" ? window.innerWidth : 1200);
    const xPos = isRightNearEdge ? Math.max(16, rect.left - 370) : rect.right + 14;
    const yPos = Math.max(20, Math.min(rect.top - 20, typeof window !== "undefined" ? window.innerHeight - 440 : 400));

    setHoveredCard({
      result: r,
      x: xPos,
      y: yPos,
    });
  };

  const handleMouseLeave = () => {
    setHoveredCard(null);
  };

  const doneItems = items.filter((i) => i.results && i.results.length > 0);
  const isSearching = items.some((i) => i.status === "searching");
  const currentItem = doneItems.find((i) => i.id === activeItemId) || doneItems[0];

  if (!currentItem || !currentItem.results || currentItem.results.length === 0) {
    if (isSearching) {
      return (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div className="spinner" style={{ width: 44, height: 44, margin: "0 auto 16px" }} />
          <div style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)" }}>
            Searching across 18+ Indian stores…
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6 }}>
            Comparing live prices on 1mg, Apollo, PharmEasy, Blinkit, Amazon, Netmeds, MedPlus…
          </div>
        </div>
      );
    }
    return (
      <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
        <div>No search results yet. Type an item above and click &ldquo;Search&rdquo;.</div>
      </div>
    );
  }

  // Check if generic medicine substitute is available
  const genericSub = findGenericSubstitute(currentItem.normalized || currentItem.raw);

  // Apply sorting
  const sorted = sortCriteria.length > 0
    ? multiSort(currentItem.results, sortCriteria)
    : currentItem.results;

  // Apply intelligent filters
  const filtered = sorted.filter((r) => {
    if (filterFreeOnly && r.deliveryCharge !== 0) return false;
    if (filterInStockOnly && !r.inStock) return false;
    if (filterPriceMin && r.estimatedPrice < Number(filterPriceMin)) return false;
    if (filterPriceMax && r.estimatedPrice > Number(filterPriceMax)) return false;
    if (filterRatingMin && r.rating < Number(filterRatingMin)) return false;
    if (filterDiscountMin && r.discount < Number(filterDiscountMin)) return false;
    return true;
  });

  const selectedCount = Object.values(cartSelections).filter(Boolean).length;

  return (
    <div className="results-table-wrap">
      {/* Item Switcher Tabs */}
      <div className="item-tabs">
        {doneItems.map((item) => (
          <button
            key={item.id}
            className={`item-tab ${currentItem.id === item.id ? "active" : ""}`}
            onClick={() => setActiveItemId(item.id)}
          >
            {item.prevPurchase && "⭐ "}{item.normalized}
          </button>
        ))}
      </div>

      {/* Main Item Summary Card */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: 16,
          background: "var(--bg-primary)",
          borderRadius: 12,
          border: "1px solid var(--border)",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <img
            src={sorted[0]?.imageUrl}
            alt={currentItem.normalized}
            style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8, background: "white" }}
          />
          <div>
            <h3 style={{ margin: "0 0 4px 0", fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {currentItem.normalized}
            </h3>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Best value: <strong style={{ color: "#22c55e" }}>{formatINR(sorted[0]?.totalCost)}</strong> at {sorted[0]?.platform.name}
            </div>
          </div>
        </div>

        {/* Generic Medicine Banner Button */}
        {genericSub && (
          <button
            className="btn-primary"
            style={{
              background: "linear-gradient(135deg, #10b981, #059669)",
              padding: "8px 14px",
              fontSize: 13,
              borderRadius: 10,
              boxShadow: "0 2px 10px rgba(16,185,129,0.3)",
            }}
            onClick={() => setSelectedSubstitute(genericSub)}
          >
            🌿 Jan Aushadhi Salt: Save {genericSub.savingsPct}% ➔
          </button>
        )}
      </div>

      {/* Ambiguity / Form Warning */}
      {currentItem.results[0]?.productFormWarning && (
        <div className="ambiguity-banner">
          <span style={{ fontSize: 18 }}>⚠️</span>
          <div>
            <strong>Verify product packaging before buying:</strong> {currentItem.results[0].productFormWarning}
          </div>
        </div>
      )}

      {/* Multi-Sort & Filter Bar */}
      <div className="sort-bar">
        <span className="sort-label">Sort:</span>
        {SORT_FIELDS.map(({ field, label, icon, defaultDir }) => {
          const idx = sortCriteria.findIndex((c) => c.field === field);
          const isActive = idx !== -1;
          const criteria = isActive ? sortCriteria[idx] : null;
          return (
            <button
              key={field}
              className={`sort-chip ${isActive ? "active" : ""}`}
              onClick={() => {
                setSortCriteria((prev) => {
                  const existing = prev.findIndex((c) => c.field === field);
                  if (existing === -1) {
                    return [...prev, { field, dir: defaultDir }];
                  } else {
                    const currentDir = prev[existing].dir;
                    if (currentDir === "asc") {
                      const updated = [...prev];
                      updated[existing] = { field, dir: "desc" };
                      return updated;
                    } else {
                      return prev.filter((c) => c.field !== field);
                    }
                  }
                });
              }}
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
            ✕ Clear
          </button>
        )}

        {/* Intelligent Filters */}
        <div className="filter-group">
          <label className="filter-chip">
            <input
              type="checkbox"
              checked={filterFreeOnly}
              onChange={() => setFilterFreeOnly(!filterFreeOnly)}
            />
            <span>Free Delivery</span>
          </label>
          <label className="filter-chip">
            <input
              type="checkbox"
              checked={filterInStockOnly}
              onChange={() => setFilterInStockOnly(!filterInStockOnly)}
            />
            <span>In Stock</span>
          </label>
          <label className="filter-chip">
            <span>Min Rating:</span>
            <input
              type="number"
              min="0"
              max="5"
              step="0.1"
              value={filterRatingMin}
              onChange={(e) => setFilterRatingMin(e.target.value)}
              style={{ width: 40 }}
            />
          </label>
        </div>
      </div>

      {/* Results Table */}
      <table className="results-table">
        <thead>
          <tr>
            <th>Store / Platform</th>
            <th>Type</th>
            <th>Item Price</th>
            <th>Discount</th>
            <th>Delivery ({pincode})</th>
            <th>Total Cost</th>
            <th>Rating & Reviews</th>
            <th>Badges & Offers</th>
            <th>Select</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((r, idx) => (
            <tr
              key={r.platform.id}
              className={idx === 0 && sortCriteria.length === 0 ? "best-row" : ""}
            >
              {/* Platform */}
              <td>
                <div className="platform-cell">
                  <div
                    className="platform-logo-circle"
                    style={{ background: (r.platform.color || "#3b82f6") + "22" }}
                  >
                    {r.platform.logo}
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <a
                        href={r.searchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="platform-link"
                        style={{ fontWeight: 600 }}
                        title={`Open ${r.platform.name} search page in new tab`}
                      >
                        {r.platform.name} ↗
                      </a>
                      <button
                        type="button"
                        className="preview-pill-btn"
                        onMouseEnter={(e) => handleMouseEnter(e, r)}
                        onMouseLeave={handleMouseLeave}
                        onClick={(e) => {
                          e.stopPropagation();
                          setQuickDetailResult(r);
                        }}
                        style={{
                          fontSize: 11,
                          background: "rgba(59,130,246,0.12)",
                          color: "#3b82f6",
                          border: "1px solid rgba(59,130,246,0.3)",
                          padding: "2px 8px",
                          borderRadius: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 3,
                        }}
                        title="Hover to view pricing breakdown and delivery without visiting store"
                      >
                        ℹ️ Info
                      </button>
                    </div>
                    <div className="platform-delivery">🚚 {r.platform.deliveryDays}</div>
                  </div>
                </div>
              </td>

              {r.inStock ? (
                <>
                  {/* Product Form */}
                  <td>
                    <span className="form-badge">{r.productForm}</span>
                  </td>

                  {/* Price */}
                  <td>
                    <div className="price-cell">{formatINR(r.estimatedPrice)}</div>
                    <div className="mrp-strike">MRP {formatINR(r.estimatedMrp)}</div>
                    {r.priceInsight && (
                      <div className="sparkline-container" title="Price variation across recent scans">
                        {r.priceInsight.sparkline.map((val: number, i: number) => (
                          <div
                            key={i}
                            className={`sparkline-bar ${i === r.priceInsight!.sparkline.length - 1 ? "latest" : ""}`}
                            style={{ height: `${Math.max(12, val)}%` }}
                          />
                        ))}
                      </div>
                    )}
                  </td>

                  {/* Discount */}
                  <td>
                    <span className="discount-pct">-{r.discount}%</span>
                  </td>

                  {/* Delivery */}
                  <td>
                    {r.deliveryCharge === 0 ? (
                      <span className="delivery-free">FREE</span>
                    ) : (
                      <span className="delivery-paid">{formatINR(r.deliveryCharge)}</span>
                    )}
                  </td>

                  {/* Total */}
                  <td className="total-cell">{formatINR(r.totalCost)}</td>

                  {/* Rating & Reviews */}
                  <td>
                    <div className="rating-cell">
                      <span className="stars">{renderStars(r.rating)}</span>
                      <span>{r.rating}</span>
                    </div>
                    <div className="review-count">({r.reviewCount.toLocaleString("en-IN")} reviews)</div>
                    <div className="review-bar-wrap">
                      <div className="review-bar-track">
                        <div className="review-bar-fill" style={{ width: `${r.positiveReviews}%` }} />
                      </div>
                      <span className="review-bar-pct">{r.positiveReviews}% 👍</span>
                    </div>
                    {r.aiSummary && (
                      <div className="ai-review-summary" title="AI Review Summary">
                        <span>✨</span> {r.aiSummary}
                      </div>
                    )}
                  </td>

                  {/* Badges & Special Offers */}
                  <td>
                    {r.badge && (
                      <span
                        className={`result-badge ${
                          r.badge.includes("Value")
                            ? "badge-best"
                            : r.badge.includes("Fast")
                            ? "badge-fastest"
                            : "badge-rated"
                        }`}
                      >
                        {r.badge}
                      </span>
                    )}
                    {r.platform.specialOffer && (
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>
                        {r.platform.specialOffer}
                      </div>
                    )}
                    <button
                      className="btn-secondary"
                      style={{ padding: "3px 8px", fontSize: 10, marginTop: 6 }}
                      onClick={() => onRecordPurchase(currentItem, r)}
                      title="Record this purchase in your history tracker"
                    >
                      + Bought
                    </button>
                  </td>

                  {/* Add to Cart Selection */}
                  <td>
                    <input
                      type="checkbox"
                      checked={!!cartSelections[`${r.platform.id}-${currentItem.id}`]}
                      onChange={() =>
                        onToggleCartSelection(`${r.platform.id}-${currentItem.id}`, r, currentItem)
                      }
                      style={{ width: 18, height: 18, accentColor: "var(--accent-primary)", cursor: "pointer" }}
                      title="Add to cart for export"
                    />
                  </td>
                </>
              ) : (
                <td colSpan={8} style={{ textAlign: "center", color: "var(--text-muted)", fontStyle: "italic" }}>
                  Currently out of stock on {r.platform.name}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Floating Selection Bar */}
      {selectedCount > 0 && (
        <div
          style={{
            position: "sticky",
            bottom: 20,
            zIndex: 90,
            background: "var(--bg-card)",
            border: "1px solid var(--border-accent)",
            borderRadius: 16,
            padding: "12px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
            marginTop: 16,
          }}
        >
          <div>
            <strong style={{ color: "var(--accent-primary)" }}>{selectedCount}</strong> items selected in your comparative cart
          </div>
          <button className="btn-primary" style={{ padding: "8px 18px", fontSize: 13 }} onClick={onExportCsv}>
            📥 Export Selected Cart to CSV
          </button>
        </div>
      )}

      {/* Floating Hover Details Card */}
      {hoveredCard && (
        <div
          style={{
            position: "fixed",
            left: Math.min(hoveredCard.x, typeof window !== "undefined" ? window.innerWidth - 380 : 500),
            top: Math.min(hoveredCard.y, typeof window !== "undefined" ? window.innerHeight - 440 : 400),
            width: 360,
            background: "var(--bg-card, #1e293b)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            borderRadius: 16,
            padding: 18,
            boxShadow: "0 20px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)",
            zIndex: 9999,
            backdropFilter: "blur(16px)",
            pointerEvents: "none",
            color: "var(--text-primary, #f8fafc)",
            fontSize: 13,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 24 }}>{hoveredCard.result.platform.logo}</span>
              <div>
                <strong style={{ fontSize: 15 }}>{hoveredCard.result.platform.name}</strong>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>📍 Delivering to {pincode}</div>
              </div>
            </div>
            <span style={{ fontSize: 11, padding: "3px 8px", background: "rgba(34,197,94,0.15)", color: "#22c55e", borderRadius: 10, fontWeight: 700 }}>
              {hoveredCard.result.inStock ? "🟢 In Stock" : "🔴 Out of Stock"}
            </span>
          </div>

          <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 10, padding: "10px 12px", marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ color: "var(--text-muted)" }}>Item Price:</span>
              <strong style={{ fontSize: 15, color: "#22c55e" }}>{formatINR(hoveredCard.result.estimatedPrice)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ color: "var(--text-muted)" }}>MRP:</span>
              <span style={{ textDecoration: "line-through", color: "var(--text-muted)" }}>{formatINR(hoveredCard.result.estimatedMrp)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ color: "var(--text-muted)" }}>Discount:</span>
              <span style={{ color: "#38bdf8", fontWeight: 600 }}>{hoveredCard.result.discount}% OFF</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 6, marginTop: 4 }}>
              <span>Delivery Fee ({pincode}):</span>
              <strong>{hoveredCard.result.deliveryCharge === 0 ? "FREE" : formatINR(hoveredCard.result.deliveryCharge)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <strong>Total Delivered:</strong>
              <strong style={{ fontSize: 16, color: "#22c55e" }}>{formatINR(hoveredCard.result.totalCost)}</strong>
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>⚡ Delivery Promise:</div>
            <div style={{ fontWeight: 600 }}>🚚 {hoveredCard.result.platform.deliveryDays}</div>
          </div>

          {hoveredCard.result.platform.specialOffer && (
            <div style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 8, padding: "6px 10px", marginBottom: 10, color: "#fbbf24", fontSize: 12 }}>
              🏷️ <strong>Store Offer:</strong> {hoveredCard.result.platform.specialOffer}
            </div>
          )}

          {hoveredCard.result.aiSummary && (
            <div style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 8 }}>
              ✨ &ldquo;{hoveredCard.result.aiSummary}&rdquo;
            </div>
          )}
        </div>
      )}

      {/* Quick Detail Modal (Clickable preview) */}
      {quickDetailResult && (
        <div
          className="modal-backdrop"
          onClick={() => setQuickDetailResult(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(6px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--bg-card, #1e293b)",
              borderRadius: 20,
              maxWidth: 520,
              width: "100%",
              padding: 24,
              border: "1px solid var(--border)",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
              color: "var(--text-primary)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  className="platform-logo-circle"
                  style={{ background: (quickDetailResult.platform.color || "#3b82f6") + "22", width: 44, height: 44, fontSize: 24 }}
                >
                  {quickDetailResult.platform.logo}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18 }}>{quickDetailResult.platform.name}</h3>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    📍 Live delivery estimate for Pincode {pincode}
                  </div>
                </div>
              </div>
              <button
                className="btn-secondary"
                style={{ borderRadius: "50%", width: 32, height: 32, padding: 0 }}
                onClick={() => setQuickDetailResult(null)}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: 14, background: "rgba(255,255,255,0.03)", borderRadius: 12, marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
                {currentItem.normalized}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span className="form-badge">{quickDetailResult.productForm}</span>
                <span style={{ fontSize: 12, color: "#22c55e", fontWeight: 600 }}>
                  {quickDetailResult.inStock ? "🟢 In Stock" : "🔴 Out of Stock"}
                </span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              <div style={{ padding: 12, background: "rgba(0,0,0,0.15)", borderRadius: 10 }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Item Price</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#22c55e" }}>
                  {formatINR(quickDetailResult.estimatedPrice)}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", textDecoration: "line-through" }}>
                  MRP {formatINR(quickDetailResult.estimatedMrp)} ({quickDetailResult.discount}% off)
                </div>
              </div>

              <div style={{ padding: 12, background: "rgba(0,0,0,0.15)", borderRadius: 10 }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Delivery Fee ({pincode})</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>
                  {quickDetailResult.deliveryCharge === 0 ? "FREE" : formatINR(quickDetailResult.deliveryCharge)}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  🚚 {quickDetailResult.platform.deliveryDays}
                </div>
              </div>
            </div>

            <div style={{ padding: "12px 14px", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 12, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 600 }}>Total Payable:</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: "#22c55e" }}>
                {formatINR(quickDetailResult.totalCost)}
              </span>
            </div>

            {quickDetailResult.platform.specialOffer && (
              <div style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#fbbf24", fontSize: 13 }}>
                🏷️ <strong>Store Offer:</strong> {quickDetailResult.platform.specialOffer}
              </div>
            )}

            {genericSub && (
              <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 12 }}>
                🌿 <strong>Jan Aushadhi Generic Alternative:</strong> {genericSub.janAushadhiName}
                <div style={{ marginTop: 2, color: "#10b981", fontWeight: 700 }}>
                  Save {genericSub.savingsPct}% • Generic Price: ₹{genericSub.genericPrice} (vs ₹{genericSub.brandedPrice} branded)
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button
                className="btn-primary"
                style={{ flex: 1, padding: "10px 16px" }}
                onClick={() => {
                  onToggleCartSelection(`${quickDetailResult.platform.id}-${currentItem.id}`, quickDetailResult, currentItem);
                  setQuickDetailResult(null);
                }}
              >
                🛒 Add to WiseShopper Cart
              </button>
              <a
                href={quickDetailResult.searchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
                style={{ padding: "10px 16px", textDecoration: "none", display: "inline-flex", alignItems: "center" }}
              >
                Open Site ↗
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Generic Medicine Substitute Modal */}
      <GenericSubstituteModal
        substitute={selectedSubstitute}
        onClose={() => setSelectedSubstitute(null)}
        onSelectGeneric={onSearchGeneric}
      />
    </div>
  );
};
