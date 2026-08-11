"use client";

import React, { useState } from "react";
import { BundlePlan } from "@/lib/price-optimizer";

interface CartOptimizerProps {
  plans: BundlePlan[];
  splitPlan?: BundlePlan[];
  savings: number;
}

function formatINR(n: number) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

export const CartOptimizer: React.FC<CartOptimizerProps> = ({
  plans,
  splitPlan = [],
  savings,
}) => {
  const allPlans = [...splitPlan, ...plans];
  const [selectedPlanIdx, setSelectedPlanIdx] = useState(0);

  if (allPlans.length === 0) return null;

  const currentPlan = allPlans[selectedPlanIdx] || allPlans[0];

  return (
    <div className="optimizer-section">
      <div className="optimizer-title">
        🛒 Multi-Store Cart Optimizer
        <span style={{ fontSize: 13, fontWeight: 400, color: "var(--text-muted)", marginLeft: 8 }}>
          — Optimize across stores to minimize total delivery fees & prices
        </span>
      </div>

      {savings > 0 && (
        <div style={{ padding: "10px 16px", background: "rgba(34, 197, 94, 0.1)", border: "1px solid rgba(34, 197, 94, 0.3)", borderRadius: 12, marginBottom: 16, fontSize: 13, color: "#4ade80", fontWeight: 600 }}>
          💡 Splitting your cart saves you an additional {formatINR(savings)} compared to buying everything from a single store!
        </div>
      )}

      {/* Plan Cards */}
      <div className="plan-cards">
        {allPlans.slice(0, 4).map((plan, idx) => (
          <div
            key={idx}
            className={`plan-card ${selectedPlanIdx === idx ? "selected" : ""}`}
            onClick={() => setSelectedPlanIdx(idx)}
          >
            <div className="plan-card-header">
              <div className="plan-logo">{plan.platformLogo}</div>
              <div className="plan-name">{plan.platform}</div>
              {idx === 0 && (
                <span className="plan-rank" style={{ background: "rgba(249,115,22,0.2)", color: "#f97316" }}>
                  Best
                </span>
              )}
            </div>

            <div className="plan-items">
              {plan.items.slice(0, 3).map((it) => `• ${it.itemName}`).join("\n")}
              {plan.items.length > 3 && `\n+ ${plan.items.length - 3} more`}
            </div>

            <div className="plan-totals">
              <span>Subtotal: {formatINR(plan.subtotal)}</span>
              <span>
                {plan.deliveryCharge === 0 ? "🟢 Free delivery" : `+ ${formatINR(plan.deliveryCharge)} delivery`}
              </span>
            </div>

            <div className="plan-total-price">{formatINR(plan.total)}</div>
            <div className="plan-savings">You save {formatINR(plan.savings)} off MRP</div>

            {plan.thresholdTip && (
              <div style={{ fontSize: 11, color: "#fbbf24", marginTop: 6, fontWeight: 500 }}>
                {plan.thresholdTip}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Multi-Store Delivery Breakdown (if split plan selected) */}
      {currentPlan.deliveryBreakdown && currentPlan.deliveryBreakdown.length > 0 && (
        <div className="results-table-wrap" style={{ marginTop: 16, padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
            🚚 Delivery Fee Breakdown by Platform
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
            {currentPlan.deliveryBreakdown.map((db, i) => (
              <div key={i} style={{ padding: 10, background: "var(--bg-primary)", borderRadius: 8, border: "1px solid var(--border)" }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{db.platform}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Items Subtotal: {formatINR(db.subtotal)}</div>
                <div style={{ fontSize: 12, color: db.delivery === 0 ? "#22c55e" : "#f97316", fontWeight: 600 }}>
                  Delivery: {db.delivery === 0 ? "FREE" : formatINR(db.delivery)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Offers Table for Current Plan */}
      {currentPlan.paymentOptions && currentPlan.paymentOptions.length > 0 && (
        <div className="results-table-wrap" style={{ marginTop: 16 }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", fontWeight: 700, fontSize: 14 }}>
            💳 Payment Discounts & UPI Offers — {currentPlan.platform}
            <span style={{ fontSize: 12, fontWeight: 400, color: "var(--text-muted)", marginLeft: 8 }}>
              Cart: {formatINR(currentPlan.total)}
            </span>
          </div>

          <table className="payment-table">
            <thead>
              <tr>
                <th>Payment Method / Bank</th>
                <th>Discount / Offer</th>
                <th>Final Payable</th>
                <th>Net Savings</th>
                <th>Promo Code</th>
              </tr>
            </thead>
            <tbody>
              {currentPlan.paymentOptions.map((opt, i) => (
                <tr key={i} className={i === 0 ? "best-payment" : ""}>
                  <td>{i === 0 ? "🏆 " : ""}{opt.method}</td>
                  <td style={{ color: "#4ade80" }}>{opt.savingsText}</td>
                  <td style={{ fontWeight: 700 }}>{formatINR(opt.finalTotal)}</td>
                  <td style={{ color: "#4ade80" }}>{opt.discount > 0 ? `Save ${formatINR(opt.discount)}` : "—"}</td>
                  <td>
                    {opt.code ? (
                      <code style={{ background: "rgba(255,255,255,0.08)", padding: "2px 6px", borderRadius: 4, fontSize: 11 }}>
                        {opt.code}
                      </code>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
