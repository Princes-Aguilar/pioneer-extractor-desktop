import React, { useState } from "react";

export default function ExtractMsdsTab() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const openFile = async () => {
    try {
      const filePath = await window.pioneer.openMsdsPdfDialog();
      if (!filePath) return;
      setSelectedFile(filePath);
      setResult(null);
      setMsg("");
    } catch (e) {
      setMsg(e?.message || String(e));
    }
  };

  const extract = async () => {
    if (!selectedFile) {
      setMsg("Please choose an MSDS PDF first.");
      return;
    }

    try {
      setLoading(true);
      setMsg("");
      const res = await window.pioneer.extractMsdsPdf(selectedFile);

      if (!res?.ok) {
        setMsg(res?.error || "MSDS extraction failed.");
        return;
      }

      setResult(res.item);
    } catch (e) {
      setMsg(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <h2 style={styles.h2}>Extract MSDS</h2>
        <p style={styles.sub}>
          Extract Product, UN Number, Class, PG, Flash Point, Marine Pollutant,
          EMS, Proper Shipping Name, and Technical Name.
        </p>
      </div>

      <div style={styles.actions}>
        <button style={styles.btn} onClick={openFile}>
          Choose MSDS PDF
        </button>

        <button
          style={{ ...styles.btn, ...styles.primaryBtn }}
          onClick={extract}
          disabled={loading}
        >
          {loading ? "Extracting..." : "Extract MSDS"}
        </button>
      </div>

      <div style={styles.fileBox}>
        <b>Selected file:</b> {selectedFile || "None"}
      </div>

      {msg ? <div style={styles.msg}>{msg}</div> : null}

      {result && (
        <div style={styles.card}>
          <table style={styles.table}>
            <tbody>
              <Row label="Product" value={result.product} />
              <Row label="UN Number" value={result.unNumber} />
              <Row label="Class" value={result.classNumber} />
              <Row label="PG" value={result.packingGroup} />
              <Row label="Flash Point" value={result.flashPoint} />
              <Row label="Marine Pollutant" value={result.marinePollutant} />
              <Row label="EMS" value={result.ems} />
              <Row
                label="Proper Shipping Name"
                value={result.properShippingName}
              />
              <Row label="Technical Name" value={result.technicalName} />
              <Row label="File Name" value={result.fileName} />
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <tr>
      <td style={styles.tdLabel}>{label}</td>
      <td style={styles.tdValue}>{value || "—"}</td>
    </tr>
  );
}

const styles = {
  wrap: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    color: "#fff",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  h2: {
    margin: 0,
    fontSize: 26,
    fontWeight: 900,
  },
  sub: {
    margin: 0,
    color: "#bdbdbd",
    fontSize: 13,
  },
  actions: {
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
    background: "#fff",
    color: "#000",
    border: "1px solid #fff",
  },
  fileBox: {
    border: "1px solid #2b2b2b",
    background: "rgba(0,0,0,0.25)",
    borderRadius: 12,
    padding: 12,
  },
  msg: {
    border: "1px solid #5b2b2b",
    background: "#2a1111",
    color: "#ffd0d0",
    borderRadius: 12,
    padding: 12,
    whiteSpace: "pre-wrap",
  },
  card: {
    border: "1px solid #2b2b2b",
    borderRadius: 16,
    background: "rgba(0,0,0,0.35)",
    overflow: "hidden",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  tdLabel: {
    width: 240,
    padding: "12px 14px",
    borderBottom: "1px solid #1f1f1f",
    color: "#bdbdbd",
    fontWeight: 700,
    verticalAlign: "top",
  },
  tdValue: {
    padding: "12px 14px",
    borderBottom: "1px solid #1f1f1f",
    color: "#fff",
  },
};
