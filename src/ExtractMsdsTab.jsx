import React, { useMemo, useState } from "react";

function getInitialStatus(row) {
  if (!row?.ok) return "Failed";

  const needsReview =
    !String(row?.product || "").trim() ||
    !String(row?.unNumber || "").trim() ||
    !String(row?.classNumber || "").trim() ||
    !String(row?.packingGroup || "").trim() ||
    !String(row?.properShippingName || "").trim();

  return needsReview ? "Review" : "OK";
}

export default function ExtractMsdsTab({ store, actions }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [editingIndex, setEditingIndex] = useState(null);

  const successCount = useMemo(
    () => results.filter((x) => x.ok).length,
    [results],
  );

  const failCount = useMemo(
    () => results.filter((x) => !x.ok).length,
    [results],
  );

  const openFiles = async () => {
    try {
      const filePaths = await window.pioneer.openMsdsPdfsDialog();
      if (!filePaths || filePaths.length === 0) return;

      setSelectedFiles(filePaths);
      setResults([]);
      setMsg("");
      setEditingIndex(null);
    } catch (e) {
      setMsg(e?.message || String(e));
    }
  };

  const extractAll = async () => {
    if (!selectedFiles.length) {
      setMsg("Please choose one or more MSDS PDFs first.");
      return;
    }

    try {
      setLoading(true);
      setMsg("");
      setEditingIndex(null);

      const res = await window.pioneer.extractManyMsdsPdfs(selectedFiles);

      if (!res?.ok) {
        setMsg(res?.error || "MSDS extraction failed.");
        return;
      }

      const normalized = (res.items || []).map((item) => ({
        ...item,
        status: getInitialStatus(item),
      }));

      setResults(normalized);
    } catch (e) {
      setMsg(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const saveAll = () => {
    const clean = results.filter((x) => x.ok);
    if (!clean.length) {
      setMsg("No extracted MSDS data to save.");
      return;
    }

    actions?.saveExtractedMsdsItems?.(clean);
    setMsg(`Saved ${clean.length} MSDS record(s).`);
  };

  const startEdit = (idx) => {
    setEditingIndex(idx);
    setMsg("");
  };

  const saveRow = (idx) => {
    setResults((prev) =>
      prev.map((row, i) => {
        if (i !== idx) return row;

        const nextStatus =
          !String(row.product || "").trim() ||
          !String(row.unNumber || "").trim() ||
          !String(row.classNumber || "").trim() ||
          !String(row.packingGroup || "").trim() ||
          !String(row.properShippingName || "").trim()
            ? "Review"
            : "Edited";

        return {
          ...row,
          status: nextStatus,
        };
      }),
    );

    setEditingIndex(null);
    setMsg("Row updated.");
  };

  const updateField = (idx, field, value) => {
    setResults((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row)),
    );
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <h2 style={styles.h2}>Extract MSDS</h2>
        <p style={styles.sub}>
          Choose multiple MSDS PDFs, extract all, review in one table, then
          save.
        </p>
      </div>

      <div style={styles.actions}>
        <button style={styles.btn} onClick={openFiles} type="button">
          Choose MSDS PDFs
        </button>

        <button
          style={{ ...styles.btn, ...styles.primaryBtn }}
          onClick={extractAll}
          disabled={loading}
          type="button"
        >
          {loading ? "Extracting..." : "Extract All MSDS"}
        </button>

        <button
          style={{ ...styles.btn, ...styles.saveBtn }}
          onClick={saveAll}
          type="button"
          disabled={!results.some((x) => x.ok)}
        >
          Save
        </button>
      </div>

      <div style={styles.fileBox}>
        <b>Selected files:</b>{" "}
        {selectedFiles.length ? `${selectedFiles.length} file(s)` : "None"}
      </div>

      {selectedFiles.length > 0 && (
        <div style={styles.selectedList}>
          {selectedFiles.map((f, idx) => (
            <div key={`${f}-${idx}`} style={styles.selectedItem}>
              {f}
            </div>
          ))}
        </div>
      )}

      {msg ? <div style={styles.msg}>{msg}</div> : null}

      {results.length > 0 && (
        <>
          <div style={styles.summary}>
            <span>
              Total: <b>{results.length}</b>
            </span>
            <span>
              Success: <b>{successCount}</b>
            </span>
            <span>
              Failed: <b>{failCount}</b>
            </span>
            <span>
              Saved MSDS records: <b>{store?.savedMsdsItems?.length || 0}</b>
            </span>
          </div>

          <div style={styles.card}>
            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>File Name</th>
                    <th style={styles.th}>Product</th>
                    <th style={styles.th}>UN Number</th>
                    <th style={styles.th}>Class</th>
                    <th style={styles.th}>PG</th>
                    <th style={styles.th}>Flash Point</th>
                    <th style={styles.th}>Marine Pollutant</th>
                    <th style={styles.th}>EMS</th>
                    <th style={styles.th}>Proper Shipping Name</th>
                    <th style={styles.th}>Technical Name</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, idx) => {
                    const editing = editingIndex === idx;

                    return (
                      <tr key={idx}>
                        <td style={styles.td}>{r.fileName || "—"}</td>

                        <EditableCell
                          editing={editing}
                          value={r.product}
                          onChange={(v) => updateField(idx, "product", v)}
                        />
                        <EditableCell
                          editing={editing}
                          value={r.unNumber}
                          onChange={(v) => updateField(idx, "unNumber", v)}
                        />
                        <EditableCell
                          editing={editing}
                          value={r.classNumber}
                          onChange={(v) => updateField(idx, "classNumber", v)}
                        />
                        <EditableCell
                          editing={editing}
                          value={r.packingGroup}
                          onChange={(v) => updateField(idx, "packingGroup", v)}
                        />
                        <EditableCell
                          editing={editing}
                          value={r.flashPoint}
                          onChange={(v) => updateField(idx, "flashPoint", v)}
                        />
                        <EditableCell
                          editing={editing}
                          value={r.marinePollutant}
                          onChange={(v) =>
                            updateField(idx, "marinePollutant", v)
                          }
                        />
                        <EditableCell
                          editing={editing}
                          value={r.ems}
                          onChange={(v) => updateField(idx, "ems", v)}
                        />
                        <EditableCell
                          editing={editing}
                          value={r.properShippingName}
                          onChange={(v) =>
                            updateField(idx, "properShippingName", v)
                          }
                        />
                        <EditableCell
                          editing={editing}
                          value={r.technicalName}
                          onChange={(v) => updateField(idx, "technicalName", v)}
                        />

                        <td
                          style={{
                            ...styles.td,
                            ...getStatusStyle(r.status),
                          }}
                        >
                          {r.status || (r.ok ? "OK" : "Failed")}
                        </td>

                        <td style={styles.td}>
                          {!r.ok ? (
                            <span style={{ color: "#ffb7b7", fontWeight: 700 }}>
                              Failed
                            </span>
                          ) : editing ? (
                            <button
                              style={{ ...styles.rowBtn, ...styles.okBtn }}
                              onClick={() => saveRow(idx)}
                              type="button"
                            >
                              OK
                            </button>
                          ) : (
                            <button
                              style={styles.rowBtn}
                              onClick={() => startEdit(idx)}
                              type="button"
                            >
                              Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function EditableCell({ editing, value, onChange }) {
  return (
    <td style={styles.td}>
      {editing ? (
        <input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          style={styles.input}
        />
      ) : (
        value || "—"
      )}
    </td>
  );
}

function getStatusStyle(status) {
  switch (status) {
    case "Edited":
      return { color: "#ffe7a3", fontWeight: 700 };
    case "Review":
      return { color: "#ffd6a3", fontWeight: 700 };
    case "Failed":
      return { color: "#ffb7b7", fontWeight: 700 };
    case "OK":
    default:
      return { color: "#b7ffb7", fontWeight: 700 };
  }
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
  saveBtn: {
    background: "#1f3a1f",
    border: "1px solid #2f5a2f",
    color: "#dfffdc",
  },
  fileBox: {
    border: "1px solid #2b2b2b",
    background: "rgba(0,0,0,0.25)",
    borderRadius: 12,
    padding: 12,
  },
  selectedList: {
    border: "1px solid #2b2b2b",
    background: "rgba(0,0,0,0.18)",
    borderRadius: 12,
    padding: 12,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    maxHeight: 180,
    overflowY: "auto",
  },
  selectedItem: {
    fontSize: 12,
    color: "#d7d7d7",
    wordBreak: "break-all",
  },
  msg: {
    border: "1px solid #5b2b2b",
    background: "#2a1111",
    color: "#ffd0d0",
    borderRadius: 12,
    padding: 12,
    whiteSpace: "pre-wrap",
  },
  summary: {
    display: "flex",
    gap: 16,
    flexWrap: "wrap",
    color: "#d7d7d7",
    fontSize: 13,
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
  input: {
    width: "100%",
    minWidth: 120,
    background: "#0f0f0f",
    color: "#fff",
    border: "1px solid #3a3a3a",
    borderRadius: 8,
    padding: "8px 10px",
    outline: "none",
  },
  rowBtn: {
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid #2b2b2b",
    background: "#111",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },
  okBtn: {
    background: "#1f3a1f",
    border: "1px solid #2f5a2f",
    color: "#dfffdc",
  },
};
