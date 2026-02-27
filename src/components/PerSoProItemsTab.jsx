import React, { useMemo, useState } from "react";

export default function PerSoProItemsTab({ store }) {
  const [selectedKey, setSelectedKey] = useState(null);

  // Group by PRO + SOI + Destination (so you can see destination beside them)
  const groups = useMemo(() => {
    const map = new Map();
    const saved = store?.savedItems || [];

    for (const rec of saved) {
      const recPro = (rec?.proNumber ?? "").toString().trim();
      const recSoi = (rec?.soiNumber ?? "").toString().trim();
      const recDest = (rec?.destination ?? "").toString().trim();

      const items = rec?.extractedItems || [];

      for (const it of items) {
        // Prefer record-level, fallback to item-level
        const pro = (recPro || (it?.proNumber ?? "")).toString().trim();
        const soi = (recSoi || (it?.soiNumber ?? "")).toString().trim();
        const destination = (recDest || (it?.destination ?? ""))
          .toString()
          .trim();

        const safePro = pro || "—";
        const safeSoi = soi || "—";
        const safeDest = destination || "—";

        // ✅ include destination in grouping key
        const key = `${safePro}||${safeSoi}||${safeDest}`;

        if (!map.has(key)) {
          map.set(key, {
            key,
            proNumber: safePro,
            soiNumber: safeSoi,
            destination: safeDest,
            rows: [],
          });
        }

        map.get(key).rows.push({
          ...it,
          fileName: it?.fileName ?? rec?.fileName ?? "",
          proNumber: safePro,
          soiNumber: safeSoi,
          destination: safeDest,
        });
      }
    }

    // Sort groups so real values appear above unknowns
    return Array.from(map.values()).sort((a, b) => {
      const aUnknown = a.proNumber === "—" && a.soiNumber === "—";
      const bUnknown = b.proNumber === "—" && b.soiNumber === "—";
      if (aUnknown !== bUnknown) return aUnknown ? 1 : -1;

      // Sort by PRO then SOI then Destination (lexical)
      return `${a.proNumber}|${a.soiNumber}|${a.destination}`.localeCompare(
        `${b.proNumber}|${b.soiNumber}|${b.destination}`,
      );
    });
  }, [store?.savedItems]);

  const selectedGroup = useMemo(() => {
    if (!selectedKey) return null;
    return groups.find((g) => g.key === selectedKey) || null;
  }, [groups, selectedKey]);

  // -------------------------
  // VIEW 1: blocks list
  // -------------------------
  if (!selectedGroup) {
    return (
      <div style={styles.wrap}>
        <div style={styles.head}>
          <div>
            <h2 style={styles.h2}>PER SO PER PRO TAB</h2>
            <div style={styles.sub}>
              Click a block to view extracted details.
            </div>
          </div>

          <div style={styles.counter}>
            Transactions: <b>{groups.length}</b>
          </div>
        </div>

        <div style={styles.blocks}>
          {groups.length === 0 ? (
            <div style={styles.empty}>
              No saved items yet. Extract a PDF and click <b>Proceed (Save)</b>.
            </div>
          ) : (
            groups.map((g) => (
              <button
                key={g.key}
                onClick={() => setSelectedKey(g.key)}
                style={styles.blockBtn}
                title="Click to view details"
              >
                <div style={styles.blockLine}>
                  <span style={styles.blockLabel}>pro number:</span>{" "}
                  <b>{g.proNumber}</b>
                  <span style={{ marginLeft: 14 }} />
                  <span style={styles.blockLabel}>soi number:</span>{" "}
                  <b>{g.soiNumber}</b>
                </div>

                {/* ✅ NEW: destination + items extracted */}
                <div style={styles.blockMeta}>
                  <span style={styles.blockLabel}>destination:</span>{" "}
                  <b>{g.destination}</b>
                  <span style={{ marginLeft: 14 }} />
                  <span style={styles.blockLabel}>items:</span>{" "}
                  <b>{g.rows.length}</b>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  // -------------------------
  // VIEW 2: details table
  // -------------------------
  return (
    <div style={styles.wrap}>
      <div style={styles.head}>
        <div>
          <h2 style={styles.h2}>PER SO PER PRO TAB</h2>

          {/* ✅ NEW: show destination + item count beside pro/soi */}
          <div style={styles.pairTitle}>
            pro number: <b>{selectedGroup.proNumber}</b> &nbsp;&nbsp; soi
            number: <b>{selectedGroup.soiNumber}</b> &nbsp;&nbsp; destination:{" "}
            <b>{selectedGroup.destination}</b> &nbsp;&nbsp; items:{" "}
            <b>{selectedGroup.rows.length}</b>
          </div>
        </div>

        <button style={styles.ghostBtn} onClick={() => setSelectedKey(null)}>
          ← Back
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
                <th style={styles.th}>PRO No.</th>
                <th style={styles.th}>SOI No.</th>
                <th style={styles.th}>Destination</th>
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
              </tr>
            </thead>

            <tbody>
              {selectedGroup.rows.length === 0 ? (
                <tr>
                  <td style={styles.tdMuted} colSpan={21}>
                    No items for this PRO/SOI/Destination.
                  </td>
                </tr>
              ) : (
                selectedGroup.rows.map((r, idx) => (
                  <tr key={idx}>
                    <td style={styles.td}>{r.description || "—"}</td>
                    <td style={styles.td}>{r.qty ?? "—"}</td>
                    <td style={styles.td}>{r.noOfBoxes ?? "—"}</td>
                    <td style={styles.td}>{r.netWeight ?? "—"}</td>
                    <td style={styles.td}>{r.grossWeight ?? "—"}</td>
                    <td style={styles.td}>{r.fileName || "—"}</td>
                    <td style={styles.td}>{r.proNumber || "—"}</td>
                    <td style={styles.td}>{r.soiNumber || "—"}</td>
                    <td style={styles.td}>{r.destination || "—"}</td>
                    <td style={styles.td}>{r.hsCode || "—"}</td>
                    <td style={styles.td}>{r.dgStatus || "—"}</td>
                    <td style={styles.td}>{r.unNumber || "—"}</td>
                    <td style={styles.td}>{r.classNumber || "—"}</td>
                    <td style={styles.td}>{r.packingGroup || "—"}</td>
                    <td style={styles.td}>{r.flashPoint || "—"}</td>
                    <td style={styles.td}>{r.properShippingName || "—"}</td>
                    <td style={styles.td}>{r.technicalName || "—"}</td>
                    <td style={styles.td}>{r.ems || "—"}</td>
                    <td style={styles.td}>{r.marinePollutant || "—"}</td>
                    <td style={styles.td}>{r.innerType || "—"}</td>
                    <td style={styles.td}>{r.outerType || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={styles.footerNote}>
          Rows: <b>{selectedGroup.rows.length}</b>
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

  h2: { margin: 0, fontSize: 16, fontWeight: 900, letterSpacing: 0.2 },
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

  blockBtn: {
    textAlign: "left",
    border: "1px solid #2b2b2b",
    background: "#0f0f0f",
    color: "#fff",
    borderRadius: 12,
    padding: "14px 16px",
    cursor: "pointer",
  },

  blockLine: { fontSize: 14 },
  blockMeta: { marginTop: 8, fontSize: 12, color: "#eaeaea" },
  blockLabel: { color: "#cfcfcf" },

  empty: {
    padding: 14,
    border: "1px solid #2b2b2b",
    borderRadius: 12,
    background: "#101010",
    color: "#bdbdbd",
  },

  pairTitle: { marginTop: 6, color: "#eaeaea", fontSize: 13 },

  ghostBtn: {
    padding: "9px 12px",
    border: "1px solid #2b2b2b",
    background: "transparent",
    color: "#fff",
    borderRadius: 10,
    cursor: "pointer",
    height: 36,
  },

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
    verticalAlign: "top",
    whiteSpace: "nowrap",
    fontSize: 12,
  },

  tdMuted: { padding: "12px 8px", color: "#bdbdbd" },

  footerNote: { marginTop: 10, color: "#bdbdbd", fontSize: 12 },
};
