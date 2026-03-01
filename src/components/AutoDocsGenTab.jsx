import React, { useMemo, useState } from "react";
import PreadviseModal from "./PreadviseModal";

// ----------------------
// Helpers
// ----------------------
function upper(s) {
  return String(s || "")
    .trim()
    .toUpperCase();
}

function parseNumber(v) {
  if (v == null) return 0;
  const s = String(v).replace(/,/g, "").trim();
  const m = s.match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : 0;
}

function isDG(row) {
  const v = upper(row?.dgStatus);
  return v === "DG" || v === "YES" || v === "Y" || v === "TRUE";
}

function computeCargoWeightKgs(rows) {
  // Your table shows r.grossWeight, so prioritize that first.
  // If it’s empty, it tries other common keys too.
  return (rows || []).reduce((sum, r) => {
    const val =
      r?.grossWeight ??
      r?.grossWeightKgs ??
      r?.grossweight ??
      r?.gross_wt ??
      r?.grossWt ??
      r?.gw ??
      r?.gross;
    return sum + parseNumber(val);
  }, 0);
}

function computeUnClassList(rows, { dgOnly = false } = {}) {
  const list = dgOnly ? (rows || []).filter(isDG) : rows || [];
  const set = new Set();

  for (const r of list) {
    const un = upper(r?.unNumber || r?.unNo || r?.unno || "");
    const cls = upper(
      r?.classNumber || r?.imoClass || r?.imcoClass || r?.class || "",
    );
    if (un || cls) set.add(`${un || "UN?"}/${cls || "CLASS?"}`);
  }

  return Array.from(set).join(", ");
}

