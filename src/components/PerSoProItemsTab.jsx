import React from "react";

export default function PerSoProItemsTab({ store }) {
  return (
    <div>
      <h3 style={styles.h3}>PER SO and PRO Items</h3>
      <p style={styles.p}>
        Placeholder tab. Later you’ll show SO/PRO details per item.
      </p>

      {store.savedItems.length === 0 ? (
        <div style={styles.empty}>No items yet. Extract a file first.</div>
      ) : (
        <div style={styles.list}>
          {store.savedItems.map((it) => (
            <div key={it.id} style={styles.card}>
              <div style={styles.titleRow}>
                <div style={styles.fileName}>{it.fileName}</div>
              </div>
              <div style={styles.line}>
                <span style={styles.label}>SO:</span>{" "}
                <span style={styles.value}>{it.so ?? "—"}</span>
              </div>
              <div style={styles.line}>
                <span style={styles.label}>PRO:</span>{" "}
                <span style={styles.value}>{it.pro ?? "—"}</span>
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
  titleRow: { display: "flex", justifyContent: "space-between", gap: 10 },
  fileName: { fontWeight: 800 },
  line: { marginTop: 8, color: "#eaeaea" },
  label: { color: "#bdbdbd" },
  value: { fontWeight: 700 },
};
