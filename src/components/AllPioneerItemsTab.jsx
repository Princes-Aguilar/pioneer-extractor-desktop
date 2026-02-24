import React from "react";

export default function AllPioneerItemsTab({ store, actions }) {
  return (
    <div>
      <h3 style={styles.h3}>All Pioneer Items</h3>
      <p style={styles.p}>
        Skeleton view of saved items (later: search, filters, open file, export,
        etc.).
      </p>

      <div style={styles.toolbar}>
        <button style={styles.ghostBtn} onClick={actions.clearAll}>
          Clear all (temp)
        </button>
      </div>

      {store.savedItems.length === 0 ? (
        <div style={styles.empty}>No items saved yet. Go to “Extract”.</div>
      ) : (
        <div style={styles.list}>
          {store.savedItems.map((it) => (
            <div key={it.id} style={styles.card}>
              <div style={styles.fileName}>{it.fileName}</div>
              <div style={styles.meta}>
                Added: {new Date(it.addedAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  h3: { margin: "0 0 6px 0", fontSize: 20 },
  p: { margin: "0 0 14px 0", color: "#bdbdbd" },
  toolbar: { display: "flex", justifyContent: "flex-end", marginBottom: 10 },
  ghostBtn: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #2b2b2b",
    background: "transparent",
    color: "#fff",
    cursor: "pointer",
  },
  empty: {
    padding: 18,
    borderRadius: 12,
    border: "1px dashed #2b2b2b",
    color: "#bdbdbd",
  },
  list: { display: "grid", gap: 10 },
  card: {
    padding: 12,
    borderRadius: 12,
    border: "1px solid #242424",
    background: "#0f0f0f",
  },
  fileName: { fontWeight: 800 },
  meta: { marginTop: 6, color: "#bdbdbd", fontSize: 13 },
};
