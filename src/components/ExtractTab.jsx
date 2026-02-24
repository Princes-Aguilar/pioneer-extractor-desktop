import React, { useState } from "react";

export default function ExtractTab({ store, actions }) {
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState("");

  const pickWithDialog = async () => {
    try {
      setError("");

      if (!window.pioneer?.openPdfDialog) {
        throw new Error(
          "window.pioneer.openPdfDialog is not available. Check preload.cjs.",
        );
      }

      const filePath = await window.pioneer.openPdfDialog();
      if (!filePath) return;

      actions.setSelectedFile({
        name: filePath.split(/[/\\]/).pop(),
        path: filePath,
      });
    } catch (e) {
      console.error("Pick dialog error:", e);
      setError(e?.message || "Failed to open file dialog.");
    }
  };

  const submitAndExtract = async () => {
    try {
      setError("");
      setIsWorking(true);
      await actions.extractSelectedPdf();
    } catch (e) {
      console.error("Extraction error:", e);
      setError(e?.message || "Unknown extraction error.");
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div>
      <h3 style={styles.h3}>Extract</h3>
      <p style={styles.p}>
        Choose a PDF → Submit (Extract) → Review → Proceed (Save)
      </p>

      <div style={styles.box}>
        <div style={styles.fileName}>
          {store.selectedFile ? (
            <>
              Selected: <b>{store.selectedFile.name}</b>
            </>
          ) : (
            "No file selected"
          )}
        </div>

        <button style={styles.ghostBtn} onClick={pickWithDialog}>
          Choose PDF
        </button>
      </div>

      {error ? <div style={styles.error}>{error}</div> : null}

      <div style={{ marginTop: 16 }}>
        <button
          style={{
            ...styles.primaryBtn,
            opacity: store.selectedFile && !isWorking ? 1 : 0.4,
            cursor:
              store.selectedFile && !isWorking ? "pointer" : "not-allowed",
          }}
          disabled={!store.selectedFile || isWorking}
          onClick={submitAndExtract}
        >
          {isWorking ? "Extracting..." : "Submit (Extract)"}
        </button>
      </div>

      {store.extractedPreview ? (
        <div style={styles.review}>
          <div style={styles.reviewTop}>
            <div>
              <div style={styles.reviewTitle}>Review Extracted Data</div>
              <div style={styles.reviewSub}>
                File: <b>{store.extractedPreview.fileName}</b>{" "}
                <span style={{ color: "#bdbdbd" }}>
                  (text length: {store.extractedPreview.rawTextLength})
                </span>
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
                  <th>Description</th>
                  <th>QTY</th>
                  <th>No. of boxes</th>
                  <th>Net weight</th>
                  <th>Gross weight</th>
                </tr>
              </thead>
              <tbody>
                {store.extractedPreview.items?.length ? (
                  store.extractedPreview.items.map((r, idx) => (
                    <tr key={idx}>
                      <td>{r.description}</td>
                      <td>{r.qty ?? "—"}</td>
                      <td>{r.noOfBoxes ?? "—"}</td>
                      <td>{r.netWeight ?? "—"}</td>
                      <td>{r.grossWeight ?? "—"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ color: "#bdbdbd" }}>
                      No item rows detected. If text length is 0, the PDF is
                      likely scanned and needs OCR.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const styles = {
  h3: { margin: "0 0 6px 0", fontSize: 20 },
  p: { margin: "0 0 14px 0", color: "#bdbdbd" },
  box: {
    padding: 16,
    border: "1px solid #2b2b2b",
    borderRadius: 12,
    background: "#111",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  fileName: { color: "#fff" },
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
    fontWeight: 700,
  },
  error: {
    marginTop: 12,
    padding: 10,
    background: "#2a1010",
    border: "1px solid #5a1a1a",
    borderRadius: 10,
    color: "#ffaaaa",
  },
  review: {
    marginTop: 20,
    padding: 16,
    border: "1px solid #2b2b2b",
    borderRadius: 12,
    background: "#0f0f0f",
  },
  reviewTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  reviewTitle: { fontSize: 16, fontWeight: 900 },
  reviewSub: { marginTop: 6, color: "#eaeaea" },
  table: { width: "100%", borderCollapse: "collapse" },
};
