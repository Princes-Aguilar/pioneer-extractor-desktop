import React, { useMemo, useState } from "react";

export default function PerSoProItemsTab({ store, actions }) {
  const [selectedKey, setSelectedKey] = useState(null);

  const groups = useMemo(() => {
    const map = new Map();
    const saved = store?.savedItems || [];

    for (const rec of saved) {
      const recPro = (rec?.proNumber ?? "").toString().trim();
      const recSoi = (rec?.soiNumber ?? "").toString().trim();
      const recDest = (rec?.destination ?? "").toString().trim();

      const items = rec?.extractedItems || [];
      for (const it of items) {
        const pro = (recPro || (it?.proNumber ?? "")).toString().trim();
        const soi = (recSoi || (it?.soiNumber ?? "")).toString().trim();
        const destination = (recDest || (it?.destination ?? ""))
          .toString()
          .trim();

        const safePro = pro || "—";
        const safeSoi = soi || "—";
        const safeDest = destination || "—";

        // Group key includes destination (same as your current logic)
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
      alert(
        "deletePerSoProGroup action is missing. Add it in App.jsx actions first.",
      );
      return;
    }

    const ok = window.confirm(
      `Delete this group?\n\nPRO: ${g.proNumber}\nSOI: ${g.soiNumber}\nDestination: ${g.destination}\nItems: ${g.rows.length}\n\nThis cannot be undone.`,
    );
    if (!ok) return;

    actions.deletePerSoProGroup({
      proNumber: g.proNumber,
      soiNumber: g.soiNumber,
      destination: g.destination,
    });

    // if user is viewing this group, go back
    if (selectedKey === g.key) setSelectedKey(null);
  };

  // VIEW 1: Blocks
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
                {/* whole block is clickable */}
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
                  </div>
                </button>

                {/* ✅ Delete button at end */}
                <button
                  style={styles.deleteBtn}
                  onClick={(e) => {
                    e.stopPropagation(); // don’t open details
                    handleDeleteGroup(g);
                  }}
                  title="Delete this PRO/SOI group"
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

  // VIEW 2: Details table (unchanged, kept short)
  return (
    <div style={styles.wrap}>
      <div style={styles.head}>
        <div>
          <h2 style={styles.h2}>PER SO PER PRO TAB</h2>
          <div style={styles.pairTitle}>
            pro: <b>{selectedGroup.proNumber}</b> &nbsp;|&nbsp; soi:{" "}
            <b>{selectedGroup.soiNumber}</b> &nbsp;|&nbsp; destination:{" "}
            <b>{selectedGroup.destination}</b> &nbsp;|&nbsp; items:{" "}
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
                </tr>
              ))}
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

  blockRow: {
    display: "flex",
    gap: 10,
    alignItems: "stretch",
  },

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
    whiteSpace: "nowrap",
    fontSize: 12,
  },
};
