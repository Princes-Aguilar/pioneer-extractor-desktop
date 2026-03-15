import React, { useState } from "react";

export default function ExtractTab({ store, actions }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [dest, setDest] = useState("");
  const [pro, setPro] = useState("");
  const [soi, setSoi] = useState("");

  const choosePdf = async () => {
    try {
      setMsg("");
      const filePath = await window.pioneer.openPdfDialog();
      if (!filePath) return;

      actions.setSelectedFile({
        name: filePath.split(/[/\\]/).pop(),
        path: filePath,
        kind: "pdf",
      });
    } catch (e) {
      setMsg(e?.message || String(e));
    }
  };

  // const chooseXlsx = async () => {
  //   try {
  //     setMsg("");
  //     const filePath = await window.pioneer.openXlsxDialog();
  //     if (!filePath) return;

  //     actions.setSelectedFile({
  //       name: filePath.split(/[/\\]/).pop(),
  //       path: filePath,
  //       kind: "xlsx",
  //     });
  //   } catch (e) {
  //     setMsg(e?.message || String(e));
  //   }
  // };

  const submitAndExtract = async () => {
    try {
      setMsg("");

      if (!store?.selectedFile?.path) {
        setMsg("Please choose a PDF or XLSX file first.");
        return;
      }

      if (
        !String(dest || "").trim() ||
        !String(pro || "").trim() ||
        !String(soi || "").trim()
      ) {
        setMsg(
          "Destination, PRO Number, and SOI Number are required before extracting.",
        );
        return;
      }

      setBusy(true);

      let res;
      if (store.selectedFile.kind === "xlsx") {
        res = await window.pioneer.extractXlsx(store.selectedFile.path);
      } else {
        res = await window.pioneer.extractPdf(store.selectedFile.path);
      }

      if (!res?.ok) {
        setMsg(res?.error || "Extraction failed.");
        return;
      }

      actions.setExtractedPreview({
        fileName: res.fileName,
        numberOfItemsExtracted: res.numberOfItemsExtracted,
        items: res.items || [],
        debug: res.debug,
        destination: String(dest).trim(),
        proNumber: String(pro).trim(),
        soiNumber: String(soi).trim(),
        totals: res.totals || null,
      });
    } catch (e) {
      setMsg(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={styles.wrap}>
      <div>
        <h2 style={styles.h2}>Extract Packing List</h2>
        <div style={styles.sub}>
          Choose a packing list PDF or XLSX, extract rows, review them, then
          save.
        </div>
      </div>

      <div style={styles.row}>
        <button style={styles.btn} onClick={choosePdf} type="button">
          Choose PDF
        </button>
        {/* <button style={styles.btn} onClick={chooseXlsx} type="button">
          Choose XLSX
        </button> */}
        <button
          style={{
            ...styles.btn,
            ...styles.primaryBtn,
            ...(busy ? styles.btnBusy : {}),
          }}
          onClick={submitAndExtract}
          disabled={busy}
          type="button"
        >
          {busy ? "Extracting..." : "Extract"}
        </button>
      </div>

      <div style={styles.metaCard}>
        <div>
          <b>Selected file:</b>{" "}
          {store?.selectedFile?.path || "No file selected"}
        </div>
      </div>

      <div style={styles.formGrid}>
        <label style={styles.field}>
          <div style={styles.label}>Destination</div>
          <input
            style={{
              ...styles.input,
              ...(msg && !String(dest || "").trim() ? styles.inputError : {}),
            }}
            value={dest}
            onChange={(e) => {
              setDest(e.target.value);
              if (msg) setMsg("");
            }}
            placeholder="Enter destination"
          />
        </label>

        <label style={styles.field}>
          <div style={styles.label}>PRO Number</div>
          <input
            style={{
              ...styles.input,
              ...(msg && !String(pro || "").trim() ? styles.inputError : {}),
            }}
            value={pro}
            onChange={(e) => {
              setPro(e.target.value);
              if (msg) setMsg("");
            }}
            placeholder="Enter PRO number"
          />
        </label>

        <label style={styles.field}>
          <div style={styles.label}>SOI Number</div>
          <input
            style={{
              ...styles.input,
              ...(msg && !String(soi || "").trim() ? styles.inputError : {}),
            }}
            value={soi}
            onChange={(e) => {
              setSoi(e.target.value);
              if (msg) setMsg("");
            }}
            placeholder="Enter SOI number"
          />
        </label>
      </div>

      {msg ? <div style={styles.error}>{msg}</div> : null}

      <div style={styles.hint}>
        Expected format for your latest PDF:{" "}
        <b>Description | Qty | Unit | Net Weight | Gross Weight | Boxes</b>
      </div>

      {store?.extractedPreview?.totals ? (
        <div style={styles.totalsCard}>
          <div style={styles.totalsTitle}>Extracted Totals</div>

          <div style={styles.totalsGrid}>
            <div style={styles.totalBox}>
              <div style={styles.totalLabel}>Total Qty</div>
              <div style={styles.totalValue}>
                {store.extractedPreview.totals.qty ?? 0}
              </div>
            </div>

            <div style={styles.totalBox}>
              <div style={styles.totalLabel}>Total Boxes</div>
              <div style={styles.totalValue}>
                {store.extractedPreview.totals.boxes ?? 0}
              </div>
            </div>

            <div style={styles.totalBox}>
              <div style={styles.totalLabel}>Total Net Weight</div>
              <div style={styles.totalValue}>
                {store.extractedPreview.totals.netWeight ?? 0}
              </div>
            </div>

            <div style={styles.totalBox}>
              <div style={styles.totalLabel}>Total Gross Weight</div>
              <div style={styles.totalValue}>
                {store.extractedPreview.totals.grossWeight ?? 0}
              </div>
            </div>
          </div>

          {store.extractedPreview.totals.fromFile ? (
            <div style={styles.fileTotalsNote}>
              <b>Totals detected from PDF file:</b> Qty:{" "}
              {store.extractedPreview.totals.fromFile.totalQty ?? "—"} | Net:{" "}
              {store.extractedPreview.totals.fromFile.totalNetWeight ?? "—"} |
              Gross:{" "}
              {store.extractedPreview.totals.fromFile.totalGrossWeight ?? "—"} |
              Boxes: {store.extractedPreview.totals.fromFile.totalBoxes ?? "—"}
            </div>
          ) : null}
        </div>
      ) : null}

      {store?.extractedPreview ? (
        <div style={styles.reviewCard}>
          <div style={styles.reviewTop}>
            <div>
              <div style={styles.reviewTitle}>Extracted Preview</div>
              <div style={styles.reviewSub}>
                File: <b>{store.extractedPreview.fileName}</b>
              </div>
              <div style={styles.reviewMeta}>
                Items extracted:{" "}
                <b>{store.extractedPreview.numberOfItemsExtracted ?? 0}</b>
                {" | "}
                Destination: <b>{store.extractedPreview.destination || "—"}</b>
                {" | "}
                PRO: <b>{store.extractedPreview.proNumber || "—"}</b>
                {" | "}
                SOI: <b>{store.extractedPreview.soiNumber || "—"}</b>
              </div>
            </div>

            <button
              style={styles.primaryBtn}
              onClick={actions.proceedSaveExtracted}
              type="button"
            >
              Proceed (Save)
            </button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Description</th>
                  <th style={styles.th}>Qty</th>
                  <th style={styles.th}>Unit</th>
                  <th style={styles.th}>Boxes</th>
                  <th style={styles.th}>Net Weight</th>
                  <th style={styles.th}>Gross Weight</th>
                  <th style={styles.th}>File Name</th>
                </tr>
              </thead>
              <tbody>
                {(store.extractedPreview.items || []).length === 0 ? (
                  <tr>
                    <td style={styles.tdMuted} colSpan={7}>
                      No extracted rows found.
                    </td>
                  </tr>
                ) : (
                  (store.extractedPreview.items || []).map((it, idx) => (
                    <tr key={idx}>
                      <td style={styles.td}>{it.description || "—"}</td>
                      <td style={styles.td}>{it.qty ?? "—"}</td>
                      <td style={styles.td}>{it.unit ?? "—"}</td>
                      <td style={styles.td}>{it.noOfBoxes ?? "—"}</td>
                      <td style={styles.td}>{it.netWeight ?? "—"}</td>
                      <td style={styles.td}>{it.grossWeight ?? "—"}</td>
                      <td style={styles.td}>
                        {it.fileName || store.extractedPreview.fileName || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {store.extractedPreview.debug ? (
            <div style={styles.debug}>
              <b>Debug:</b> {JSON.stringify(store.extractedPreview.debug)}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

const styles = {
  wrap: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    color: "#fff",
  },
  h2: {
    margin: 0,
    fontSize: 26,
    fontWeight: 900,
  },
  sub: {
    marginTop: 6,
    color: "#bdbdbd",
    fontSize: 13,
  },
  row: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  btn: {
    padding: "11px 16px",
    borderRadius: 12,
    border: "1px solid #2b2b2b",
    background: "#111",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  },
  primaryBtn: {
    padding: "11px 16px",
    borderRadius: 12,
    border: "1px solid #fff",
    background: "#fff",
    color: "#000",
    fontWeight: 900,
    cursor: "pointer",
  },
  btnBusy: {
    opacity: 0.7,
    cursor: "not-allowed",
  },
  metaCard: {
    border: "1px solid #2b2b2b",
    background: "rgba(0,0,0,0.25)",
    borderRadius: 12,
    padding: 12,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(180px, 1fr))",
    gap: 12,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    fontSize: 12,
    color: "#bdbdbd",
  },
  input: {
    background: "#0c0c0c",
    border: "1px solid #2b2b2b",
    borderRadius: 10,
    padding: "10px 12px",
    color: "#fff",
    outline: "none",
  },
  inputError: {
    border: "1px solid #b94a48",
    boxShadow: "0 0 0 1px rgba(185,74,72,0.2)",
  },
  error: {
    border: "1px solid #5b2b2b",
    background: "#2a1111",
    color: "#ffd0d0",
    borderRadius: 12,
    padding: 12,
    whiteSpace: "pre-wrap",
  },
  hint: {
    color: "#bdbdbd",
    fontSize: 12,
  },
  totalsCard: {
    marginTop: 4,
    border: "1px solid #2b2b2b",
    borderRadius: 14,
    padding: 14,
    background: "#101010",
  },
  totalsTitle: {
    fontSize: 14,
    fontWeight: 900,
    marginBottom: 12,
  },
  totalsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(140px, 1fr))",
    gap: 12,
  },
  totalBox: {
    border: "1px solid #242424",
    borderRadius: 12,
    padding: 12,
    background: "#0b0b0b",
  },
  totalLabel: {
    fontSize: 12,
    color: "#bdbdbd",
    marginBottom: 6,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 900,
    color: "#fff",
  },
  fileTotalsNote: {
    marginTop: 12,
    fontSize: 12,
    color: "#cfcfcf",
  },
  reviewCard: {
    border: "1px solid #2b2b2b",
    borderRadius: 14,
    padding: 14,
    background: "#101010",
  },
  reviewTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: 900,
  },
  reviewSub: {
    marginTop: 4,
    color: "#d8d8d8",
    fontSize: 13,
  },
  reviewMeta: {
    marginTop: 6,
    color: "#bdbdbd",
    fontSize: 12,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 12,
  },
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
  tdMuted: {
    padding: "12px 8px",
    color: "#bdbdbd",
  },
  debug: {
    marginTop: 12,
    fontSize: 12,
    color: "#cfcfcf",
    whiteSpace: "pre-wrap",
  },
};
