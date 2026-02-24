import React from "react";

export default function Tabs({ tabs, activeKey, onChange }) {
  return (
    <div style={styles.row}>
      {tabs.map((t) => {
        const active = t.key === activeKey;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            style={{
              ...styles.tab,
              ...(active ? styles.tabActive : {}),
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

const styles = {
  row: { display: "flex", gap: 10, flexWrap: "wrap" },
  tab: {
    padding: "10px 12px",
    borderRadius: 999,
    border: "1px solid #2b2b2b",
    background: "transparent",
    color: "#fff",
    cursor: "pointer",
  },
  tabActive: {
    background: "#ffffff",
    color: "#0b0b0b",
    border: "1px solid #ffffff",
    fontWeight: 700,
  },
};
