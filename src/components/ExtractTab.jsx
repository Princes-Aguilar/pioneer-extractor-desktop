import React, { useCallback, useMemo, useState } from "react";

export default function ExtractTab({ store, actions }) {
  const [isDragging, setIsDragging] = useState(false);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files?.[0];
      if (file) actions.setSelectedFile(file);
    },
    [actions],
  );

  const onPick = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (file) actions.setSelectedFile(file);
      e.target.value = ""; // allow picking same file again
    },
    [actions],
  );

  const hint = useMemo(() => {
    if (!store.selectedFile)
      return "Drag & drop a file here, or choose a file.";
    return `Selected: ${store.selectedFile.name} (${formatBytes(
      store.selectedFile.size,
    )})`;
  }, [store.selectedFile]);

  return (
    <div>
      <h3 style={styles.h3}>Extract</h3>
      <p style={styles.p}>
        This is only the skeleton. Later we’ll add the real extraction logic.
      </p>

      <div
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(false);
        }}
        onDrop={onDrop}
        style={{
          ...styles.dropzone,
          borderColor: isDragging ? "#ffffff" : "#2b2b2b",
          background: isDragging ? "#1a1a1a" : "#0f0f0f",
        }}
      >
        <div style={styles.dropInner}>
          <div style={styles.dropTitle}>Drop File</div>
          <div style={styles.dropHint}>{hint}</div>

          <label style={styles.fileBtn}>
            Choose file
            <input type="file" onChange={onPick} style={{ display: "none" }} />
          </label>
        </div>
      </div>

      <div style={styles.actions}>
        <button
          style={{
            ...styles.primaryBtn,
            opacity: store.selectedFile ? 1 : 0.4,
            cursor: store.selectedFile ? "pointer" : "not-allowed",
          }}
          onClick={actions.submitExtraction}
          disabled={!store.selectedFile}
        >
          Submit
        </button>

        <div style={styles.note}>
          On submit: it will “save” the file record into “All Pioneer Items”.
        </div>
      </div>
    </div>
  );
}

function formatBytes(bytes) {
  const units = ["B", "KB", "MB", "GB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

const styles = {
  h3: { margin: "0 0 6px 0", fontSize: 20 },
  p: { margin: "0 0 14px 0", color: "#bdbdbd" },
  dropzone: {
    border: "2px dashed #2b2b2b",
    borderRadius: 16,
    padding: 18,
    transition: "150ms ease",
    userSelect: "none",
  },
  dropInner: { textAlign: "center", padding: "26px 10px" },
  dropTitle: { fontSize: 18, fontWeight: 800, marginBottom: 6 },
  dropHint: { color: "#bdbdbd", marginBottom: 14, lineHeight: 1.4 },
  fileBtn: {
    display: "inline-block",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #2b2b2b",
    cursor: "pointer",
    background: "#121212",
  },
  actions: { marginTop: 16, display: "grid", gap: 10 },
  primaryBtn: {
    width: 160,
    padding: "11px 14px",
    borderRadius: 12,
    border: "1px solid #fff",
    background: "#fff",
    color: "#0b0b0b",
    fontWeight: 800,
  },
  note: { color: "#bdbdbd" },
};
