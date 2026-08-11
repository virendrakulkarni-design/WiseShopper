"use client";

import React, { useState } from "react";

export interface ClarificationData {
  itemId: string;
  itemRaw: string;
  question: string;
  suggestions: string[];
  category: string;
}

interface ClarificationModalProps {
  clarification: ClarificationData | null;
  onClose: () => void;
  onResolve: (chosenText: string) => void;
}

export const ClarificationModal: React.FC<ClarificationModalProps> = ({
  clarification,
  onClose,
  onResolve,
}) => {
  const [manualInput, setManualInput] = useState("");

  if (!clarification) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">🔍 एक मिनट / Clarification Needed</div>
        <div className="modal-question">
          <strong>&ldquo;{clarification.itemRaw}&rdquo;</strong> — {clarification.question}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          {clarification.suggestions.map((s) => (
            <button
              key={s}
              className="suggestion-btn"
              onClick={() => onResolve(s)}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="manual-input-group" style={{ marginTop: 16 }}>
          <input
            className="manual-input"
            placeholder="Type exact product / सटीक नाम लिखें..."
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && manualInput && onResolve(manualInput)}
          />
          <button
            className="btn-primary"
            style={{ flex: "0 0 auto", minWidth: "unset", padding: "10px 16px" }}
            onClick={() => manualInput && onResolve(manualInput)}
          >
            OK
          </button>
        </div>

        <button
          className="btn-secondary"
          style={{ marginTop: 12, width: "100%", justifyContent: "center" }}
          onClick={() => onResolve(clarification.itemRaw)}
        >
          Search as-is / जैसा है वैसे खोजें
        </button>
      </div>
    </div>
  );
};
