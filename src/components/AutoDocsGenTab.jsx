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

function MessageModal({ message, onClose }) {
  if (!message) return null;
  return (
    <div style={styles.msgBackdrop} onMouseDown={onClose}>
      <div style={styles.msgModal} onMouseDown={(e) => e.stopPropagation()}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Notice</div>
        <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.4 }}>{message}</div>
        <div
          style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}
        >
          <button style={styles.msgBtn} onClick={onClose} type="button">
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AutoDocsGenTab({ store, actions }) {
  const [selectedKey, setSelectedKey] = useState(null);
  const [docMenuOpen, setDocMenuOpen] = useState(false);
  const [working, setWorking] = useState(null);

  const [preadviseOpen, setPreadviseOpen] = useState(false);
  const [preadviseGroup, setPreadviseGroup] = useState(null);

  // ✅ replace alert()
  const [uiMsg, setUiMsg] = useState(null);

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
      setUiMsg(`Action missing: ${label}\nAdd it in App.jsx actions.`);
      return;
    }
    try {
      setWorking(label);
      await fn(payload);
    } catch (e) {
      setUiMsg(e?.message || String(e));
    } finally {
      setWorking(null);
    }
  };

  function openPreadviseForGroup(g) {
    const rows = g?.rows || [];
    const cargoWeightKgs = computeCargoWeightKgs(rows);
    const unnoImoClass = computeUnClassList(rows, { dgOnly: true });

    setPreadviseGroup({ ...g, cargoWeightKgs, unnoImoClass });
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
        <MessageModal message={uiMsg} onClose={() => setUiMsg(null)} />

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
                </div>
              );
            })
          )}
        </div>

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
      <MessageModal message={uiMsg} onClose={() => setUiMsg(null)} />

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
              setDocMenuOpen(false);
              setSelectedKey(null);
            }}
            type="button"
          >
            ← Back
          </button>

          <div style={{ position: "relative" }}>
            <button
              style={styles.primaryBtn}
              onClick={() => setDocMenuOpen((v) => !v)}
              disabled={!!working}
              type="button"
            >
              Generate Document
            </button>

            {docMenuOpen && (
              <div style={styles.menu}>
                <button
                  style={styles.menuItem}
                  disabled={working === `dg:${selectedGroup.key}`}
                  type="button"
                  onClick={() => {
                    setDocMenuOpen(false);

                    // ✅ no alert -> no focus bug
                    if (dgItems.length === 0) {
                      setUiMsg("No DG items found in this PRO/SOI group.");
                      return;
                    }

                    run(`dg:${selectedGroup.key}`, actions?.generateDGDec, {
                      proNumber: selectedGroup.proNumber,
                      soiNumber: selectedGroup.soiNumber,
                      destination: selectedGroup.destination,
                      items: dgItems,
                    });
                  }}
                >
                  {working === `dg:${selectedGroup.key}`
                    ? "Generating..."
                    : "Generate DG Dec"}
                </button>

                <button
                  style={styles.menuItem}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDocMenuOpen(false);
                    openPreadviseForGroup(selectedGroup);
                  }}
                >
                  Generate Pre-advise
                </button>

                <button
                  style={styles.menuItem}
                  type="button"
                  onClick={async () => {
                    setDocMenuOpen(false);

                    const rows = selectedGroup.rows || [];
                    const dg = rows.filter((r) =>
                      ["DG", "YES", "Y", "TRUE"].includes(
                        String(r.dgStatus || "")
                          .trim()
                          .toUpperCase(),
                      ),
                    );
                    const ndg = rows.filter(
                      (r) =>
                        !["DG", "YES", "Y", "TRUE"].includes(
                          String(r.dgStatus || "")
                            .trim()
                            .toUpperCase(),
                        ),
                    );

                    const pickName = (r) =>
                      (
                        r.properShippingName ||
                        r.description ||
                        r.productName ||
                        "—"
                      )
                        .toString()
                        .trim();

                    const totalGW = rows.reduce((sum, r) => {
                      const v = String(r.grossWeight ?? "")
                        .replace(/,/g, "")
                        .trim();
                      const n = parseFloat(v) || 0;
                      return sum + n;
                    }, 0);

                    const payload = {
                      proNumber: selectedGroup.proNumber,
                      soiNumber: selectedGroup.soiNumber,
                      destination: selectedGroup.destination,
                      items: rows,
                      dgItems: dg.map(pickName),
                      ndgItems: ndg.map(pickName),
                      totalGrossWeightKgs: totalGW,
                    };

                    const res = await window.pioneer.generateLOI(payload);
                    if (!res?.ok) {
                      setUiMsg(res?.error || "LOI failed.");
                      return;
                    }
                    setUiMsg(`LOI saved to:\n${res.outPath}`);
                  }}
                >
                  Generate LOI
                </button>

                <button
                  style={styles.menuItem}
                  type="button"
                  onClick={async () => {
                    setDocMenuOpen(false);

                    const rows = selectedGroup.rows || [];

                    // ✅ Non-DG based on your edited DG status (All Pioneer Items)
                    // If your current LOI already uses the All Pioneer Items map, reuse that same logic here.
                    const ndgItems = rows
                      .filter(
                        (r) =>
                          !["DG", "YES", "Y", "TRUE"].includes(
                            String(r.dgStatus || "")
                              .trim()
                              .toUpperCase(),
                          ),
                      )
                      .map((r) =>
                        (
                          r.properShippingName ||
                          r.description ||
                          r.productName ||
                          "—"
                        )
                          .toString()
                          .trim(),
                      );

                    const payload = {
                      proNumber: selectedGroup.proNumber,
                      soiNumber: selectedGroup.soiNumber,
                      destination: selectedGroup.destination,
                      items: rows,
                      ndgItems,
                    };

                    const res = await window.pioneer.generateNonDGCert(payload);
                    if (!res?.ok) {
                      setUiMsg(res?.error || "Non-DG Certification failed.");
                      return;
                    }
                    setUiMsg(`Non-DG Certification saved to:\n${res.outPath}`);
                  }}
                >
                  Generate Non-DG Cert
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
  wrap: { display: "flex", flexDirection: "column", gap: 14, color: "#fff" },

  head: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },

  h3: { margin: "0 0 6px 0", fontSize: 22, fontWeight: 900 },
  p: { margin: 0, color: "#bdbdbd", fontSize: 13 },

  counter: {
    color: "#d8d8d8",
    fontSize: 12,
    border: "1px solid #2b2b2b",
    borderRadius: 999,
    padding: "8px 12px",
    background: "rgba(0,0,0,0.35)",
  },

  list: { display: "flex", flexDirection: "column", gap: 12 },

  empty: {
    padding: 18,
    borderRadius: 14,
    border: "1px dashed #2b2b2b",
    color: "#bdbdbd",
    background: "rgba(0,0,0,0.25)",
  },

  row: { display: "flex" },

  blockBtn: {
    width: "100%",
    textAlign: "left",
    border: "1px solid #2b2b2b",
    background: "rgba(0,0,0,0.35)",
    color: "#fff",
    borderRadius: 16,
    padding: "16px 18px",
    cursor: "pointer",
    transition: "transform 0.05s ease",
  },

  line: { fontSize: 14, color: "#ededed" },
  meta: { marginTop: 8, fontSize: 12, color: "#cfcfcf" },
  label: { color: "#9f9f9f" },

  title2: { marginTop: 6, color: "#eaeaea", fontSize: 13 },

  ghostBtn: {
    padding: "11px 14px",
    borderRadius: 12,
    border: "1px solid #2b2b2b",
    background: "rgba(0,0,0,0.25)",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  },

  primaryBtn: {
    minWidth: 220,
    padding: "11px 14px",
    borderRadius: 14,
    border: "1px solid #fff",
    background: "#fff",
    color: "#000",
    fontWeight: 900,
    cursor: "pointer",
  },

  menu: {
    position: "absolute",
    right: 0,
    top: "calc(100% + 8px)",
    background: "#0f0f0f",
    border: "1px solid #2b2b2b",
    borderRadius: 14,
    padding: 10,
    minWidth: 260,
    zIndex: 999,
    boxShadow: "0 12px 34px rgba(0,0,0,0.55)",
  },

  menuItem: {
    width: "100%",
    textAlign: "left",
    padding: "12px 12px",
    borderRadius: 12,
    border: "1px solid #2b2b2b",
    background: "transparent",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 900,
  },

  card: {
    padding: 14,
    border: "1px solid #2b2b2b",
    borderRadius: 16,
    background: "rgba(0,0,0,0.35)",
    overflow: "hidden",
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
  },

  note: { marginTop: 12, color: "#bdbdbd", fontSize: 12 },

  // ✅ non-blocking replacement for alert()
  msgBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10000,
  },
  msgModal: {
    width: 520,
    maxWidth: "92vw",
    background: "#111",
    border: "1px solid #2b2b2b",
    borderRadius: 14,
    padding: 16,
    boxShadow: "0 10px 30px rgba(0,0,0,0.55)",
  },
  msgBtn: {
    border: "1px solid #2b2b2b",
    background: "#1a1a1a",
    color: "#fff",
    borderRadius: 10,
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 800,
  },
};
