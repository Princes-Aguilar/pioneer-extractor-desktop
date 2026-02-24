import React from "react";

export default function AutoDocsGenTab() {
  return (
    <div>
      <h3 style={styles.h3}>Automatic Docs Generation</h3>
      <p style={styles.p}>
        Placeholder tab. Later you’ll generate documents automatically based on
        extracted data.
      </p>

      <div style={styles.box}>
        Coming soon: templates, output folder, generate button, status logs.
      </div>
    </div>
  );
}

const styles = {
  h3: { margin: "0 0 6px 0", fontSize: 20 },
  p: { margin: "0 0 14px 0", color: "#bdbdbd" },
  box: {
    padding: 18,
    borderRadius: 12,
    border: "1px dashed #2b2b2b",
    color: "#bdbdbd",
  },
};
