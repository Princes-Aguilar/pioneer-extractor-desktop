import React, { useMemo, useState } from "react";

// ----------------------
// Helpers
// ----------------------
function parseNumber(v) {
  if (v == null) return 0;
  const s = String(v).replace(/,/g, "").trim();
  const m = s.match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : 0;
}

function fmtWeight(v) {
  const n = Number(v || 0);
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function upper(s) {
  return String(s || "")
    .trim()
    .toUpperCase();
}

export default function PerSoProItemsTab({ store, actions }) {
  const [selectedKey, setSelectedKey] = useState(null);
  const [editingRowKey, setEditingRowKey] = useState(null);
  const [draft, setDraft] = useState(null);

  const groups = useMemo(() => {
    const map = new Map();
    const saved = store?.savedItems || [];

    for (const rec of saved) {
      const recPro = (rec?.proNumber ?? "").toString().trim();
      const recSoi = (rec?.soiNumber ?? "").toString().trim();
      const recDest = (rec?.destination ?? "").toString().trim();

      const items = rec?.extractedItems || [];
      for (let idx = 0; idx < items.length; idx++) {
        const it = items[idx];

        const pro = (recPro || (it?.proNumber ?? "")).toString().trim();
        const soi = (recSoi || (it?.soiNumber ?? "")).toString().trim();
        const destination = (recDest || (it?.destination ?? ""))
          .toString()
          .trim();

        const safePro = pro || "—";
        const safeSoi = soi || "—";
        const safeDest = destination || "—";

        const key = `${safePro}||${safeSoi}||${safeDest}`;

        if (!map.has(key)) {
          map.set(key, {
            key,
            proNumber: safePro,
            soiNumber: safeSoi,
            destination: safeDest,
            rows: [],
            totalGrossWeight: 0,
            totalNetWeight: 0,
          });
        }

        const row = {
          ...it,
          __recordId: rec.id,
          __itemIndex: idx,
          __rowKey: `${rec.id}::${idx}`,
          fileName: it?.fileName ?? rec?.fileName ?? "",
          proNumber: safePro,
          soiNumber: safeSoi,
          destination: safeDest,
        };

        const g = map.get(key);
        g.rows.push(row);
        g.totalGrossWeight += parseNumber(row?.grossWeight);
        g.totalNetWeight += parseNumber(row?.netWeight);
      }
    }

    return Array.from(map.values()).sort((a, b) =>
      `${a.proNumber}|${a.soiNumber}|${a.destination}`.localeCompare(
        `${b.proNumber}|${b.soiNumber}|${b.destination}`,
        undefined,
        { sensitivity: "base" },
      ),
    );
  }, [store?.savedItems]);

  const selectedGroup = useMemo(() => {
    if (!selectedKey) return null;
    return groups.find((g) => g.key === selectedKey) || null;
  }, [groups, selectedKey]);

  const handleDeleteGroup = (g) => {
    if (!actions?.deletePerSoProGroup) {
      alert("deletePerSoProGroup action is missing in App.jsx.");
      return;
    }

    const ok = window.confirm(
      `Delete this group?\n\nPRO: ${g.proNumber}\nSOI: ${g.soiNumber}\nDestination: ${g.destination}`,
    );
    if (!ok) return;

    actions.deletePerSoProGroup({
      proNumber: g.proNumber,
      soiNumber: g.soiNumber,
      destination: g.destination,
    });

    if (selectedKey === g.key) setSelectedKey(null);
  };

  const startEdit = (row) => {
    setEditingRowKey(row.__rowKey);
    setDraft({
      recordId: row.__recordId,
      itemIndex: row.__itemIndex,
      rowKey: row.__rowKey,

      description: row.description || "",
      qty: row.qty ?? "",
      noOfBoxes: row.noOfBoxes ?? "",
      netWeight: row.netWeight ?? "",
      grossWeight: row.grossWeight ?? "",

      dgStatus: row.dgStatus || "",
      unNumber: row.unNumber || "",
      classNumber: row.classNumber || "",
      packingGroup: row.packingGroup || "",
      flashPoint: row.flashPoint || "",
      properShippingName: row.properShippingName || "",
      technicalName: row.technicalName || "",
      ems: row.ems || "",
      marinePollutant: row.marinePollutant || "",
      innerType: row.innerType || "",
      outerType: row.outerType || "",
    });
  };

  const cancelEdit = () => {
    setEditingRowKey(null);
    setDraft(null);
  };

  const saveEdit = () => {
    if (!draft || !actions?.updateSavedItemRow) {
      alert("updateSavedItemRow action is missing in App.jsx.");
      return;
    }

    actions.updateSavedItemRow({
      recordId: draft.recordId,
      itemIndex: draft.itemIndex,
      patch: {
        description: draft.description,
        qty: draft.qty,
        noOfBoxes: draft.noOfBoxes,
        netWeight: draft.netWeight,
        grossWeight: draft.grossWeight,

        dgStatus: draft.dgStatus,
        unNumber: draft.unNumber,
        classNumber: draft.classNumber,
        packingGroup: draft.packingGroup,
        flashPoint: draft.flashPoint,
        properShippingName: draft.properShippingName,
        technicalName: draft.technicalName,
        ems: draft.ems,
        marinePollutant: draft.marinePollutant,
        innerType: draft.innerType,
        outerType: draft.outerType,
      },
    });

    setEditingRowKey(null);
    setDraft(null);
  };

  const handleAddRow = () => {
    if (!selectedGroup) return;
    if (!actions?.addPerSoProRowTop) {
      alert("addPerSoProRowTop action is missing in App.jsx.");
      return;
    }

    const res = actions.addPerSoProRowTop({
      proNumber: selectedGroup.proNumber,
      soiNumber: selectedGroup.soiNumber,
      destination: selectedGroup.destination,
    });

    if (!res) return;

    const rowKey = `${res.recordId}::${res.itemIndex}`;
    setEditingRowKey(rowKey);
    setDraft({
      recordId: res.recordId,
      itemIndex: res.itemIndex,
      rowKey,

      description: "",
      qty: "",
      noOfBoxes: "",
      netWeight: "",
      grossWeight: "",

      dgStatus: "Non-DG",
      unNumber: "",
      classNumber: "",
      packingGroup: "",
      flashPoint: "",
      properShippingName: "",
      technicalName: "",
      ems: "",
      marinePollutant: "",
      innerType: "",
      outerType: "",
    });
  };

  if (!selectedGroup) {
    return (
      <div style={styles.wrap}>
        <div style={styles.head}>
          <div>
            <h2 style={styles.h2}>PER SO PER PRO TAB</h2>
            <div style={styles.sub}>Click a block to view details.</div>
          </div>

          <div style={styles.counter}>
            Groups: <b>{groups.length}</b>
          </div>
        </div>

        <div style={styles.blocks}>
          {groups.length === 0 ? (
            <div style={styles.empty}>No saved items yet.</div>
          ) : (
            groups.map((g) => (
              <div key={g.key} style={styles.blockRow}>
                <button
                  style={styles.blockBtn}
                  onClick={() => setSelectedKey(g.key)}
                  title="Open details"
                >
                  <div style={styles.blockLine}>
                    <span style={styles.blockLabel}>pro number:</span>{" "}
                    <b>{g.proNumber}</b>
                    <span style={{ marginLeft: 14 }} />
                    <span style={styles.blockLabel}>soi number:</span>{" "}
                    <b>{g.soiNumber}</b>
                  </div>

                  <div style={styles.blockMeta}>
                    <span style={styles.blockLabel}>destination:</span>{" "}
                    <b>{g.destination}</b>
                    <span style={{ marginLeft: 14 }} />
                    <span style={styles.blockLabel}>items:</span>{" "}
                    <b>{g.rows.length}</b>
                    <span style={{ marginLeft: 14 }} />
                    <span style={styles.blockLabel}>gross total:</span>{" "}
                    <b>{fmtWeight(g.totalGrossWeight)}</b>
                  </div>
                </button>

                <button
                  style={styles.deleteBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteGroup(g);
                  }}
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.head}>
        <div>
          <h2 style={styles.h2}>PER SO PER PRO TAB</h2>
          <div style={styles.pairTitle}>
            pro: <b>{selectedGroup.proNumber}</b> &nbsp;|&nbsp; soi:{" "}
            <b>{selectedGroup.soiNumber}</b> &nbsp;|&nbsp; destination:{" "}
            <b>{selectedGroup.destination}</b> &nbsp;|&nbsp; items:{" "}
            <b>{selectedGroup.rows.length}</b> &nbsp;|&nbsp; gross total:{" "}
            <b>{fmtWeight(selectedGroup.totalGrossWeight)}</b>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button style={styles.primaryBtn} onClick={handleAddRow}>
            + Add
          </button>
          <button style={styles.ghostBtn} onClick={() => setSelectedKey(null)}>
            ← Back
          </button>
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
                <th style={styles.th}>DG/Non-DG</th>
                <th style={styles.th}>UN No.</th>
                <th style={styles.th}>Class</th>
                <th style={styles.th}>Packing Group</th>
                <th style={styles.th}>Flash Point</th>
                <th style={styles.th}>Proper Shipping Name</th>
                <th style={styles.th}>Technical Name</th>
                <th style={styles.th}>EMS</th>
                <th style={styles.th}>Marine Pollutant</th>
                <th style={styles.th}>Inner Type</th>
                <th style={styles.th}>Outer Type</th>
                <th style={styles.th}></th>
              </tr>
            </thead>

            <tbody>
              {selectedGroup.rows.map((r) => {
                const isEditing = editingRowKey === r.__rowKey;

                return (
                  <tr key={r.__rowKey}>
                    <td style={styles.td}>
                      {isEditing ? (
                        <input
                          style={styles.inputWide}
                          value={draft.description}
                          onChange={(e) =>
                            setDraft({ ...draft, description: e.target.value })
                          }
                        />
                      ) : (
                        r.description || "—"
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
                        (r.qty ?? "—")
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
                        (r.noOfBoxes ?? "—")
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
                        (r.netWeight ?? "—")
                      )}
                    </td>

                    <td style={styles.td}>
                      {isEditing ? (
                        <input
                          style={styles.input}
                          value={draft.grossWeight}
                          onChange={(e) =>
                            setDraft({ ...draft, grossWeight: e.target.value })
                          }
                        />
                      ) : (
                        (r.grossWeight ?? "—")
                      )}
                    </td>

                    <td style={styles.td}>{r.fileName || "—"}</td>

                    <td style={styles.td}>
                      {isEditing ? (
                        <select
                          style={styles.input}
                          value={draft.dgStatus}
                          onChange={(e) =>
                            setDraft({ ...draft, dgStatus: e.target.value })
                          }
                        >
                          <option value="">--</option>
                          <option value="DG">DG</option>
                          <option value="Non-DG">Non-DG</option>
                        </select>
                      ) : (
                        r.dgStatus || "—"
                      )}
                    </td>

                    <td style={styles.td}>
                      {isEditing ? (
                        <input
                          style={styles.input}
                          value={draft.unNumber}
                          onChange={(e) => {
                            const nextUn = e.target.value;
                            setDraft({
                              ...draft,
                              unNumber: nextUn,
                              dgStatus: nextUn.trim() ? "DG" : "Non-DG",
                            });
                          }}
                        />
                      ) : (
                        r.unNumber || "—"
                      )}
                    </td>

                    <td style={styles.td}>
                      {isEditing ? (
                        <input
                          style={styles.input}
                          value={draft.classNumber}
                          onChange={(e) =>
                            setDraft({ ...draft, classNumber: e.target.value })
                          }
                        />
                      ) : (
                        r.classNumber || "—"
                      )}
                    </td>

                    <td style={styles.td}>
                      {isEditing ? (
                        <input
                          style={styles.input}
                          value={draft.packingGroup}
                          onChange={(e) =>
                            setDraft({ ...draft, packingGroup: e.target.value })
                          }
                        />
                      ) : (
                        r.packingGroup || "—"
                      )}
                    </td>

                    <td style={styles.td}>
                      {isEditing ? (
                        <input
                          style={styles.input}
                          value={draft.flashPoint}
                          onChange={(e) =>
                            setDraft({ ...draft, flashPoint: e.target.value })
                          }
                        />
                      ) : (
                        r.flashPoint || "—"
                      )}
                    </td>

                    <td style={styles.td}>
                      {isEditing ? (
                        <input
                          style={styles.inputWide}
                          value={draft.properShippingName}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              properShippingName: e.target.value,
                            })
                          }
                        />
                      ) : (
                        r.properShippingName || "—"
                      )}
                    </td>

                    <td style={styles.td}>
                      {isEditing ? (
                        <input
                          style={styles.inputWide}
                          value={draft.technicalName}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              technicalName: e.target.value,
                            })
                          }
                        />
                      ) : (
                        r.technicalName || "—"
                      )}
                    </td>

                    <td style={styles.td}>
                      {isEditing ? (
                        <input
                          style={styles.input}
                          value={draft.ems}
                          onChange={(e) =>
                            setDraft({ ...draft, ems: e.target.value })
                          }
                        />
                      ) : (
                        r.ems || "—"
                      )}
                    </td>

                    <td style={styles.td}>
                      {isEditing ? (
                        <select
                          style={styles.input}
                          value={draft.marinePollutant}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              marinePollutant: e.target.value,
                            })
                          }
                        >
                          <option value="">--</option>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      ) : (
                        r.marinePollutant || "—"
                      )}
                    </td>

                    <td style={styles.td}>
                      {isEditing ? (
                        <input
                          style={styles.input}
                          value={draft.innerType}
                          onChange={(e) =>
                            setDraft({ ...draft, innerType: e.target.value })
                          }
                        />
                      ) : (
                        r.innerType || "—"
                      )}
                    </td>

                    <td style={styles.td}>
                      {isEditing ? (
                        <input
                          style={styles.input}
                          value={draft.outerType}
                          onChange={(e) =>
                            setDraft({ ...draft, outerType: e.target.value })
                          }
                        />
                      ) : (
                        r.outerType || "—"
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
                          <button style={styles.primaryBtn} onClick={saveEdit}>
                            Save
                          </button>
                          <button style={styles.ghostBtn} onClick={cancelEdit}>
                            Back
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}

              <tr>
                <td style={{ ...styles.td, fontWeight: 900 }}>TOTAL</td>
                <td style={styles.td} />
                <td style={styles.td} />
                <td style={{ ...styles.td, fontWeight: 900 }}>
                  {fmtWeight(selectedGroup.totalNetWeight)}
                </td>
                <td style={{ ...styles.td, fontWeight: 900 }}>
                  {fmtWeight(selectedGroup.totalGrossWeight)}
                </td>
                <td style={styles.td} colSpan={13} />
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrap: { display: "flex", flexDirection: "column", gap: 12 },
  head: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  h2: { margin: 0, fontSize: 16, fontWeight: 900 },
  sub: { marginTop: 6, color: "#bdbdbd", fontSize: 12 },
  counter: {
    color: "#bdbdbd",
    fontSize: 12,
    border: "1px solid #2b2b2b",
    borderRadius: 999,
    padding: "8px 12px",
    background: "#101010",
  },
  blocks: { display: "flex", flexDirection: "column", gap: 10 },
  blockRow: { display: "flex", gap: 10, alignItems: "stretch" },
  blockBtn: {
    flex: 1,
    textAlign: "left",
    border: "1px solid #2b2b2b",
    background: "#0f0f0f",
    color: "#fff",
    borderRadius: 12,
    padding: "14px 16px",
    cursor: "pointer",
  },
  deleteBtn: {
    width: 110,
    border: "1px solid #5a1a1a",
    background: "#2a1010",
    color: "#ffb3b3",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 800,
  },
  blockLine: { fontSize: 14 },
  blockMeta: { marginTop: 8, fontSize: 12, color: "#bdbdbd" },
  blockLabel: { color: "#9a9a9a" },
  pairTitle: { marginTop: 6, color: "#bdbdbd", fontSize: 12 },
  ghostBtn: {
    border: "1px solid #2b2b2b",
    background: "#101010",
    color: "#fff",
    borderRadius: 10,
    padding: "10px 12px",
    cursor: "pointer",
    fontWeight: 800,
  },
  primaryBtn: {
    border: "1px solid #fff",
    background: "#fff",
    color: "#000",
    borderRadius: 10,
    padding: "10px 12px",
    cursor: "pointer",
    fontWeight: 800,
  },
  card: {
    border: "1px solid #2b2b2b",
    background: "#0f0f0f",
    borderRadius: 12,
    padding: 12,
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th: {
    textAlign: "left",
    borderBottom: "1px solid #2b2b2b",
    padding: "10px 8px",
    color: "#bdbdbd",
    fontWeight: 900,
    whiteSpace: "nowrap",
  },
  td: {
    borderBottom: "1px solid #1f1f1f",
    padding: "10px 8px",
    whiteSpace: "nowrap",
    verticalAlign: "top",
  },
  input: {
    width: 90,
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid #2b2b2b",
    background: "#0c0c0c",
    color: "#fff",
  },
  inputWide: {
    width: 220,
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid #2b2b2b",
    background: "#0c0c0c",
    color: "#fff",
  },
  empty: {
    border: "1px dashed #2b2b2b",
    borderRadius: 12,
    padding: 18,
    color: "#bdbdbd",
    background: "#0f0f0f",
  },
};
