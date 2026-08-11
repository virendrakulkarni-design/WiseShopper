"use client";

import React, { useState, useRef } from "react";
import { detectLanguage, getLanguageLabel } from "@/lib/language-detector";
import { SearchResult } from "@/lib/search-engine";
import { PurchaseRecord } from "@/lib/history-tracker";
import { VisualSearchModal } from "./VisualSearchModal";
import { WhatsAppImporterModal } from "./WhatsAppImporterModal";

export interface ShoppingItem {
  id: string;
  raw: string;
  normalized: string;
  language: "en" | "hi" | "mr" | "mixed";
  category: string;
  status: "idle" | "clarifying" | "searching" | "done" | "error";
  results?: SearchResult[];
  prevPurchase?: PurchaseRecord | null;
  watching?: boolean;
}

interface SearchSectionProps {
  items: ShoppingItem[];
  onAddItem: (text: string) => void;
  onAddMultipleItems: (texts: string[]) => void;
  onRemoveItem: (id: string) => void;
  onClearItems: () => void;
  onSearchAll: () => void;
  isSearchingAll: boolean;
  onSelectActiveItem: (id: string) => void;
  showToast: (msg: string) => void;
}

const POPULAR_CATEGORIES = [
  { label: "Groceries", icon: "🛒", query: "Aashirvaad Atta 5kg" },
  { label: "Pharmacy", icon: "💊", query: "Dolo 650 strip" },
  { label: "Daily Dairy", icon: "🥛", query: "Amul Butter 500g" },
  { label: "Personal Care", icon: "🧴", query: "Colgate Toothpaste 200g" },
  { label: "Household", icon: "🧼", query: "Surf Excel Detergent 1kg" },
];

const QUICK_CHIPS = [
  "Dolo 650 strip",
  "Tata Salt 1kg",
  "Fortune Oil 1L",
  "Amul Butter 500g",
  "Volini Gel 50g",
  "Surf Excel 1kg",
];