export default function AutoDocsGenTab({ store, actions }) {
  const [selectedKey, setSelectedKey] = useState(null);
  const [docMenuOpen, setDocMenuOpen] = useState(false);
  const [working, setWorking] = useState(null);

  const [preadviseOpen, setPreadviseOpen] = useState(false);
  const [preadviseGroup, setPreadviseGroup] = useState(null);

  // ----------------------
  // Build groups (PRO+SOI+DEST)
  // ----------------------
  const groups = useMemo(() => {
    const map = new Map();
    const saved = store?.savedItems || [];

    for (const rec of saved) {
      const recPro = (rec?.proNumber ?? "").toString().trim();
      const recSoi = (rec?.soiNumber ?? "").toString().trim();
      const recDest = (rec?.destination ?? "").toString().trim();

      const items = rec?.extractedItems || [];
      for (const it of items) {
        const pro = (recPro || (it?.proNumber ?? "")).toString().trim() || "—";
        const soi = (recSoi || (it?.soiNumber ?? "")).toString().trim() || "—";
        const dest =
          (recDest || (it?.destination ?? "")).toString().trim() || "—";

        const key = `${pro}||${soi}||${dest}`;
        if (!map.has(key)) {
          map.set(key, {
            key,
            proNumber: pro,
            soiNumber: soi,
            destination: dest,
            rows: [],
          });
        }

        map.get(key).rows.push({
          ...it,
          fileName: it?.fileName ?? rec?.fileName ?? "",
          proNumber: pro,
          soiNumber: soi,
          destination: dest,
        });
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

  const run = async (label, fn, payload) => {
    if (typeof fn !== "function") {
      alert(`Action missing: ${label}\nAdd it in App.jsx actions.`);
      return;
    }
    try {
      setWorking(label);
      await fn(payload);
    } catch (e) {
      alert(e?.message || String(e));
    } finally {
      setWorking(null);
    }
  };

  function openPreadviseForGroup(g) {
    const rows = g?.rows || [];
    const cargoWeightKgs = computeCargoWeightKgs(rows);

    // For UN/Class, you likely want DG items only. If you want ALL items, set dgOnly:false
    <li>
      UN &amp; Class: <b>{unClassList || "—"}</b>
    </li>;
    // Debug once:
    console.log("Pre-advise group:", g?.key);
    console.log("Sample row keys:", rows[0] ? Object.keys(rows[0]) : []);
    console.log("Computed cargoWeightKgs:", cargoWeightKgs);
    console.log("Computed UN/Class:", unnoImoClass);

    setPreadviseGroup({
      ...g,
      cargoWeightKgs,
      unnoImoClass,
    });
    setPreadviseOpen(true);
  }

  function dgItemsOf(rows) {
    return (rows || []).filter(isDG);
  }

  // ----------------------------
  // VIEW A: Overview blocks
  // ----------------------------
  if (!selectedGroup) {
    return (
      <div style={styles.wrap}>
        <div style={styles.head}>
          <div>
            <h3 style={styles.h3}>Automatic Docs Generation</h3>
            <p style={styles.p}>
              Click a block to view items. Or generate Pre-advise directly from
              a block.
            </p>
          </div>
          <div style={styles.counter}>
            Groups: <b>{groups.length}</b>
          </div>
        </div>

        <div style={styles.list}>
          {groups.length === 0 ? (
            <div style={styles.empty}>
              No saved items yet. Extract a PDF then click <b>Proceed (Save)</b>
              .
            </div>
          ) : (
            groups.map((g) => {
              const dgCount = dgItemsOf(g.rows).length;

              return (
                <div key={g.key} style={styles.row}>
                  {/* Clickable block */}
                  <button
                    style={styles.blockBtn}
                    onClick={() => setSelectedKey(g.key)}
                    title="Open items"
                  >
                    <div style={styles.line}>
                      <span style={styles.label}>pro number:</span>{" "}
                      <b>{g.proNumber}</b>
                      <span style={{ marginLeft: 14 }} />
                      <span style={styles.label}>soi number:</span>{" "}
                      <b>{g.soiNumber}</b>
                    </div>

                    <div style={styles.meta}>
                      <span style={styles.label}>destination:</span>{" "}
                      <b>{g.destination}</b>
                      <span style={{ marginLeft: 14 }} />
                      <span style={styles.label}>items:</span>{" "}
                      <b>{g.rows.length}</b>
                      <span style={{ marginLeft: 14 }} />
                      <span style={styles.label}>DG items:</span>{" "}
                      <b>{dgCount}</b>
                    </div>
                  </button>

                  <button
                    style={styles.primaryBtn}
                    onClick={(e) => {
                      e.stopPropagation(); // IMPORTANT (prevents parent click cancelling)
                      setDocMenuOpen(false); // if inside a menu, close it
                      setPreadviseGroup(g); // or selectedGroup, but MUST be a real group object
                      setPreadviseOpen(true);

                      console.log("PREADVISE CLICKED");
                      console.log(
                        "Group rows:",
                        (g?.rows || selectedGroup?.rows || []).length,
                      );
                    }}
                  >
                    Generate Pre-advise
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Modal */}
        <PreadviseModal
          open={preadviseOpen}
          group={preadviseGroup}
          onClose={() => setPreadviseOpen(false)}
          onSubmit={(payload) => {
            run(
              `preadvise:${payload.proNumber}:${payload.soiNumber}`,
              actions?.generatePreadvise,
              payload,
            );
            setPreadviseOpen(false);
          }}
        />
      </div>
    );
  }

  // ----------------------------
  // VIEW B: Selected block details + doc chooser
  // ----------------------------
  const dgItems = dgItemsOf(selectedGroup.rows);

  return (
    <div style={styles.wrap}>
      <div style={styles.head}>
        <div>
          <h3 style={styles.h3}>Automatic Docs Generation</h3>
          <div style={styles.title2}>
            pro: <b>{selectedGroup.proNumber}</b> &nbsp;|&nbsp; soi:{" "}
            <b>{selectedGroup.soiNumber}</b> &nbsp;|&nbsp; destination:{" "}
            <b>{selectedGroup.destination}</b> &nbsp;|&nbsp; items:{" "}
            <b>{selectedGroup.rows.length}</b> &nbsp;|&nbsp; DG items:{" "}
            <b>{dgItems.length}</b>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            style={styles.ghostBtn}
            onClick={() => {
              // ✅ Back should ONLY go back
              setDocMenuOpen(false);
              setSelectedKey(null);
            }}
          >
            ← Back
          </button>

          <div style={{ position: "relative" }}>
            <button
              style={styles.primaryBtn}
              onClick={() => setDocMenuOpen((v) => !v)}
              disabled={!!working}
            >
              Generate Document
            </button>
            console.log("Opening preadvise for", selectedGroup?.key);
            {docMenuOpen && (
              <div style={styles.menu}>
                <button
                  style={styles.menuItem}
                  disabled={working === `dg:${selectedGroup.key}`}
                  onClick={() => {
                    setDocMenuOpen(false);

                    if (dgItems.length === 0) {
                      alert("No DG items found in this PRO/SOI group.");
                      return;
                    }

                    console.log(
                      "DG count:",
                      dgItems.length,
                      dgItems.map((x) => x.unNumber),
                    );

                    run(`dg:${selectedGroup.key}`, actions?.generateDGDec, {
                      proNumber: selectedGroup.proNumber,
                      soiNumber: selectedGroup.soiNumber,
                      destination: selectedGroup.destination,
                      items: dgItems, // ✅ DG only
                    });
                  }}
                >
                  {working === `dg:${selectedGroup.key}`
                    ? "Generating..."
                    : "Generate DG Dec"}
                </button>

                <button
                  style={styles.menuItem}
                  onClick={() => {
                    setDocMenuOpen(false);
                    openPreadviseForGroup(selectedGroup); // ✅ compute + open
                  }}
                >
                  Generate Pre-advise
                </button>
              </div>
            )}
          </div>
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
                <th style={styles.th}>DG</th>
                <th style={styles.th}>UN</th>
                <th style={styles.th}>Class</th>
                <th style={styles.th}>PG</th>
                <th style={styles.th}>Flash Point</th>
              </tr>
            </thead>
            <tbody>
              {selectedGroup.rows.map((r, idx) => (
                <tr key={idx}>
                  <td style={styles.td}>{r.description || "—"}</td>
                  <td style={styles.td}>{r.qty ?? "—"}</td>
                  <td style={styles.td}>{r.noOfBoxes ?? "—"}</td>
                  <td style={styles.td}>{r.netWeight ?? "—"}</td>
                  <td style={styles.td}>{r.grossWeight ?? "—"}</td>
                  <td style={styles.td}>{r.fileName || "—"}</td>
                  <td style={styles.td}>{r.dgStatus || "—"}</td>
                  <td style={styles.td}>{r.unNumber || "—"}</td>
                  <td style={styles.td}>{r.classNumber || "—"}</td>
                  <td style={styles.td}>{r.packingGroup || "—"}</td>
                  <td style={styles.td}>{r.flashPoint || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={styles.note}>
          Tip: You can edit DG fields in <b>All Pioneer Items</b> first, then
          generate documents here.
        </div>
      </div>

      {/* Modal */}
      <PreadviseModal
        open={preadviseOpen}
        group={preadviseGroup}
        onClose={() => setPreadviseOpen(false)}
        onSubmit={(payload) => {
          run(
            `preadvise:${payload.proNumber}:${payload.soiNumber}`,
            actions?.generatePreadvise,
            payload,
          );
          setPreadviseOpen(false);
        }}
      />
    </div>
  );
}

const styles = {
  wrap: { display: "flex", flexDirection: "column", gap: 14 },

  head: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  h3: { margin: "0 0 6px 0", fontSize: 20 },
  p: { margin: "0 0 0 0", color: "#bdbdbd" },

  counter: {
    color: "#bdbdbd",
    fontSize: 12,
    border: "1px solid #2b2b2b",
    borderRadius: 999,
    padding: "8px 12px",
    background: "#101010",
  },

  list: { display: "flex", flexDirection: "column", gap: 12 },

  row: { display: "flex", gap: 12, alignItems: "stretch", flexWrap: "wrap" },

  blockBtn: {
    flex: 1,
    minWidth: 320,
    textAlign: "left",
    border: "1px solid #2b2b2b",
    background: "#0f0f0f",
    color: "#fff",
    borderRadius: 12,
    padding: "14px 16px",
    cursor: "pointer",
  },

  line: { fontSize: 14 },
  meta: { marginTop: 8, fontSize: 12, color: "#eaeaea" },
  label: { color: "#cfcfcf" },

  empty: {
    padding: 18,
    borderRadius: 12,
    border: "1px dashed #2b2b2b",
    color: "#bdbdbd",
  },

  title2: { marginTop: 6, color: "#eaeaea", fontSize: 13 },

  card: {
    padding: 14,
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
    whiteSpace: "nowrap",
    fontSize: 12,
  },

  note: { marginTop: 10, color: "#bdbdbd", fontSize: 12 },

  primaryBtn: {
    minWidth: 220,
    padding: "11px 12px",
    borderRadius: 12,
    border: "1px solid #fff",
    background: "#fff",
    color: "#000",
    fontWeight: 900,
    cursor: "pointer",
  },

  ghostBtn: {
    padding: "11px 12px",
    borderRadius: 12,
    border: "1px solid #2b2b2b",
    background: "transparent",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
  },

  menu: {
    position: "absolute",
    right: 0,
    top: "calc(100% + 8px)",
    border: "1px solid #2b2b2b",
    background: "#0f0f0f",
    borderRadius: 12,
    padding: 8,
    minWidth: 220,
    zIndex: 10,
    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
  },

  menuItem: {
    width: "100%",
    textAlign: "left",
    padding: "10px 10px",
    borderRadius: 10,
    border: "1px solid #2b2b2b",
    background: "transparent",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 800,
  },
};
