import React, { useState } from "react";
import Tabs from "../components/Tabs.jsx";
import ExtractTab from "../components/ExtractTab.jsx";
import AllPioneerItemsTab from "../components/AllPioneerItemsTab.jsx";
import PerSoProItemsTab from "../components/PerSoProItemsTab.jsx";
import AutoDocsGenTab from "../components/AutoDocsGenTab.jsx";

export default function MenuScreen({ store, actions }) {
  const [active, setActive] = useState("extract");

  const tabs = [
    { key: "extract", label: "Extract" },
    { key: "all", label: "All Pioneer Items" },
    { key: "persopro", label: "PER SO and PRO Items" },
    { key: "autodocs", label: "Automatic Docs Generation" },
  ];

  return (
    <div style={styles.wrap}>
      <header style={styles.header}>
        <div>
          <h2 style={styles.h2}>Menu</h2>
          <div style={styles.meta}>
            Saved items: <b>{store.savedItems.length}</b>
          </div>
        </div>

        <button style={styles.ghostBtn} onClick={actions.goStart}>
          ← Back to Start
        </button>
      </header>

      <Tabs tabs={tabs} activeKey={active} onChange={setActive} />

      <main style={styles.panel}>
        {active === "extract" && <ExtractTab store={store} actions={actions} />}
        {active === "all" && (
          <AllPioneerItemsTab store={store} actions={actions} />
        )}
        {active === "persopro" && (
          <PerSoProItemsTab store={store} actions={actions} />
        )}{" "}
        {active === "autodocs" && <AutoDocsGenTab />}
      </main>
    </div>
  );
}

const styles = {
  wrap: { maxWidth: 1050, margin: "0 auto" },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
  },
  h2: { margin: 0, fontSize: 24 },
  meta: { marginTop: 6, color: "#bdbdbd" },
  ghostBtn: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #2b2b2b",
    background: "transparent",
    color: "#fff",
    cursor: "pointer",
  },
  panel: {
    marginTop: 14,
    background: "#121212",
    border: "1px solid #242424",
    borderRadius: 16,
    padding: 16,
    minHeight: 420,
  },
};