export const SearchSection: React.FC<SearchSectionProps> = ({
  items,
  onAddItem,
  onAddMultipleItems,
  onRemoveItem,
  onClearItems,
  onSearchAll,
  isSearchingAll,
  onSelectActiveItem,
  showToast,
}) => {
  const [inputText, setInputText] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [detectedLang, setDetectedLang] = useState<"en" | "hi" | "mr" | "mixed">("en");
  const [showVisualModal, setShowVisualModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (val: string) => {
    setInputText(val);
    setDetectedLang(detectLanguage(val));
  };

  const handleAddCurrent = () => {
    if (!inputText.trim()) return;
    onAddItem(inputText.trim());
    setInputText("");
    setIsSearchOpen(false);
  };

  return (
    <>
      <section className="search-section">
        {/* Category Pills Strip */}
        <div className="platform-strip" style={{ marginTop: 24, marginBottom: 24, gap: 10 }}>
          <div className="platform-pill" style={{ background: "rgba(59, 130, 246, 0.1)", color: "#60a5fa", borderColor: "rgba(59, 130, 246, 0.3)" }}>
            💊 Pharmacy & Medicines
          </div>
          <div className="platform-pill" style={{ background: "rgba(249, 115, 22, 0.1)", color: "#fb923c", borderColor: "rgba(249, 115, 22, 0.3)" }}>
            🛒 Grocery & 10-Min Essentials
          </div>
          <div className="platform-pill" style={{ background: "rgba(168, 85, 247, 0.1)", color: "#c084fc", borderColor: "rgba(168, 85, 247, 0.3)" }}>
            💄 Personal Care & Wellness
          </div>
          <div className="platform-pill" style={{ background: "rgba(34, 197, 94, 0.1)", color: "#4ade80", borderColor: "rgba(34, 197, 94, 0.3)" }}>
            🛍️ E-Commerce & Retail
          </div>
        </div>

        {/* Search Card */}
        <div className="search-card">
          <div className="search-header">
            <span className="search-label">🔍 Add items to compare prices across stores</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span className={`lang-badge lang-${detectedLang}`}>
                {getLanguageLabel(detectedLang)}
              </span>
              <button
                className="btn-secondary"
                style={{ padding: "4px 10px", fontSize: 12, borderRadius: 16 }}
                onClick={() => setShowWhatsAppModal(true)}
                title="Paste a list from WhatsApp or notes"
              >
                📋 Paste List
              </button>
            </div>
          </div>

          <div className="search-container-relative">
            <span className="search-icon-left">🔍</span>
            <input
              ref={searchInputRef}
              type="text"
              className="jiomart-search-input"
              value={inputText}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => setIsSearchOpen(true)}
              onBlur={() => setTimeout(() => setIsSearchOpen(false), 250)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddCurrent();
                }
              }}
              placeholder="Search in English, हिंदी, मराठी (e.g. Dolo 650, आटा 5kg, तेल, Paracetamol)..."
            />

            {/* Visual Search Camera Button */}
            {!inputText && (
              <button
                className="visual-search-btn"
                title="Scan Prescription or Product Photo"
                onClick={() => setShowVisualModal(true)}
              >
                📷
              </button>
            )}

            {inputText && (
              <button
                className="search-clear-btn"
                onClick={() => {
                  setInputText("");
                  searchInputRef.current?.focus();
                }}
              >
                ✕
              </button>
            )}

            {/* Dropdown Suggestions */}
            {isSearchOpen && (
              <div className="search-dropdown-overlay">
                {!inputText.trim() ? (
                  <>
                    <div className="dropdown-section-title">Popular Categories</div>
                    <div className="popular-categories">
                      {POPULAR_CATEGORIES.map((cat) => (
                        <div
                          key={cat.label}
                          className="cat-bubble-wrap"
                          onClick={() => {
                            onAddItem(cat.query);
                            setIsSearchOpen(false);
                          }}
                        >
                          <div className="cat-bubble">{cat.icon}</div>
                          <span className="cat-bubble-label">{cat.label}</span>
                        </div>
                      ))}
                    </div>

                    <div className="dropdown-section-title">Trending Searches in India</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {QUICK_CHIPS.map((chip) => (
                        <span
                          key={chip}
                          className="quick-chip"
                          onClick={() => {
                            onAddItem(chip);
                            setIsSearchOpen(false);
                          }}
                        >
                          + {chip}
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="dropdown-section-title">Add & Search</div>
                    <div
                      className="autocomplete-row"
                      onClick={() => handleAddCurrent()}
                    >
                      <div className="autocomplete-img" style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                        🔍
                      </div>
                      <span className="autocomplete-text">Add <strong>&ldquo;{inputText}&rdquo;</strong></span>
                    </div>
                    <div
                      className="autocomplete-row"
                      onClick={() => {
                        onAddItem(inputText + " 500g");
                        setInputText("");
                        setIsSearchOpen(false);
                      }}
                    >
                      <div className="autocomplete-img" style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                        📦
                      </div>
                      <span className="autocomplete-text">{inputText} 500g</span>
                    </div>
                    <div
                      className="autocomplete-row"
                      onClick={() => {
                        onAddItem(inputText + " 1kg / 1 pack");
                        setInputText("");
                        setIsSearchOpen(false);
                      }}
                    >
                      <div className="autocomplete-img" style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                        ⚖️
                      </div>
                      <span className="autocomplete-text">{inputText} 1kg / 1 pack</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Search Actions */}
          <div className="search-actions">
            <button
              className="btn-primary"
              style={{
                background: "linear-gradient(135deg, #22c55e, #16a34a)",
                boxShadow: "0 4px 15px rgba(34,197,94,0.35)",
              }}
              onClick={onSearchAll}
              disabled={items.length === 0 || isSearchingAll}
            >
              {isSearchingAll ? (
                <>
                  <span className="spinner" /> Searching Across 18+ Stores…
                </>
              ) : (
                `🔍 Compare Prices for ${items.length} Item${items.length === 1 ? "" : "s"}`
              )}
            </button>

            {items.length > 0 && (
              <button className="btn-secondary" onClick={onClearItems}>
                🗑️ Clear List
              </button>
            )}
          </div>
        </div>

        {/* Item List Tags */}
        {items.length > 0 && (
          <div className="item-list">
            {items.map((item) => (
              <div
                key={item.id}
                className={`item-tag ${item.prevPurchase ? "purchased" : ""} ${
                  item.status === "searching" ? "searching" : ""
                }`}
                onClick={() => {
                  if (item.status === "done") {
                    onSelectActiveItem(item.id);
                  }
                }}
                style={{ cursor: item.status === "done" ? "pointer" : "default" }}
              >
                <span style={{ fontSize: 20 }}>
                  {item.status === "searching"
                    ? "⏳"
                    : item.status === "done"
                    ? "✅"
                    : item.status === "error"
                    ? "❌"
                    : "📦"}
                </span>
                <div style={{ flex: 1 }}>
                  <div className="item-tag-name">{item.raw}</div>
                  {item.normalized !== item.raw && (
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      → {item.normalized}
                    </div>
                  )}
                </div>
                {item.prevPurchase && (
                  <span className="item-badge badge-purchased">⭐ Prev. Purchased</span>
                )}
                {item.category !== "all" && (
                  <span className="item-badge badge-cat">{item.category}</span>
                )}
                {item.status === "done" && (
                  <span className="item-badge badge-done">
                    {item.results?.length} stores
                  </span>
                )}
                <button
                  className="item-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveItem(item.id);
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Visual Search Modal */}
      <VisualSearchModal
        isOpen={showVisualModal}
        onClose={() => setShowVisualModal(false)}
        onAddItems={onAddMultipleItems}
        showToast={showToast}
      />

      {/* WhatsApp Importer Modal */}
      <WhatsAppImporterModal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        onAddItems={onAddMultipleItems}
        showToast={showToast}
      />
    </>
  );
};
