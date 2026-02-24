import React, { useMemo, useState } from "react";
import StartScreen from "./screens/StartScreen.jsx";
import MenuScreen from "./screens/MenuScreen.jsx";

export default function App() {
  const [screen, setScreen] = useState("start");

  // Temporary in-memory storage for skeleton
  const [savedItems, setSavedItems] = useState(() => []);
  const [selectedFile, setSelectedFile] = useState(null);

  const actions = useMemo(
    () => ({
      goStart: () => setScreen("start"),
      goMenu: () => setScreen("menu"),

      setSelectedFile: (file) => setSelectedFile(file),

      submitExtraction: () => {
        if (!selectedFile) return;

        // Skeleton: just save a record; later you’ll parse/extract
        const record = {
          id: crypto.randomUUID(),
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          addedAt: new Date().toISOString(),

          // placeholders for later features
          so: null,
          pro: null,
        };

        setSavedItems((prev) => [record, ...prev]);
        setSelectedFile(null);
      },

      clearAll: () => setSavedItems([]),
    }),
    [selectedFile],
  );

  const store = { savedItems, selectedFile };

  return (
    <div style={styles.appShell}>
      {screen === "start" ? (
        <StartScreen onStart={actions.goMenu} />
      ) : (
        <MenuScreen store={store} actions={actions} />
      )}
    </div>
  );
}

const styles = {
  appShell: {
    minHeight: "100vh",
    background: "#0b0b0b",
    color: "#ffffff",
    fontFamily: "Inter, system-ui, Arial, sans-serif",
    padding: 24,
    boxSizing: "border-box",
  },
};
