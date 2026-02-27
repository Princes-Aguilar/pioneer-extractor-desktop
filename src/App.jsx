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

      // + Add row at TOP of the FIRST record
      addSavedItemRowTop: () => {
        setSavedItems((prev) => {
          if (!prev.length) return prev;

          const first = prev[0];

          const defaultRow = {
            description: "",
            qty: null,
            noOfBoxes: null,
            netWeight: null,
            grossWeight: null,
            fileName: first.fileName || "",

            // ✅ keep same header info for that record
            proNumber: first.proNumber || "",
            soiNumber: first.soiNumber || "",
            destination: first.destination || "",

            hsCode: "",
            dgStatus: "",
            unNumber: "",
            classNumber: "",
            packingGroup: "",
            flashPoint: "",
            properShippingName: "",
            technicalName: "",
            ems: "",
            marinePollutant: "",
            innerType: "",
            outerType: "",
          };

          const updatedFirst = {
            ...first,
            extractedItems: [defaultRow, ...(first.extractedItems || [])],
            numberOfItemsExtracted: (first.numberOfItemsExtracted || 0) + 1,
          };

          return [updatedFirst, ...prev.slice(1)];
        });
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

      // ✅ Save extracted preview into savedItems (includes PRO/SOI/Destination + DG fields)
      proceedSaveExtracted: () => {
        if (!extractedPreview) return;

        const defaultDGFields = {
          hsCode: "",
          dgStatus: "",
          unNumber: "",
          classNumber: "",
          packingGroup: "",
          flashPoint: "",
          properShippingName: "",
          technicalName: "",
          ems: "",
          marinePollutant: "",
          innerType: "",
          outerType: "",
        };

        // ✅ read header fields from preview
        const proNumber = (extractedPreview.proNumber || "").toString().trim();
        const soiNumber = (extractedPreview.soiNumber || "").toString().trim();
        const destination = (extractedPreview.destination || "")
          .toString()
          .trim();

        // ✅ normalize items to ensure DG + pro/soi/destination exist on every row
        const normalizedItems = (extractedPreview.items || []).map((it) => ({
          ...defaultDGFields,
          ...it,
          fileName: it.fileName ?? extractedPreview.fileName ?? "",

          proNumber: (it.proNumber ?? proNumber) || "",
          soiNumber: (it.soiNumber ?? soiNumber) || "",
          destination: (it.destination ?? destination) || "",
        }));

        const record = {
          id: crypto.randomUUID(),
          fileName: extractedPreview.fileName,
          addedAt: new Date().toISOString(),

          // ✅ store at record level too (used by PerSoPro grouping)
          proNumber,
          soiNumber,
          destination,

          extractedItems: normalizedItems,
          numberOfItemsExtracted:
            extractedPreview.numberOfItemsExtracted ?? normalizedItems.length,
        };

        setSavedItems((prev) => [record, ...prev]);

        // reset after save
        setExtractedPreview(null);
        setSelectedFile(null);
      },

      // ✅ DELETE: removes the whole block (all records matching PRO+SOI+Destination)
      deletePerSoProGroup: ({ proNumber, soiNumber, destination }) => {
        const pro = (proNumber || "").toString().trim() || "—";
        const soi = (soiNumber || "").toString().trim() || "—";
        const dest = (destination || "").toString().trim() || "—";

        setSavedItems((prev) =>
          prev.filter((rec) => {
            const recPro = (rec.proNumber || "").toString().trim() || "—";
            const recSoi = (rec.soiNumber || "").toString().trim() || "—";
            const recDest = (rec.destination || "").toString().trim() || "—";

            const match = recPro === pro && recSoi === soi && recDest === dest;
            return !match; // keep only non-matching records
          }),
        );
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
