import React, { useMemo, useState } from "react";
import StartScreen from "./screens/StartScreen.jsx";
import MenuScreen from "./screens/MenuScreen.jsx";

export default function App() {
  const [screen, setScreen] = useState("start");

  // Main saved shipment items
  const [savedItems, setSavedItems] = useState(() => []);
  const [selectedFile, setSelectedFile] = useState(null);

  // Preview after extraction, before saving
  const [extractedPreview, setExtractedPreview] = useState(null);

  // ✅ Save metadata per PRO||SOI||DEST (used by LOI / Preadvise reuse)
  const [docMetaByGroup, setDocMetaByGroup] = useState(() => ({}));

  // ✅ Saved MSDS extracted records
  const [savedMsdsItems, setSavedMsdsItems] = useState(() => []);

  const actions = useMemo(() => {
    return {
      goStart: () => setScreen("start"),
      goMenu: () => setScreen("menu"),

      setSelectedFile: (file) => setSelectedFile(file),

      // Extract preview
      setExtractedPreview: (preview) => setExtractedPreview(preview),
      clearPreview: () => setExtractedPreview(null),

      // ✅ Save reusable doc metadata for a group
      saveDocMeta: ({ key, meta }) => {
        setDocMetaByGroup((prev) => ({
          ...prev,
          [key]: { ...(prev[key] || {}), ...(meta || {}) },
        }));
      },

      // ✅ Save extracted MSDS rows
      saveExtractedMsdsItems: (items) => {
        const clean = Array.isArray(items) ? items : [];

        const mapped = clean.map((it, idx) => {
          const unNumber = (it.unNumber || "").toString().trim();
          const description = (it.product || "").toString().trim();
          const fileName = (it.fileName || "").toString().trim();

          return {
            id: it.id || crypto.randomUUID(),
            description,
            descriptionClean: description,
            hsCode: it.hsCode || "",
            dgStatus: it.dgStatus || (unNumber ? "DG" : "Non-DG"),
            unNumber,
            classNumber: it.classNumber || "",
            packingGroup: it.packingGroup || "",
            flashPoint: it.flashPoint || "",
            properShippingName: it.properShippingName || "",
            technicalName: it.technicalName || "",
            ems: it.ems || "",
            marinePollutant: it.marinePollutant || "",
            innerType: it.innerType || "",
            outerType: it.outerType || "",
            fileName,
            source: "msds",
            addedAt: new Date().toISOString(),
            _row: idx,
          };
        });

        setSavedMsdsItems((prev) => {
          const seen = new Set(
            prev.map(
              (x) =>
                `${String(x.description || "")
                  .trim()
                  .toUpperCase()}||${String(x.fileName || "")
                  .trim()
                  .toUpperCase()}`,
            ),
          );

          const toAdd = mapped.filter((x) => {
            const key = `${String(x.description || "")
              .trim()
              .toUpperCase()}||${String(x.fileName || "")
              .trim()
              .toUpperCase()}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });

          return [...prev, ...toAdd];
        });
      },

      clearSavedMsdsItems: () => {
        setSavedMsdsItems([]);
      },

      addSavedMsdsRowTop: () => {
        const newId = crypto.randomUUID();

        const newRow = {
          id: newId,
          description: "",
          descriptionClean: "",
          hsCode: "",
          dgStatus: "Non-DG", // default until user enters UN number
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
          fileName: "",
          source: "msds",
          addedAt: new Date().toISOString(),
        };

        setSavedMsdsItems((prev) => [newRow, ...prev]);
        return newId;
      },

      updateSavedMsdsRow: ({ rowId, patch }) => {
        setSavedMsdsItems((prev) =>
          prev.map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
        );
      },

      deleteSavedMsdsRow: ({ rowId }) => {
        setSavedMsdsItems((prev) => prev.filter((row) => row.id !== rowId));
      },

      // Update one saved extracted item row
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

      // Add row at top of first record
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

      addPerSoProRowTop: ({ proNumber, soiNumber, destination }) => {
        let created = null;

        setSavedItems((prev) =>
          prev.map((rec) => {
            const recPro = (rec.proNumber || "").toString().trim() || "—";
            const recSoi = (rec.soiNumber || "").toString().trim() || "—";
            const recDest = (rec.destination || "").toString().trim() || "—";

            const pro = (proNumber || "").toString().trim() || "—";
            const soi = (soiNumber || "").toString().trim() || "—";
            const dest = (destination || "").toString().trim() || "—";

            if (
              created ||
              !(recPro === pro && recSoi === soi && recDest === dest)
            ) {
              return rec;
            }

            const newRow = {
              description: "",
              qty: "",
              noOfBoxes: "",
              netWeight: "",
              grossWeight: "",
              fileName: rec.fileName || "",

              proNumber: pro,
              soiNumber: soi,
              destination: dest,

              hsCode: "",
              dgStatus: "Non-DG",
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

            created = {
              recordId: rec.id,
              itemIndex: 0,
            };

            return {
              ...rec,
              extractedItems: [newRow, ...(rec.extractedItems || [])],
              numberOfItemsExtracted: (rec.numberOfItemsExtracted || 0) + 1,
            };
          }),
        );

        return created;
      },

      // DG Dec generation
      generateDGDec: async ({
        proNumber,
        soiNumber,
        destination,
        item,
        items,
      }) => {
        const list = Array.isArray(items) ? items : item ? [item] : [];
        const clean = list.filter((x) => x && typeof x === "object");

        if (clean.length === 0) {
          throw new Error("No valid DG items to generate.");
        }

        const res = await window.pioneer.generateDGDec({
          proNumber,
          soiNumber,
          destination,
          items: clean,
        });

        if (!res?.ok) {
          throw new Error(res?.error || "DG Dec generation failed.");
        }
        return res;
      },

      // Preadvise generation
      generatePreadvise: async (payload) => {
        const res = await window.pioneer.generatePreadvise(payload);
        if (!res?.ok) {
          throw new Error(res?.error || "Pre-advise generation failed.");
        }
        return res;
      },

      // ✅ LOI generation
      generateLOI: async (payload) => {
        const res = await window.pioneer.generateLOI(payload);
        if (!res?.ok) {
          throw new Error(res?.error || "LOI generation failed.");
        }
        return res;
      },

      // ✅ Non-DG Cert generation
      generateNonDGCert: async (payload) => {
        const res = await window.pioneer.generateNonDGCert(payload);
        if (!res?.ok) {
          throw new Error(
            res?.error || "Non-DG Certification generation failed.",
          );
        }
        return res;
      },

      // Extract XLSX
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
          proNumber: result.proNumber || "",
          soiNumber: result.soiNumber || "",
          destination: result.destination || "",
          totals: result.totals || null,
        });
      },

      // Extract PDF
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
          proNumber: result.proNumber || "",
          soiNumber: result.soiNumber || "",
          destination: result.destination || "",
        });
      },

      // Save extracted preview into savedItems
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

        const proNumber = (extractedPreview.proNumber || "").toString().trim();
        const soiNumber = (extractedPreview.soiNumber || "").toString().trim();
        const destination = (extractedPreview.destination || "")
          .toString()
          .trim();

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
          proNumber,
          soiNumber,
          destination,
          extractedItems: normalizedItems,
          numberOfItemsExtracted:
            extractedPreview.numberOfItemsExtracted ?? normalizedItems.length,
        };

        setSavedItems((prev) => [record, ...prev]);

        setExtractedPreview(null);
        setSelectedFile(null);
      },

      // Delete group in Per So Per Pro
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
            return !match;
          }),
        );

        // optional cleanup of saved doc meta for same group
        const key = `${pro}||${soi}||${dest}`;
        setDocMetaByGroup((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      },

      clearAll: () => {
        setSavedItems([]);
        setExtractedPreview(null);
        setSelectedFile(null);
      },
    };
  }, [selectedFile, extractedPreview]);

  const store = {
    savedItems,
    selectedFile,
    extractedPreview,
    docMetaByGroup,
    savedMsdsItems,
  };

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
