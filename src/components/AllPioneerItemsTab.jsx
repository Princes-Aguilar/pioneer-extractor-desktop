import React, { useMemo, useState } from "react";

export default function AllPioneerTab({ store, actions }) {
  const [editingKey, setEditingKey] = useState(null);
  const [draft, setDraft] = useState(null);

  // -----------------------------
  // Helpers: normalize + clean description
  // -----------------------------
  const normSpaces = (s) => (s ?? "").toString().replace(/\s+/g, " ").trim();

  // Remove common measurement patterns from a product description.
  // This is intentionally conservative; you can add more patterns later.
  const cleanDescription = (input) => {
    let s = normSpaces(input).toUpperCase();

    // remove content inside parentheses (often pack/size notes)
    s = s.replace(/\([^)]*\)/g, " ");

    // normalize separators
    s = s.replace(/[•·]/g, " ");

    // remove dimension patterns like 10X20, 10 X 20, 10×20
    s = s.replace(/\b\d+(\.\d+)?\s*(X|\*|×)\s*\d+(\.\d+)?\b/g, " ");

    // remove fractions like 1/4 (often sizes)
    s = s.replace(/\b\d+\s*\/\s*\d+\b/g, " ");

    // remove numbers + units (ML/L/G/KG/etc.)
    s = s.replace(
      /\b\d+(\.\d+)?\s*(ML|L|LTR|LITRE|LITER|G|GRAM|GRAMS|KG|KGS|MG|OZ|LB|LBS|GAL|GALLON|GALLONS|CC|CM|MM|M|IN|INCH|INCHES|FT|FEET|YD|PCS|PC|PIECE|PIECES|SET|SETS|PACK|PACKS|PAIR|PAIRS|PINT|QUART|QT|ROLL|ROLLS)\b/g,
      " ",
    );

    // remove things like "500/BOX", "10/PK"
    s = s.replace(
      /\b\d+\s*\/\s*(BOX|PK|PACK|CT|CASE|BAG|SACK|DRUM|PALLET|ROLL)\b/g,
      " ",
    );

    // ✅ NEW: remove common color words (add more anytime)
    // This collapses: "GLOSS WHITE" and "GLOSS ULTRAMARINE" -> "GLOSS"
    const COLORS = [
      "PIONEER ",
      "PIONEER",
      "WHITE",
      "BLACK",
      "RED",
      "BLUE",
      "GREEN",
      "YELLOW",
      "ORANGE",
      "VIOLET",
      "PURPLE",
      "PINK",
      "BROWN",
      "GRAY",
      "GREY",
      "SILVER",
      "GOLD",
      "BEIGE",
      "CREAM",
      "IVORY",
      "NAVY",
      "SKY",
      "TEAL",
      "TURQUOISE",
      "MAROON",
      "MAGENTA",
      "CYAN",
      "LIME",
      "OLIVE",
      "TAN",
      "BRONZE",
      "COPPER",
      "PEARL",
      "CLEAR",
      "TRANSPARENT",
      "ULTRAMARINE",
      "SCARLET",
      "CRIMSON",
      "ROYAL",
    ];

    // remove phrases like "OFF WHITE", "LIGHT BLUE", "DARK GRAY"
    s = s.replace(
      /\b(LIGHT|DARK|DEEP|PALE|BRIGHT|MATTE|GLOSS|GLOSSY)\s+(WHITE|BLACK|RED|BLUE|GREEN|YELLOW|ORANGE|GRAY|GREY|SILVER|GOLD|BEIGE|CREAM|IVORY|NAVY|TEAL|TURQUOISE|MAROON|MAGENTA|CYAN|LIME|OLIVE|TAN|BRONZE|COPPER|PEARL|CLEAR|TRANSPARENT|ULTRAMARINE)\b/g,
      " ",
    );

    // remove single color tokens
    const colorRegex = new RegExp(`\\b(${COLORS.join("|")})\\b`, "g");
    s = s.replace(colorRegex, " ");

    // optional: remove leftover standalone numbers (comment out if you have model codes like "LOCTITE 243")
    s = s.replace(/\b\d+(\.\d+)?\b/g, " ");

    // final cleanup
    s = s.replace(/[^A-Z0-9\s\-]/g, " ");
    s = normSpaces(s);

    // ✅ If you want to remove trailing leftover words like LITERS/LITER too (just in case)
    s = s.replace(/\b(LITER|LITRE|LITERS|LITRES)\b/g, " ");
    s = normSpaces(s);

    return s;
  };
  const makeKey = (descClean) => descClean.toLowerCase();

  // -----------------------------
  // Build UNIQUE rows for All Pioneer
  // -----------------------------
  const rows = useMemo(() => {
    const out = [];
    const seen = new Set();

    // savedItems is newest-first (based on your save logic)
    // so the first time we see a product, we keep the newest one.
    for (const rec of store.savedItems || []) {
      const items = rec.extractedItems || [];

      for (let i = 0; i < items.length; i++) {
        const it = items[i];

        const rawDesc = it.description ?? "";
        const descClean = cleanDescription(rawDesc);

        // If cleaning wipes everything, fall back to raw
        const finalClean =
          descClean || normSpaces(rawDesc).toUpperCase() || "—";

        const key = makeKey(finalClean);
        if (seen.has(key)) continue;
        seen.add(key);

        out.push({
          rowKey: `${rec.id}::${i}`,
          recordId: rec.id,
          itemIndex: i,

          // show cleaned description, but keep raw for tooltip/debug
          descriptionClean: finalClean,
          descriptionRaw: normSpaces(rawDesc),

          // keep other fields (you can decide what to show in this unique list)
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
    // Sort alphabetically by cleaned description
    out.sort((a, b) =>
      (a.descriptionClean || "").localeCompare(
        b.descriptionClean || "",
        undefined,
        { sensitivity: "base" }, // ignore case
      ),
    );

    return out;
    return out;
  }, [store.savedItems]);

  const startEdit = (row) => {
    setEditingKey(row.rowKey);
    // edit the cleaned description as the "description" field (saves into original item)
    setDraft({
      ...row,
      description: row.descriptionClean,
    });
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
        // Save what user edited as the item description (stored)
        description: normSpaces(draft.description),
        hsCode: normSpaces(draft.hsCode),
        dgStatus: normSpaces(draft.dgStatus),
        unNumber: normSpaces(draft.unNumber),
        classNumber: normSpaces(draft.classNumber),
        packingGroup: normSpaces(draft.packingGroup),
        flashPoint: normSpaces(draft.flashPoint),
        properShippingName: normSpaces(draft.properShippingName),
        technicalName: normSpaces(draft.technicalName),
        ems: normSpaces(draft.ems),
        marinePollutant: normSpaces(draft.marinePollutant),
        innerType: normSpaces(draft.innerType),
        outerType: normSpaces(draft.outerType),
      },
    });

    setEditingKey(null);
    setDraft(null);
  };

  const COLS = 13;

  return (
    <div style={styles.wrap}>
      <div style={styles.head}>
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <h2 style={styles.h2}>All Pioneer Items (Unique)</h2>
            <span style={styles.pill}>Unique items: {rows.length}</span>
          </div>

          <p style={styles.p}>
            Unique items only (measurements removed). Edit any row.
          </p>
        </div>
      </div>

      <div style={styles.card}>
        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Description (Clean)</th>
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
                  <td style={styles.tdMuted} colSpan={COLS}>
                    No saved items yet.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const isEditing = editingKey === r.rowKey;

                  return (
                    <tr key={r.rowKey}>
                      <td style={styles.td} title={r.descriptionRaw || ""}>
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
                          r.descriptionClean
                        )}
                      </td>

                      <td style={styles.td}>
                        {isEditing ? (
                          <input
                            style={styles.input}
                            value={draft.hsCode}
                            onChange={(e) =>
                              setDraft({ ...draft, hsCode: e.target.value })
                            }
                          />
                        ) : (
                          r.hsCode || "—"
                        )}
                      </td>

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
                            onChange={(e) =>
                              setDraft({ ...draft, unNumber: e.target.value })
                            }
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
                              setDraft({
                                ...draft,
                                classNumber: e.target.value,
                              })
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
                              setDraft({
                                ...draft,
                                packingGroup: e.target.value,
                              })
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

        <div style={styles.note}>
          Showing <b>{rows.length}</b> unique items (measurements removed).
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

  note: { marginTop: 10, color: "#bdbdbd", fontSize: 12 },
};
