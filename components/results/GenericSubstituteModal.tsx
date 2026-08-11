"use client";

import React from "react";
import { GenericSubstitute } from "@/lib/medicine-substitutes";

interface GenericSubstituteModalProps {
  substitute: GenericSubstitute | null;
  onClose: () => void;
  onSelectGeneric: (genericName: string) => void;
}

export const GenericSubstituteModal: React.FC<GenericSubstituteModalProps> = ({
  substitute,
  onClose,
  onSelectGeneric,
}) => {
  if (!substitute) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div className="modal-title" style={{ margin: 0 }}>
            💊 Jan Aushadhi / Generic Salt Alternative
          </div>
          <button className="item-remove" style={{ fontSize: 20 }} onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: "12px 16px", background: "rgba(34, 197, 94, 0.1)", border: "1px solid rgba(34, 197, 94, 0.3)", borderRadius: 12, marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: "#4ade80", fontWeight: 700 }}>
            🎉 Save up to {substitute.savingsPct}% with generic active ingredient
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
            Generic equivalents have the exact same active therapeutic salt, quality, and efficacy as branded drugs.
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          {/* Branded Medicine */}
          <div style={{ padding: 14, background: "var(--bg-primary)", borderRadius: 12, border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
              Branded Medicine
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginTop: 4 }}>
              {substitute.brandName}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{substitute.dosage}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#ef4444", marginTop: 8 }}>
              ₹{substitute.brandedPrice}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Mfr: {substitute.manufacturer}</div>
          </div>

          {/* Jan Aushadhi / Generic */}
          <div style={{ padding: 14, background: "rgba(34, 197, 94, 0.05)", borderRadius: 12, border: "2px solid rgba(34, 197, 94, 0.4)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#22c55e", textTransform: "uppercase" }}>
              🌿 Jan Aushadhi Generic
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginTop: 4 }}>
              {substitute.genericSalt}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{substitute.janAushadhiName}</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#22c55e", marginTop: 8 }}>
              ₹{substitute.genericPrice}
            </div>
            <div style={{ fontSize: 11, color: "#4ade80", fontWeight: 600 }}>Save ₹{substitute.brandedPrice - substitute.genericPrice} ({substitute.savingsPct}% OFF)</div>
          </div>
        </div>

        {/* Medical Usage & Details */}
        <div style={{ background: "var(--bg-primary)", padding: 12, borderRadius: 12, border: "1px solid var(--border)", marginBottom: 16, fontSize: 12 }}>
          <div style={{ color: "var(--text-secondary)", marginBottom: 4 }}>
            <strong>Common Uses:</strong> {substitute.usage}
          </div>
          <div style={{ color: "var(--text-muted)" }}>
            <strong>Prescription:</strong> {substitute.prescriptionRequired ? "⚠️ Requires Doctor Prescription (Schedule H)" : "✅ Over the Counter (OTC)"}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-secondary" style={{ flex: 1, justifyContent: "center" }} onClick={onClose}>
            Keep Branded
          </button>
          <button
            className="btn-primary"
            style={{ flex: 2, justifyContent: "center", background: "linear-gradient(135deg, #22c55e, #16a34a)" }}
            onClick={() => {
              onSelectGeneric(substitute.genericSalt);
              onClose();
            }}
          >
            Search Generic &ldquo;{substitute.genericSalt}&rdquo; ➔
          </button>
        </div>
      </div>
    </div>
  );
};
