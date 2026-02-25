import React, { useMemo, useState } from "react";

export default function AllPioneerTab({ store, actions }) {
  const [editingKey, setEditingKey] = useState(null); // unique row key
  const [draft, setDraft] = useState(null);

  // Flatten all saved records into rows
  const rows = useMemo(() => {
    const out = [];
    for (const rec of store.savedItems || []) {
      for (let i = 0; i < (rec.extractedItems || []).length; i++) {
        const it = rec.extractedItems[i];
        out.push({
          rowKey: `${rec.id}::${i}`, // stable unique key for editing
          recordId: rec.id,
          itemIndex: i,
          description: it.description ?? "",
          qty: it.qty ?? "",
          noOfBoxes: it.noOfBoxes ?? "",
          netWeight: it.netWeight ?? "",
          grossWeight: it.grossWeight ?? "",
          fileName: it.fileName ?? rec.fileName ?? "",
        });
      }
    }
    return out;
  }, [store.savedItems]);

  const startEdit = (row) => {
    setEditingKey(row.rowKey);
    setDraft({ ...row });
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setDraft(null);
  };

  const saveEdit = () => {
    if (!draft) return;

    actions.updateSavedItemRow({
      recordId: draft.recordId,
      itemIndex: draft.itemIndex,
      patch: {
        description: String(draft.description ?? "").trim(),
        qty: draft.qty === "" ? null : Number(draft.qty),
        noOfBoxes: draft.noOfBoxes === "" ? null : Number(draft.noOfBoxes),
        netWeight: draft.netWeight === "" ? null : Number(draft.netWeight),
        grossWeight:
          draft.grossWeight === "" ? null : Number(draft.grossWeight),
        fileName: String(draft.fileName ?? "").trim(),
      },
    });

    setEditingKey(null);
    setDraft(null);
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.head}>
        <div>
          <h2 style={styles.h2}>All Pioneer Items</h2>
          <p style={styles.p}>
            All extracted & saved items in one table. Edit any row.
          </p>
        </div>
      </div>

      <div style={styles.card}>
        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Description</th>
                <th style={styles.th}>Qty</th>
                <th style={styles.th}>Boxes</th>
                <th style={styles.th}>Net Wt</th>
                <th style={styles.th}>Gross Wt</th>
                <th style={styles.th}>File Name</th>
                <th style={styles.th}></th>
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td style={styles.tdMuted} colSpan={7}>
                    No saved items yet.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const isEditing = editingKey === r.rowKey;

                  return (
                    <tr key={r.rowKey}>
                      <td style={styles.td}>
                        {isEditing ? (
                          <input
                            style={styles.inputWide}
                            value={draft.description}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                description: e.target.value,
                              })
                            }
                          />
                        ) : (
                          r.description
                        )}
                      </td>

                      <td style={styles.td}>
                        {isEditing ? (
                          <input
                            style={styles.input}
                            value={draft.qty}
                            onChange={(e) =>
                              setDraft({ ...draft, qty: e.target.value })
                            }
                          />
                        ) : (
                          r.qty
                        )}
                      </td>

                      <td style={styles.td}>
                        {isEditing ? (
                          <input
                            style={styles.input}
                            value={draft.noOfBoxes}
                            onChange={(e) =>
                              setDraft({ ...draft, noOfBoxes: e.target.value })
                            }
                          />
                        ) : (
                          r.noOfBoxes
                        )}
                      </td>

                      <td style={styles.td}>
                        {isEditing ? (
                          <input
                            style={styles.input}
                            value={draft.netWeight}
                            onChange={(e) =>
                              setDraft({ ...draft, netWeight: e.target.value })
                            }
                          />
                        ) : (
                          r.netWeight
                        )}
                      </td>

                      <td style={styles.td}>
                        {isEditing ? (
                          <input
                            style={styles.input}
                            value={draft.grossWeight}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                grossWeight: e.target.value,
                              })
                            }
                          />
                        ) : (
                          r.grossWeight
                        )}
                      </td>

                      <td style={styles.td}>
                        {isEditing ? (
                          <input
                            style={styles.inputWide}
                            value={draft.fileName}
                            onChange={(e) =>
                              setDraft({ ...draft, fileName: e.target.value })
                            }
                          />
                        ) : (
                          r.fileName
                        )}
                      </td>

                      <td style={styles.td}>
                        {!isEditing ? (
                          <button
                            style={styles.ghostBtn}
                            onClick={() => startEdit(r)}
                          >
                            Edit
                          </button>
                        ) : (
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              style={styles.primaryBtn}
                              onClick={saveEdit}
                            >
                              Save
                            </button>
                            <button
                              style={styles.ghostBtn}
                              onClick={cancelEdit}
                            >
                              Back
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrap: { display: "flex", flexDirection: "column", gap: 14 },
  head: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  h2: { margin: 0, fontSize: 22 },
  p: { margin: "6px 0 0 0", color: "#bdbdbd" },

  card: {
    padding: 16,
    border: "1px solid #2b2b2b",
    borderRadius: 12,
    background: "#101010",
  },

  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    textAlign: "left",
    padding: "10px 8px",
    borderBottom: "1px solid #2b2b2b",
    color: "#bdbdbd",
    fontWeight: 800,
    fontSize: 12,
    whiteSpace: "nowrap",
  },
  td: {
    padding: "10px 8px",
    borderBottom: "1px solid #1f1f1f",
    verticalAlign: "top",
    whiteSpace: "nowrap",
  },
  tdMuted: { padding: "12px 8px", color: "#bdbdbd" },

  input: {
    width: 90,
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid #2b2b2b",
    background: "#0c0c0c",
    color: "#fff",
  },
  inputWide: {
    width: 280,
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid #2b2b2b",
    background: "#0c0c0c",
    color: "#fff",
  },

  ghostBtn: {
    padding: "9px 12px",
    border: "1px solid #2b2b2b",
    background: "transparent",
    color: "#fff",
    borderRadius: 10,
    cursor: "pointer",
  },
  primaryBtn: {
    padding: "9px 12px",
    border: "1px solid #fff",
    background: "#fff",
    color: "#000",
    borderRadius: 10,
    fontWeight: 800,
    cursor: "pointer",
  },
};
