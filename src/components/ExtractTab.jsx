import React, { useState } from "react";

export default function ExtractTab({ store, actions }) {
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState("");

  // ✅ NEW: required inputs
  const [proNumber, setProNumber] = useState("");
  const [soiNumber, setSoiNumber] = useState("");

  const pickWithDialog = async () => {
    try {
      setError("");
      const filePath = await window.pioneer.openPdfDialog();
      if (!filePath) return;

      actions.setSelectedFile({
        name: filePath.split(/[/\\]/).pop(),
        path: filePath,
      });
    } catch (e) {
      setError(e?.message || String(e));
    }
  };

  const submitAndExtract = async () => {
    try {
      setError("");
      setIsWorking(true);

      // ✅ NEW: validate required fields first
      const pro = proNumber.trim();
      const soi = soiNumber.trim();

      if (!pro || !soi) {
        throw new Error("PRO Number and SOI Number are required.");
      }

      const f = store.selectedFile;
      if (!f?.path)
        throw new Error("No PDF selected. Click 'Choose PDF' first.");

      if (!window.pioneer?.extractPdf) {
        throw new Error(
          "window.pioneer.extractPdf is missing. Check preload.cjs.",
        );
      }

      const res = await window.pioneer.extractPdf(f.path);
      if (!res?.ok) throw new Error(res?.error || "Extraction failed.");

      if (typeof actions.setExtractedPreview !== "function") {
        throw new Error(
          "actions.setExtractedPreview is not a function. Add it inside App.jsx actions.",
        );
      }

      // ✅ Pass PRO/SOI into preview so it’s available on Proceed (Save)
      actions.setExtractedPreview({
        fileName: res.fileName,
        numberOfItemsExtracted: res.numberOfItemsExtracted,
        items: res.items || [],
        debug: res.debug,
        proNumber: pro,
        soiNumber: soi,
      });
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setIsWorking(false);
    }
  };

  const proOk = proNumber.trim().length > 0;
  const soiOk = soiNumber.trim().length > 0;
  const fileOk = !!store.selectedFile?.path;

  const canSubmit = proOk && soiOk && fileOk && !isWorking;

  return (
    <div style={styles.wrap}>
      <div style={styles.head}>
        <div>
          <h2 style={styles.h2}>Extract</h2>
          <p style={styles.p}>
            Choose a packing list PDF, extract item rows, review, then proceed.
          </p>
        </div>

        {/* ✅ NEW: Inputs beside Choose PDF */}
        <div style={styles.headRight}>
          <input
            style={styles.input}
            type="text"
            placeholder="PRO Number (required)"
            value={proNumber}
            onChange={(e) => setProNumber(e.target.value)}
          />
          <input
            style={styles.input}
            type="text"
            placeholder="SOI Number (required)"
            value={soiNumber}
            onChange={(e) => setSoiNumber(e.target.value)}
          />
          <button style={styles.ghostBtn} onClick={pickWithDialog}>
            Choose PDF
          </button>
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.row}>
          <div style={styles.label}>Selected file</div>
          <div style={styles.value}>
            {store.selectedFile?.name ? (
              <b>{store.selectedFile.name}</b>
            ) : (
              <span style={{ color: "#bdbdbd" }}>None</span>
            )}
          </div>
        </div>

        <button
          style={{
            ...styles.primaryBtn,
            opacity: canSubmit ? 1 : 0.45,
            cursor: canSubmit ? "pointer" : "not-allowed",
          }}
          disabled={!canSubmit}
          onClick={submitAndExtract}
          title={
            !proOk || !soiOk
              ? "PRO Number and SOI Number are required"
              : !fileOk
                ? "Please choose a PDF"
                : isWorking
                  ? "Working..."
                  : "Submit"
          }
        >
          {isWorking ? "Extracting..." : "Submit (Extract)"}
        </button>

        {error ? <div style={styles.errorBox}>{error}</div> : null}

        {/* Small helper hint (optional) */}
        {!proOk || !soiOk ? (
          <div style={styles.hint}>
            * Please enter <b>PRO Number</b> and <b>SOI Number</b> before
            submitting.
          </div>
        ) : null}
      </div>

      {store.extractedPreview ? (
        <div style={styles.reviewCard}>
          <div style={styles.reviewTop}>
            <div>
              <div style={styles.reviewTitle}>Review Extracted Data</div>
              <div style={styles.reviewSub}>
                File: <b>{store.extractedPreview.fileName}</b>{" "}
                <span style={{ color: "#bdbdbd" }}>
                  (items: {store.extractedPreview.numberOfItemsExtracted ?? 0})
                </span>
              </div>

              {/* ✅ NEW: show PRO/SOI during review */}
              <div style={styles.reviewMeta}>
                PRO: <b>{store.extractedPreview.proNumber || "—"}</b> &nbsp;|&nbsp;
                SOI: <b>{store.extractedPreview.soiNumber || "—"}</b>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button style={styles.ghostBtn} onClick={actions.clearPreview}>
                Clear
              </button>
              <button
                style={styles.primaryBtn}
                onClick={actions.proceedSaveExtracted}
              >
                Proceed (Save)
              </button>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Description</th>
                  <th style={styles.th}>Qty</th>
                  <th style={styles.th}>Boxes</th>
                  <th style={styles.th}>Net Weight</th>
                  <th style={styles.th}>Gross Weight</th>
                  <th style={styles.th}>File Name</th>
                </tr>
              </thead>
              <tbody>
                {store.extractedPreview.items?.length ? (
                  store.extractedPreview.items.map((r, idx) => (
                    <tr key={idx}>
                      <td style={styles.td}>{r.description}</td>
                      <td style={styles.td}>{r.qty ?? "—"}</td>
                      <td style={styles.td}>{r.noOfBoxes ?? "—"}</td>
                      <td style={styles.td}>{r.netWeight ?? "—"}</td>
                      <td style={styles.td}>{r.grossWeight ?? "—"}</td>
                      <td style={styles.td}>
                        {r.fileName ?? store.extractedPreview.fileName}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td style={styles.tdMuted} colSpan={6}>
                      No rows extracted.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {store.extractedPreview.debug?.textLength ? (
            <div style={styles.debug}>
              Debug: extracted text length ={" "}
              {store.extractedPreview.debug.textLength}
            </div>
          ) : null}
        </div>
      ) : null}
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
    flexWrap: "wrap",
  },
  headRight: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  h2: { margin: 0, fontSize: 22 },
  p: { margin: "6px 0 0 0", color: "#bdbdbd" },

  input: {
    padding: "9px 12px",
    border: "1px solid #2b2b2b",
    background: "#0b0b0b",
    color: "#fff",
    borderRadius: 10,
    outline: "none",
    minWidth: 190,
  },

  card: {
    padding: 16,
    border: "1px solid #2b2b2b",
    borderRadius: 12,
    background: "#101010",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  row: { display: "flex", justifyContent: "space-between", gap: 12 },
  label: { color: "#bdbdbd" },
  value: { color: "#fff" },

  ghostBtn: {
    padding: "9px 12px",
    border: "1px solid #2b2b2b",
    background: "transparent",
    color: "#fff",
    borderRadius: 10,
    cursor: "pointer",
  },
  primaryBtn: {
    padding: "10px 14px",
    border: "1px solid #fff",
    background: "#fff",
    color: "#000",
    borderRadius: 10,
    fontWeight: 800,
  },
  errorBox: {
    marginTop: 6,
    padding: 10,
    background: "#2a1010",
    border: "1px solid #5a1a1a",
    borderRadius: 10,
    color: "#ffb3b3",
    whiteSpace: "pre-wrap",
  },
  hint: { color: "#bdbdbd", fontSize: 12, marginTop: 4 },

  reviewCard: {
    padding: 16,
    border: "1px solid #2b2b2b",
    borderRadius: 12,
    background: "#0f0f0f",
  },
  reviewTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  reviewTitle: { fontSize: 16, fontWeight: 900 },
  reviewSub: { marginTop: 6, color: "#eaeaea" },
  reviewMeta: { marginTop: 6, color: "#bdbdbd", fontSize: 12 },

  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    textAlign: "left",
    padding: "10px 8px",
    borderBottom: "1px solid #2b2b2b",
    color: "#bdbdbd",
    fontWeight: 800,
    fontSize: 12,
  },
  td: {
    padding: "10px 8px",
    borderBottom: "1px solid #1f1f1f",
    verticalAlign: "top",
  },
  tdMuted: { padding: "12px 8px", color: "#bdbdbd" },
  debug: { marginTop: 10, color: "#bdbdbd", fontSize: 12 },
};