"use client";

import React, { useState } from "react";

interface WhatsAppImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItems: (items: string[]) => void;
  showToast: (msg: string) => void;
}

export const WhatsAppImporterModal: React.FC<WhatsAppImporterModalProps> = ({
  isOpen,
  onClose,
  onAddItems,
  showToast,
}) => {
  const [rawText, setRawText] = useState("");

  if (!isOpen) return null;

  const parseLines = (): string[] => {
    return rawText
      .split(/[\n\r]+/)
      .map((line) => {
        // Remove leading numbers (1., 2.), bullets (-, *, •), and checkboxes ([ ], [x])
        return line.replace(/^(\d+[\.\)]|\s*[-*•]\s*|\s*\[[ xX]?\]\s*)/, "").trim();
      })
      .filter((line) => line.length > 1);
  };

  const parsedItems = parseLines();

  const handleImport = () => {
    if (parsedItems.length === 0) return;
    onAddItems(parsedItems);
    setRawText("");
    onClose();
    showToast(`📝 Imported ${parsedItems.length} items from text!`);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div className="modal-title" style={{ margin: 0 }}>📋 Quick List & WhatsApp Importer</div>
          <button className="item-remove" style={{ fontSize: 20 }} onClick={onClose}>✕</button>
        </div>

        <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
          Paste a shopping list from WhatsApp, notes, or messages. Items will be automatically separated and translated.
        </div>

        <textarea
          rows={6}
          className="manual-input"
          style={{ width: "100%", height: 140, resize: "vertical", fontFamily: "inherit", padding: 12, borderRadius: 12 }}
          placeholder={"Paste here, e.g.:\n1. Aashirvaad Atta 5kg\n2. Fortune Mustard Oil 1L\n3. Dolo 650 strip\n4. Surf Excel 1kg\n5. Amul Butter 500g"}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
        />

        {parsedItems.length > 0 && (
          <div style={{ marginTop: 12, marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6 }}>
              Detected {parsedItems.length} Items:
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 100, overflowY: "auto" }}>
              {parsedItems.map((it, idx) => (
                <span key={idx} className="quick-chip" style={{ background: "rgba(249, 115, 22, 0.1)", color: "var(--text-primary)" }}>
                  {it}
                </span>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button className="btn-secondary" style={{ flex: 1, justifyContent: "center" }} onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            style={{ flex: 2, justifyContent: "center" }}
            disabled={parsedItems.length === 0}
            onClick={handleImport}
          >
            Import {parsedItems.length > 0 ? `(${parsedItems.length})` : ""} Items ➔
          </button>
        </div>
      </div>
    </div>
  );
};
