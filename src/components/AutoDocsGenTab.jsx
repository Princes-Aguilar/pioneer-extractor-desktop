import React, { useMemo, useState } from "react";

export default function AutoDocsGenTab({ store, actions }) {
  const [workingKey, setWorkingKey] = useState(null);

  // Build groups like PER SO / PER PRO (PRO + SOI + Destination)
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

  const hasGenerator =
    typeof actions?.generateDGDec === "function" ||
    typeof actions?.generatePreadvise === "function";

  const handleGenerate = async (type, g) => {
    // If you haven't wired real generation yet, we still show a friendly message.
    const fn =
      type === "dg" ? actions?.generateDGDec : actions?.generatePreadvise;

    if (typeof fn !== "function") {
      alert(
        `No generator yet.\n\nNext step: add actions.${
          type === "dg" ? "generateDGDec" : "generatePreadvise"
        } in App.jsx to create the document.`,
      );
      return;
    }

    try {
      setWorkingKey(`${g.key}::${type}`);
      await fn({
        proNumber: g.proNumber,
        soiNumber: g.soiNumber,
        destination: g.destination,
        items: g.rows,
      });
    } catch (e) {
      alert(e?.message || String(e));
    } finally {
      setWorkingKey(null);
    }
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.head}>
        <div>
          <h3 style={styles.h3}>Automatic Docs Generation</h3>
          <p style={styles.p}>
            Select a PRO/SOI block and generate documents from extracted items.
          </p>
        </div>

        <div style={styles.counter}>
          Groups: <b>{groups.length}</b>
        </div>
      </div>

      {!hasGenerator ? (
        <div style={styles.notice}>
          Buttons work, but document generation is not wired yet.
          <br />
          Next: add <b>actions.generateDGDec</b> and{" "}
          <b>actions.generatePreadvise</b> in <b>App.jsx</b>.
        </div>
      ) : null}

      <div style={styles.list}>
        {groups.length === 0 ? (
          <div style={styles.empty}>
            No saved items yet. Extract a PDF and click <b>Proceed (Save)</b>.
          </div>
        ) : (
          groups.map((g) => (
            <div key={g.key} style={styles.row}>
              <div style={styles.block}>
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
                </div>
              </div>

              <div style={styles.btnCol}>
                <button
                  style={styles.primaryBtn}
                  onClick={() => handleGenerate("dg", g)}
                  disabled={workingKey === `${g.key}::dg`}
                >
                  {workingKey === `${g.key}::dg`
                    ? "Generating..."
                    : "Generate DG Dec"}
                </button>

                <button
                  style={styles.ghostBtn}
                  onClick={() => handleGenerate("preadvise", g)}
                  disabled={workingKey === `${g.key}::preadvise`}
                >
                  {workingKey === `${g.key}::preadvise`
                    ? "Generating..."
                    : "Generate Preadvise"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
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

  notice: {
    padding: 14,
    borderRadius: 12,
    border: "1px dashed #2b2b2b",
    background: "#0f0f0f",
    color: "#bdbdbd",
    lineHeight: 1.4,
  },

  list: { display: "flex", flexDirection: "column", gap: 12 },

  empty: {
    padding: 18,
    borderRadius: 12,
    border: "1px dashed #2b2b2b",
    color: "#bdbdbd",
  },

  row: {
    display: "flex",
    gap: 12,
    alignItems: "stretch",
    flexWrap: "wrap",
  },

  block: {
    flex: 1,
    minWidth: 320,
    padding: "14px 16px",
    borderRadius: 12,
    border: "1px solid #2b2b2b",
    background: "#0f0f0f",
  },

  line: { fontSize: 14, color: "#fff" },
  meta: { marginTop: 8, fontSize: 12, color: "#eaeaea" },
  label: { color: "#cfcfcf" },

  btnCol: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    minWidth: 220,
  },

  primaryBtn: {
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
};
