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

          // ✅ NEW: PRO/SOI beside filename (prefer record-level, fallback to item-level)
          proNumber: it.proNumber ?? rec.proNumber ?? "",
          soiNumber: it.soiNumber ?? rec.soiNumber ?? "",

          hsCode: it.hsCode ?? "",
          dgStatus: it.dgStatus ?? "",
          unNumber: it.unNumber ?? "",
          classNumber: it.classNumber ?? "",
          packingGroup: it.packingGroup ?? "",
          flashPoint: it.flashPoint ?? "",
          properShippingName: it.properShippingName ?? "",
          technicalName: it.technicalName ?? "",
          ems: it.ems ?? "",
          marinePollutant: it.marinePollutant ?? "",
          innerType: it.innerType ?? "",
          outerType: it.outerType ?? "",
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
        grossWeight: draft.grossWeight === "" ? null : Number(draft.grossWeight),

        fileName: String(draft.fileName ?? "").trim(),

        // ✅ NEW: Save editable PRO/SOI too
        proNumber: String(draft.proNumber ?? "").trim(),
        soiNumber: String(draft.soiNumber ?? "").trim(),

        hsCode: String(draft.hsCode ?? "").trim(),
        dgStatus: String(draft.dgStatus ?? "").trim(),
        unNumber: String(draft.unNumber ?? "").trim(),
        classNumber: String(draft.classNumber ?? "").trim(),
        packingGroup: String(draft.packingGroup ?? "").trim(),
        flashPoint: String(draft.flashPoint ?? "").trim(),
        properShippingName: String(draft.properShippingName ?? "").trim(),
        technicalName: String(draft.technicalName ?? "").trim(),
        ems: String(draft.ems ?? "").trim(),
        marinePollutant: String(draft.marinePollutant ?? "").trim(),
        innerType: String(draft.innerType ?? "").trim(),
        outerType: String(draft.outerType ?? "").trim(),
      },
    });

    setEditingKey(null);
    setDraft(null);
  };

  const handleAdd = () => {
    if (!store.savedItems?.length) {
      setError?.("No saved records yet. Extract and Save first.");
      return;
    }

    // Add a row to the top of the latest record
    actions.addSavedItemRowTop();

    // Immediately open edit mode for that new top row:
    const recordId = store.savedItems[0].id;
    const rowKey = `${recordId}::0`;

    setEditingKey(rowKey);

    // draft should match your row shape (include recordId + itemIndex)
    setDraft({
      rowKey,
      recordId,
      itemIndex: 0,
      description: "",
      qty: "",
      noOfBoxes: "",
      netWeight: "",
      grossWeight: "",
      fileName: store.savedItems[0].fileName || "",

      // ✅ NEW: include blank defaults
      proNumber: store.savedItems[0].proNumber || "",
      soiNumber: store.savedItems[0].soiNumber || "",

      hsCode: "",
      dgStatus: "",
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

  return (
    <div style={styles.wrap}>
      <div style={styles.head}>
        <div>
          <h2 style={styles.h2}>All Pioneer Items</h2>
          <p style={styles.p}>All extracted & saved items in one table. Edit any row.</p>
        </div>
        <button style={styles.ghostBtn} onClick={handleAdd}>
          + Add
        </button>
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
                {/* ✅ NEW columns beside File Name */}
                <th style={styles.th}>PRO No.</th>
                <th style={styles.th}>SOI No.</th>

                <th style={styles.th}>HS Code</th>
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
              {rows.length === 0 ? (
                <tr>
                  {/* ✅ Updated colspan (now 21 columns total) */}
                  <td style={styles.tdMuted} colSpan={21}>
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
                            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
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
                            onChange={(e) => setDraft({ ...draft, qty: e.target.value })}
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
                            onChange={(e) => setDraft({ ...draft, noOfBoxes: e.target.value })}
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
                            onChange={(e) => setDraft({ ...draft, netWeight: e.target.value })}
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
                            onChange={(e) => setDraft({ ...draft, grossWeight: e.target.value })}
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
                            onChange={(e) => setDraft({ ...draft, fileName: e.target.value })}
                          />
                        ) : (
                          r.fileName
                        )}
                      </td>

                      {/* ✅ NEW: PRO No. */}
                      <td style={styles.td}>
                        {isEditing ? (
                          <input
                            style={styles.inputWide}
                            value={draft.proNumber}
                            onChange={(e) => setDraft({ ...draft, proNumber: e.target.value })}
                          />
                        ) : (
                          r.proNumber
                        )}
                      </td>

                      {/* ✅ NEW: SOI No. */}
                      <td style={styles.td}>
                        {isEditing ? (
                          <input
                            style={styles.inputWide}
                            value={draft.soiNumber}
                            onChange={(e) => setDraft({ ...draft, soiNumber: e.target.value })}
                          />
                        ) : (
                          r.soiNumber
                        )}
                      </td>

                      <td style={styles.td}>
                        {isEditing ? (
                          <input
                            style={styles.input}
                            value={draft.hsCode}
                            onChange={(e) => setDraft({ ...draft, hsCode: e.target.value })}
                          />
                        ) : (
                          r.hsCode
                        )}
                      </td>

                      <td style={styles.td}>
                        {isEditing ? (
                          <select
                            style={styles.input}
                            value={draft.dgStatus}
                            onChange={(e) => setDraft({ ...draft, dgStatus: e.target.value })}
                          >
                            <option value="">--</option>
                            <option value="DG">DG</option>
                            <option value="Non-DG">Non-DG</option>
                          </select>
                        ) : (
                          r.dgStatus
                        )}
                      </td>

                      <td style={styles.td}>
                        {isEditing ? (
                          <input
                            style={styles.input}
                            value={draft.unNumber}
                            onChange={(e) => setDraft({ ...draft, unNumber: e.target.value })}
                          />
                        ) : (
                          r.unNumber
                        )}
                      </td>

                      <td style={styles.td}>
                        {isEditing ? (
                          <input
                            style={styles.input}
                            value={draft.classNumber}
                            onChange={(e) => setDraft({ ...draft, classNumber: e.target.value })}
                          />
                        ) : (
                          r.classNumber
                        )}
                      </td>

                      <td style={styles.td}>
                        {isEditing ? (
                          <input
                            style={styles.input}
                            value={draft.packingGroup}
                            onChange={(e) => setDraft({ ...draft, packingGroup: e.target.value })}
                          />
                        ) : (
                          r.packingGroup
                        )}
                      </td>

                      <td style={styles.td}>
                        {isEditing ? (
                          <input
                            style={styles.input}
                            value={draft.flashPoint}
                            onChange={(e) => setDraft({ ...draft, flashPoint: e.target.value })}
                          />
                        ) : (
                          r.flashPoint
                        )}
                      </td>

                      <td style={styles.td}>
                        {isEditing ? (
                          <input
                            style={styles.inputWide}
                            value={draft.properShippingName}
                            onChange={(e) =>
                              setDraft({ ...draft, properShippingName: e.target.value })
                            }
                          />
                        ) : (
                          r.properShippingName
                        )}
                      </td>

                      <td style={styles.td}>
                        {isEditing ? (
                          <input
                            style={styles.inputWide}
                            value={draft.technicalName}
                            onChange={(e) => setDraft({ ...draft, technicalName: e.target.value })}
                          />
                        ) : (
                          r.technicalName
                        )}
                      </td>

                      <td style={styles.td}>
                        {isEditing ? (
                          <input
                            style={styles.input}
                            value={draft.ems}
                            onChange={(e) => setDraft({ ...draft, ems: e.target.value })}
                          />
                        ) : (
                          r.ems
                        )}
                      </td>

                      <td style={styles.td}>
                        {isEditing ? (
                          <select
                            style={styles.input}
                            value={draft.marinePollutant}
                            onChange={(e) =>
                              setDraft({ ...draft, marinePollutant: e.target.value })
                            }
                          >
                            <option value="">--</option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </select>
                        ) : (
                          r.marinePollutant
                        )}
                      </td>

                      <td style={styles.td}>
                        {isEditing ? (
                          <input
                            style={styles.input}
                            value={draft.innerType}
                            onChange={(e) => setDraft({ ...draft, innerType: e.target.value })}
                          />
                        ) : (
                          r.innerType
                        )}
                      </td>

                      <td style={styles.td}>
                        {isEditing ? (
                          <input
                            style={styles.input}
                            value={draft.outerType}
                            onChange={(e) => setDraft({ ...draft, outerType: e.target.value })}
                          />
                        ) : (
                          r.outerType
                        )}
                      </td>

                      <td style={styles.td}>
                        {!isEditing ? (
                          <button style={styles.ghostBtn} onClick={() => startEdit(r)}>
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