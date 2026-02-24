import React from "react";

export default function AllPioneerItemsTab({ store, actions }) {
  return (
    <div>
      <h3 style={{ margin: "0 0 6px 0", fontSize: 20 }}>All Pioneer Items</h3>
      <p style={{ margin: "0 0 14px 0", color: "#bdbdbd" }}>
        Saved extracted files (in-memory for now).
      </p>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 10,
        }}
      >
        <button
          onClick={actions.clearAll}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #2b2b2b",
            background: "transparent",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Clear all (temp)
        </button>
      </div>

      {store.savedItems.length === 0 ? (
        <div
          style={{
            padding: 18,
            borderRadius: 12,
            border: "1px dashed #2b2b2b",
            color: "#bdbdbd",
          }}
        >
          No saved items yet. Go to “Extract”.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {store.savedItems.map((it) => (
            <div
              key={it.id}
              style={{
                padding: 12,
                borderRadius: 12,
                border: "1px solid #242424",
                background: "#0f0f0f",
              }}
            >
              <div style={{ fontWeight: 900 }}>{it.fileName}</div>
              <div style={{ marginTop: 6, color: "#bdbdbd", fontSize: 13 }}>
                Added: {new Date(it.addedAt).toLocaleString()}
              </div>

              <div style={{ marginTop: 10, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>QTY</th>
                      <th>No. Boxes</th>
                      <th>Net Wt</th>
                      <th>Gross Wt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {it.extractedItems?.length ? (
                      it.extractedItems.map((r, idx) => (
                        <tr key={idx}>
                          <td>{r.description}</td>
                          <td>{r.qty ?? "—"}</td>
                          <td>{r.noOfBoxes ?? "—"}</td>
                          <td>{r.netWeight ?? "—"}</td>
                          <td>{r.grossWeight ?? "—"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" style={{ color: "#bdbdbd" }}>
                          No extracted rows saved.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
