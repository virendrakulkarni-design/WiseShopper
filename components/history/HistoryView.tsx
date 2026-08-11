"use client";

import React, { useState } from "react";
import { PurchaseRecord, downloadHistoryCSV } from "@/lib/history-tracker";

interface HistoryViewProps {
  history: PurchaseRecord[];
}

function formatINR(n: number) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

export const HistoryView: React.FC<HistoryViewProps> = ({ history }) => {
  const [filterText, setFilterText] = useState("");

  const filtered = history.filter(
    (rec) =>
      rec.item.toLowerCase().includes(filterText.toLowerCase()) ||
      rec.platform.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <section className="history-section">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="results-title">📋 Purchase & Savings History</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Offline-stored record of all your tracked purchases
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {history.length > 0 && (
            <input
              type="text"
              placeholder="Filter history..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="manual-input"
              style={{ width: 160, padding: "6px 12px", fontSize: 12 }}
            />
          )}
          <button className="btn-secondary" onClick={downloadHistoryCSV}>
            📥 Download CSV
          </button>
        </div>
      </div>

      {history.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>No purchases recorded yet.</div>
          <div style={{ fontSize: 13, marginTop: 8 }}>
            Click &ldquo;+ Bought&rdquo; on any item in search results to track what you bought and your savings!
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)" }}>
          No records matching &ldquo;{filterText}&rdquo;.
        </div>
      ) : (
        filtered.map((rec) => (
          <div key={rec.id} className="history-card">
            <div className="history-icon">
              {rec.category === "medicines" ? "💊" : rec.category === "grocery" ? "🧺" : "📦"}
            </div>
            <div className="history-info">
              <div className="history-name">{rec.item}</div>
              <div className="history-meta">
                {rec.platform} • {rec.date} • Pincode: {rec.pincode} • {rec.payment_method}
                {rec.points_earned > 0 && (
                  <span style={{ color: "#fbbf24", marginLeft: 6 }}>
                    • ⭐ {rec.points_earned} pts
                  </span>
                )}
              </div>
            </div>
            <div className="history-price">
              <div className="history-total">{formatINR(rec.total)}</div>
              <div className="history-saved">Saved {formatINR(rec.savings)}</div>
            </div>
            {rec.link && (
              <a
                className="open-btn"
                href={rec.link}
                target="_blank"
                rel="noopener noreferrer"
                style={{ marginLeft: 8 }}
              >
                Reorder ↗
              </a>
            )}
          </div>
        ))
      )}
    </section>
  );
};
