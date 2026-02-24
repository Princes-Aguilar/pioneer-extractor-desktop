import React from "react";

export default function StartScreen({ onStart }) {
  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <h1 style={styles.title}>Start Extracting</h1>
        <p style={styles.sub}>
          Desktop skeleton app — extraction features will be added later.
        </p>

        <button style={styles.primaryBtn} onClick={onStart}>
          Start
        </button>
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    display: "grid",
    placeItems: "center",
    minHeight: "calc(100vh - 48px)",
  },
  card: {
    width: "min(520px, 92vw)",
    background: "#121212",
    border: "1px solid #242424",
    borderRadius: 16,
    padding: 24,
  },
  title: { margin: 0, fontSize: 34, letterSpacing: -0.5 },
  sub: { marginTop: 10, marginBottom: 20, color: "#bdbdbd", lineHeight: 1.5 },
  primaryBtn: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #2f2f2f",
    background: "#ffffff",
    color: "#0b0b0b",
    fontWeight: 700,
    cursor: "pointer",
  },
};
