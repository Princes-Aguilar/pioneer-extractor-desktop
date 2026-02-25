import React, { useMemo, useState } from "react";
import StartScreen from "./screens/StartScreen.jsx";
import MenuScreen from "./screens/MenuScreen.jsx";

export default function App() {
  const [screen, setScreen] = useState("start");

  // In-memory only for now
  const [savedItems, setSavedItems] = useState(() => []);
  const [selectedFile, setSelectedFile] = useState(null);

  // Preview after extraction, before saving
  const [extractedPreview, setExtractedPreview] = useState(null);

  const actions = useMemo(() => {
    return {
      goStart: () => setScreen("start"),
      goMenu: () => setScreen("menu"),

      setSelectedFile: (file) => setSelectedFile(file),

      // used by ExtractTab.jsx
      setExtractedPreview: (preview) => setExtractedPreview(preview),

      clearPreview: () => setExtractedPreview(null),

      // used by AllPioneerTab.jsx (Edit → Save)
      updateSavedItemRow: ({ recordId, itemIndex, patch }) => {
        setSavedItems((prev) =>
          prev.map((rec) => {
            if (rec.id !== recordId) return rec;

            const nextItems = (rec.extractedItems || []).map((it, idx) => {
              if (idx !== itemIndex) return it;
              return { ...it, ...patch };
            });

            return { ...rec, extractedItems: nextItems };
          }),
        );
      },

      // Optional: if you still use XLSX
      extractSelectedXlsx: async () => {
        if (!selectedFile) throw new Error("No file selected.");

        const filePath = selectedFile.path;
        if (!filePath) {
          throw new Error(
            "Selected file has no path. Use the Choose XLSX button.",
          );
        }

        const result = await window.pioneer.extractXlsx(filePath);
        if (!result?.ok) {
          throw new Error(result?.error || "XLSX extraction failed.");
        }

        setExtractedPreview({
          fileName: result.fileName,
          items: result.items || [],
          numberOfItemsExtracted:
            result.numberOfItemsExtracted ?? (result.items?.length || 0),
          debug: result.debug,
        });
      },

      extractSelectedPdf: async () => {
        if (!selectedFile) throw new Error("No file selected.");

        const filePath = selectedFile.path;
        if (!filePath) {
          throw new Error(
            "Selected file has no path. Use the 'Choose PDF' button (Electron dialog) instead of browser file input.",
          );
        }

        if (!window.pioneer?.extractPdf) {
          throw new Error(
            "window.pioneer.extractPdf is not available. Check preload.cjs wiring.",
          );
        }

        const result = await window.pioneer.extractPdf(filePath);

        if (!result?.ok) {
          throw new Error(
            result?.error || "Extraction failed for unknown reason.",
          );
        }

        setExtractedPreview({
          fileName: result.fileName,
          items: result.items || [],
          numberOfItemsExtracted:
            result.numberOfItemsExtracted ?? (result.items?.length || 0),
          debug: result.debug,
        });
      },

      // ✅ IMPORTANT: when saving, automatically add extra DG columns to every item
      proceedSaveExtracted: () => {
        if (!extractedPreview) return;

        const defaultDGFields = {
          hsCode: "",
          dgStatus: "", // DG / Non-DG
          unNumber: "",
          classNumber: "",
          packingGroup: "",
          flashPoint: "",
          properShippingName: "",
          technicalName: "",
          ems: "",
          marinePollutant: "", // Yes / No
          innerType: "",
          outerType: "",
        };

        // Add the DG fields to every extracted item if not present yet
        const normalizedItems = (extractedPreview.items || []).map((it) => ({
          ...defaultDGFields,
          ...it,
        }));

        const record = {
          id: crypto.randomUUID(),
          fileName: extractedPreview.fileName,
          addedAt: new Date().toISOString(),
          extractedItems: normalizedItems,
          numberOfItemsExtracted:
            extractedPreview.numberOfItemsExtracted ??
            (extractedPreview.items?.length || 0),
        };

        setSavedItems((prev) => [record, ...prev]);

        // reset
        setExtractedPreview(null);
        setSelectedFile(null);
      },

      // optional helper
      clearAll: () => setSavedItems([]),
    };
  }, [selectedFile, extractedPreview]);

  const store = { savedItems, selectedFile, extractedPreview };

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
