"use client";

import React, { useState } from "react";
import { LocationInfo, PRESET_LOCATIONS } from "@/lib/locations";

interface NavbarProps {
  view: "home" | "results" | "history" | "savings";
  setView: (v: "home" | "results" | "history" | "savings") => void;
  theme: string;
  setTheme: (t: string) => void;
  location: LocationInfo;
  setLocation: (loc: LocationInfo) => void;
  hasResults: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  view,
  setView,
  theme,
  setTheme,
  location,
  setLocation,
  hasResults,
}) => {
  const [showLocationModal, setShowLocationModal] = useState(false);

  return (
    <>
      <nav className="navbar">
        <div className="logo" onClick={() => setView("home")} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
          <span className="logo-icon">🛒</span>
          <span>WiseShopper</span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              background: "linear-gradient(135deg, rgba(34,197,94,0.2), rgba(16,185,129,0.2))",
              color: "#22c55e",
              border: "1px solid rgba(34,197,94,0.4)",
              borderRadius: 12,
              padding: "2px 8px",
              letterSpacing: "0.5px",
              marginLeft: 4,
            }}
          >
            v2.2.0
          </span>
        </div>

        <div className="nav-links">
          <button
            className={`nav-btn ${view === "home" ? "active" : ""}`}
            onClick={() => setView("home")}
          >
            🏠 Home
          </button>
          {hasResults && (
            <button
              className={`nav-btn ${view === "results" ? "active" : ""}`}
              onClick={() => setView("results")}
            >
              📊 Results
            </button>
          )}
          <button
            className={`nav-btn ${view === "history" ? "active" : ""}`}
            onClick={() => setView("history")}
          >
            📋 History
          </button>
          <button
            className={`nav-btn ${view === "savings" ? "active" : ""}`}
            onClick={() => setView("savings")}
          >
            💰 Savings
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            className="pincode-badge"
            style={{ cursor: "pointer", border: "1px solid rgba(34, 197, 94, 0.4)" }}
            onClick={() => setShowLocationModal(true)}
            title="Click to change delivery pincode / city"
          >
            📍 {location.pincode} {location.city} ▾
          </button>

          <div className="theme-select">
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="theme-dropdown"
              title="Select theme"
            >
              <option value="light">☀️ Light</option>
              <option value="dark">🌙 Dark</option>
              <option value="professional">💼 Professional</option>
            </select>
          </div>
        </div>
      </nav>

      {/* Location Selector Modal */}
      {showLocationModal && (
        <div className="modal-overlay" onClick={() => setShowLocationModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div className="modal-title" style={{ margin: 0 }}>📍 Select Delivery Location</div>
              <button
                className="item-remove"
                style={{ fontSize: 20 }}
                onClick={() => setShowLocationModal(false)}
              >
                ✕
              </button>
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
              Quick commerce (Blinkit, Zepto, Swiggy) and delivery speeds vary by location.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflowY: "auto", paddingRight: 4 }}>
              {PRESET_LOCATIONS.map((loc) => {
                const isSelected = loc.pincode === location.pincode;
                return (
                  <div
                    key={loc.pincode}
                    onClick={() => {
                      setLocation(loc);
                      setShowLocationModal(false);
                    }}
                    style={{
                      padding: "12px 16px",
                      borderRadius: 12,
                      border: isSelected ? "2px solid var(--accent-primary)" : "1px solid var(--border)",
                      background: isSelected ? "rgba(249, 115, 22, 0.1)" : "var(--bg-primary)",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      transition: "all 0.2s",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 14 }}>
                        {loc.area}, {loc.city}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        Pincode: {loc.pincode} • {loc.state}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {loc.quickCommerceAvailable && (
                        <span className="item-badge" style={{ background: "rgba(234, 179, 8, 0.15)", color: "#eab308", border: "1px solid rgba(234, 179, 8, 0.3)" }}>
                          ⚡ 10-min delivery
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
