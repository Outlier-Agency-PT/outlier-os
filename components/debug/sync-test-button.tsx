"use client";

export function SyncTestButton() {
  return (
    <button
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 9999,
        background: "#e11d48",
        color: "#fff",
        border: "none",
        borderRadius: 6,
        padding: "8px 14px",
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
      }}
      onClick={() => {
        console.log("[SYNC TEST] calling /api/sync-financial-clientes …");
        fetch("/api/sync-financial-clientes", { method: "POST" })
          .then((r) => r.json())
          .then((data) => {
            console.log("[SYNC RESULT]", JSON.stringify(data, null, 2));
            alert(JSON.stringify(data, null, 2));
          })
          .catch((err) => console.error("[SYNC ERROR]", err));
      }}
    >
      TEST SYNC FINANCEIRO
    </button>
  );
}
