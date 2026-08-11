"use client";

import React from "react";
import { PurchaseRecord } from "@/lib/history-tracker";

interface SavingsDashboardProps {
  stats: {
    totalSavings: number;
    totalOrders: number;
    topPlatform: string;
    totalPoints: number;
  };
  history: PurchaseRecord[];
}

function formatINR(n: number) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

export const SavingsDashboard: React.FC<SavingsDashboardProps> = ({ stats, history }) => {
  // Compute savings by category
  const categorySavings: Record<string, number> = {};
  history.forEach((rec) => {
    const cat = rec.category || "other";
    categorySavings[cat] = (categorySavings[cat] || 0) + (rec.savings || 0);
  });

  return (
    <section className="history-section">
      <div className="results-title" style={{ marginBottom: 20 }}>
        💰 Your Savings & Rewards Wallet
      </div>

      <div className="savings-strip" style={{ maxWidth: "100%", padding: 0, marginBottom: 28 }}>
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-value">{formatINR(stats.totalSavings)}</div>
          <div className="stat-label">Total Saved vs MRP</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🛍️</div>
          <div className="stat-value">{stats.totalOrders}</div>
          <div className="stat-label">Purchases Tracked</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🏆</div>
          <div className="stat-value" style={{ fontSize: 16 }}>{stats.topPlatform}</div>
          <div className="stat-label">Most Used Store</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⭐</div>
          <div className="stat-value">{stats.totalPoints}</div>
          <div className="stat-label">Reward Points</div>
        </div>
      </div>

      {stats.totalOrders === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)", fontSize: 14 }}>
          Start recording purchases from comparison results to watch your savings grow! 🌱
        </div>
      ) : (
        <>
          <div
            style={{
              background: "rgba(34,197,94,0.08)",
              border: "1px solid rgba(34,197,94,0.2)",
              borderRadius: 16,
              padding: 24,
              textAlign: "center",
              marginBottom: 24,
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 8 }}>🎉</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#4ade80" }}>
              WiseShopper has saved you {formatINR(stats.totalSavings)}!
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6 }}>
              Average savings of {formatINR(Math.round(stats.totalSavings / (stats.totalOrders || 1)))} per order. Keep shopping smart!
            </div>
          </div>

          {/* Category breakdown */}
          {Object.keys(categorySavings).length > 0 && (
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>
                📊 Savings by Category
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
                {Object.entries(categorySavings).map(([cat, amt]) => (
                  <div
                    key={cat}
                    style={{
                      padding: 12,
                      background: "var(--bg-primary)",
                      borderRadius: 10,
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "capitalize" }}>
                      {cat}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#22c55e", marginTop: 4 }}>
                      {formatINR(amt)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
};
