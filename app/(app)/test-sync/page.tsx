"use client";

import { useState } from "react";

export default function TestSyncPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runSync() {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/sync-financial-clientes", { method: "POST" });
      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
      console.log("[SYNC RESULT]", data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 32, fontFamily: "monospace" }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
        TEST — sync-financial-clientes
      </h1>
      <button
        onClick={runSync}
        disabled={loading}
        style={{
          background: loading ? "#888" : "#e11d48",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          padding: "10px 20px",
          fontSize: 14,
          fontWeight: 600,
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "A sincronizar…" : "POST /api/sync-financial-clientes"}
      </button>

      {error && (
        <pre style={{ marginTop: 24, color: "red", whiteSpace: "pre-wrap" }}>
          ERROR: {error}
        </pre>
      )}

      {result && (
        <pre
          style={{
            marginTop: 24,
            background: "#111",
            color: "#0f0",
            padding: 16,
            borderRadius: 6,
            whiteSpace: "pre-wrap",
            fontSize: 13,
          }}
        >
          {result}
        </pre>
      )}
    </div>
  );
}
