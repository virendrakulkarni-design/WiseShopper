"use client";

import React, { useState, useRef } from "react";

interface VisualSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItems: (items: string[]) => void;
  showToast: (msg: string) => void;
}

interface DetectedItem {
  name: string;
  category: string;
  confidence: string;
  selected?: boolean;
}

export const VisualSearchModal: React.FC<VisualSearchModalProps> = ({
  isOpen,
  onClose,
  onAddItems,
  showToast,
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>("image/jpeg");
  const [isScanning, setIsScanning] = useState(false);
  const [detectedType, setDetectedType] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [detectedItems, setDetectedItems] = useState<DetectedItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMimeType(file.type || "image/jpeg");
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setImagePreview(base64);
      analyzeImage(base64, file.type || "image/jpeg");
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = async (base64: string, mime: string) => {
    setIsScanning(true);
    setDetectedItems([]);
    setSummary(null);

    try {
      const res = await fetch("/api/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType: mime }),
      });
      const data = await res.json();

      setDetectedType(data.detectedType || "product_photo");
      setSummary(data.summary || "Items identified from image.");
      const items: DetectedItem[] = (data.items || []).map((it: any) => ({
        name: it.name,
        category: it.category || "other",
        confidence: it.confidence || "high",
        selected: true,
      }));
      setDetectedItems(items);
      showToast(`✨ Found ${items.length} items from image!`);
    } catch (err) {
      console.error("Vision scan failed:", err);
      showToast("❌ Could not analyze image. Try another photo.");
    } finally {
      setIsScanning(false);
    }
  };

  const toggleItem = (index: number) => {
    setDetectedItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, selected: !item.selected } : item))
    );
  };

  const handleConfirm = () => {
    const selectedNames = detectedItems.filter((i) => i.selected).map((i) => i.name);
    if (selectedNames.length > 0) {
      onAddItems(selectedNames);
      onClose();
      showToast(`✅ Added ${selectedNames.length} items to your shopping list!`);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div className="modal-title" style={{ margin: 0 }}>📷 AI Visual & Prescription Scanner</div>
          <button className="item-remove" style={{ fontSize: 20 }} onClick={onClose}>✕</button>
        </div>

        <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
          Upload a photo of a medicine prescription, grocery item package, or handwritten shopping list.
        </div>

        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />

        {!imagePreview ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: "2px dashed var(--border)",
              borderRadius: 16,
              padding: "36px 20px",
              textAlign: "center",
              cursor: "pointer",
              background: "var(--bg-primary)",
              transition: "all 0.2s",
            }}
          >
            <div style={{ fontSize: 42, marginBottom: 12 }}>📸</div>
            <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 15 }}>
              Click to upload or take a photo
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
              Supports JPG, PNG, WEBP (Prescriptions, labels, grocery lists)
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 16, background: "var(--bg-primary)", padding: 12, borderRadius: 12, border: "1px solid var(--border)" }}>
              <img
                src={imagePreview}
                alt="Upload preview"
                style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8 }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                  {isScanning ? "Scanning with Gemini Vision..." : (detectedType === "prescription" ? "📋 Medical Prescription" : "🛍️ Product / List")}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  {summary || (isScanning ? "Extracting products and dosages..." : "")}
                </div>
              </div>
              <button
                className="btn-secondary"
                style={{ padding: "6px 10px", fontSize: 12 }}
                onClick={() => fileInputRef.current?.click()}
              >
                Change
              </button>
            </div>

            {isScanning && (
              <div style={{ textAlign: "center", padding: "24px", color: "var(--accent-primary)" }}>
                <span className="spinner" style={{ width: 24, height: 24, marginBottom: 8, display: "inline-block" }} />
                <div style={{ fontSize: 13, fontWeight: 600 }}>Analyzing items in image...</div>
              </div>
            )}

            {detectedItems.length > 0 && !isScanning && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 8 }}>
                  Detected Items ({detectedItems.filter((i) => i.selected).length} selected)
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 200, overflowY: "auto" }}>
                  {detectedItems.map((item, idx) => (
                    <label
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "8px 12px",
                        borderRadius: 8,
                        background: item.selected ? "rgba(34, 197, 94, 0.1)" : "var(--bg-primary)",
                        border: item.selected ? "1px solid rgba(34, 197, 94, 0.3)" : "1px solid var(--border)",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => toggleItem(idx)}
                        style={{ accentColor: "var(--accent-secondary)" }}
                      />
                      <span style={{ fontSize: 13, fontWeight: 500, flex: 1, color: "var(--text-primary)" }}>
                        {item.name}
                      </span>
                      <span className="item-badge badge-cat">{item.category}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {detectedItems.length > 0 && !isScanning && (
              <button
                className="btn-primary"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={handleConfirm}
              >
                Add {detectedItems.filter((i) => i.selected).length} Items to Shopping List ➔
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
