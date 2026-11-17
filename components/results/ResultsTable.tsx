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
                    <a
                      href={r.searchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="platform-link"
                    >
                      {r.platform.name} ↗
                    </a>
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

      {/* Generic Medicine Substitute Modal */}
      <GenericSubstituteModal
        substitute={selectedSubstitute}
        onClose={() => setSelectedSubstitute(null)}
        onSelectGeneric={onSearchGeneric}
      />
    </div>
  );
};
