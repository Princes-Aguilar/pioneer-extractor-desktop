import React, { useEffect, useMemo, useState } from "react";

function upper(s) {
  return String(s || "")
    .trim()
    .toUpperCase();
}

function parseKgs(v) {
  if (v == null) return 0;
  const s = String(v).replace(/,/g, "").trim();
  const m = s.match(/-?\d+(\.\d+)?/); // supports "13.73 kgs"
  return m ? Number(m[0]) : 0;
}

function pickFirst(obj, keys) {
  for (const k of keys) {
    if (obj && obj[k] != null && String(obj[k]).trim() !== "") return obj[k];
  }
  return undefined;
}

function isDG(r) {
  const v = upper(r?.dgStatus);
  return v === "DG" || v === "YES" || v === "Y" || v === "TRUE";
}

export default function PreadviseModal({ open, onClose, group, onSubmit }) {
  const rows = group?.rows || [];

  /**
   * ✅ Requirement:
   * Cargo Weight (kgs) = total gross weight of ALL items in the selected group
   *
   * Best source is what AutoDocsGenTab computed and passed in:
   * group.cargoWeightKgs
   *
   * But we also provide a fallback computation here.
   */
  const cargoWeightTotal = useMemo(() => {
    // Prefer precomputed value passed from AutoDocsGenTab
    if (
      group?.cargoWeightKgs != null &&
      Number.isFinite(Number(group.cargoWeightKgs))
    ) {
      return Number(group.cargoWeightKgs);
    }

    // Fallback: compute from rows
    return rows.reduce((sum, r) => {
      // Your table shows r.grossWeight, so prioritize that
      const val = pickFirst(r, [
        "grossWeight",
        "grossWeightKgs",
        "grossweight",
        "gross_wt",
        "grossWt",
        "gw",
        "gross",
        // if your data uses label-style keys:
        "Gross Weight",
        "GROSS WEIGHT",
        "GROSSWT",
      ]);
      return sum + parseKgs(val);
    }, 0);
  }, [group?.cargoWeightKgs, rows]);

  /**
   * ✅ Requirement:
   * UNNO & IMO CLASS = all UN/Class pairs for items in the selected group.
   *
   * Most companies want DG-only here, because pre-advise UN/IMDG is for DG.
   * If you want ALL items (including Non-DG), set DG_ONLY=false below.
   */
  const DG_ONLY = true;

  const unClassList = useMemo(() => {
    // Prefer precomputed string from AutoDocsGenTab (if you passed it)
    // But we’ll re-categorize even if it’s present, using rows (more reliable)
    const list = DG_ONLY ? rows.filter(isDG) : rows;

    const unSet = new Set();
    const classSet = new Set();

    for (const r of list) {
      const un = pickFirst(r, [
        "unNumber",
        "unNo",
        "unno",
        "UNNO",
        "UN No.",
        "UN",
      ]);
      const cls = pickFirst(r, [
        "classNumber",
        "imoClass",
        "imcoClass",
        "class",
        "CLASS",
        "IMO CLASS",
      ]);

      const unClean = upper(un).replace(/\s+/g, "");
      // normalize "UN1993" (if user already types "1993", we add UN)
      const unNorm = unClean
        ? unClean.startsWith("UN")
          ? unClean
          : `UN${unClean}`
        : "";

      const clsClean = upper(cls).replace(/\s+/g, "");

      if (unNorm) unSet.add(unNorm);
      if (clsClean) classSet.add(clsClean);
    }

    const unList = Array.from(unSet).join(", ");
    const clsList = Array.from(classSet).join(", ");

    // ✅ Categorized output
    if (!unList && !clsList) return "";

    if (unList && clsList) return `UN: ${unList} | Class: ${clsList}`;
    if (unList) return `UN: ${unList}`;
    return `Class: ${clsList}`;
  }, [rows]);

  const [form, setForm] = useState({
    firstPort: "",
    secondPort: "",
    bookingNumber: "",
    vesselVoyage: "",
    containerSizeType: "",
    containerNumbers: "",
    sealNumbers: "",
    tareWeightKgs: "",
    trucker: "",
    plateNumber: "",
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      firstPort: "",
      secondPort: "",
      bookingNumber: "",
      vesselVoyage: "",
      containerSizeType: "",
      containerNumbers: "",
      sealNumbers: "",
      tareWeightKgs: "",
      trucker: "",
      plateNumber: "",
    });
  }, [open]);

  if (!open) return null;

  const setField = (k) => (e) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div style={styles.backdrop} onMouseDown={onClose}>
      <div style={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={{ fontWeight: 700 }}>Generate KMTC Pre-advise</div>
          <button onClick={onClose} style={styles.xbtn}>
            ✕
          </button>
        </div>

        <div style={styles.section}>
          <div style={styles.small}>
            Auto-filled:
            <ul style={{ margin: "6px 0 0 18px" }}>
              <li>
                Date of delivery: <b>today</b>
              </li>
              <li>
                Cargo Weight (kgs): <b>{cargoWeightTotal.toFixed(2)}</b>
              </li>
              <li>
                UNNO &amp; IMO Class: <b>{unClassList || "—"}</b>
              </li>
            </ul>
          </div>
        </div>

        <div style={styles.grid}>
          <Field
            label="FIRST PORT (TRANSHIPMENT PORT)"
            value={form.firstPort}
            onChange={setField("firstPort")}
          />
          <Field
            label="SECOND PORT (FINAL DESTINATION)"
            value={form.secondPort}
            onChange={setField("secondPort")}
          />
          <Field
            label="BOOKING NUMBER"
            value={form.bookingNumber}
            onChange={setField("bookingNumber")}
          />
          <Field
            label="VESSEL / VOYAGE"
            value={form.vesselVoyage}
            onChange={setField("vesselVoyage")}
          />
          <Field
            label="CONTAINER SIZE & TYPE"
            value={form.containerSizeType}
            onChange={setField("containerSizeType")}
          />
          <Field
            label="CONTAINER NUMBER(S)"
            value={form.containerNumbers}
            onChange={setField("containerNumbers")}
          />
          <Field
            label="SEAL NUMBER(S)"
            value={form.sealNumbers}
            onChange={setField("sealNumbers")}
          />
          <Field
            label="Tare Weight (kgs.)"
            value={form.tareWeightKgs}
            onChange={setField("tareWeightKgs")}
          />
          <Field
            label="TRUCKER"
            value={form.trucker}
            onChange={setField("trucker")}
          />
          <Field
            label="PLATE NUMBER"
            value={form.plateNumber}
            onChange={setField("plateNumber")}
          />
        </div>

        <div style={styles.footer}>
          <button onClick={onClose} style={styles.btn}>
            Cancel
          </button>
          <button
            onClick={() => {
              const payload = {
                proNumber: group?.proNumber,
                soiNumber: group?.soiNumber,
                destination: group?.destination,

                // ✅ auto fields required by you
                cargoWeightKgs: cargoWeightTotal,
                unnoImoClass: unClassList,

                // ✅ user inputs
                ...form,

                // Include rows in case backend wants to recompute/verify
                items: rows,
              };

              // Debug:
              const dgItems = rows.filter(isDG);
              console.log("Rows:", rows.length);
              console.log(
                "DG count:",
                dgItems.length,
                dgItems.map((x) => x.unNumber),
              );
              console.log("CargoWeightTotal:", cargoWeightTotal);
              console.log("UN/Class:", unClassList);

              onSubmit(payload);
            }}
            style={{ ...styles.btn, ...styles.btnPrimary }}
          >
            Generate
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <label style={styles.field}>
      <div style={styles.label}>{label}</div>
      <input value={value} onChange={onChange} style={styles.input} />
    </label>
  );
}

const styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
    pointerEvents: "auto",
  },
  modal: {
    width: 880,
    maxWidth: "95vw",
    background: "#111",
    color: "#fff",
    borderRadius: 12,
    border: "1px solid #333",
    padding: 16,
    pointerEvents: "auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  xbtn: {
    background: "transparent",
    color: "#fff",
    border: "none",
    fontSize: 18,
    cursor: "pointer",
  },
  section: { marginBottom: 12 },
  small: { color: "#bbb", fontSize: 13 },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 12, color: "#bbb" },
  input: {
    background: "#0b0b0b",
    border: "1px solid #333",
    borderRadius: 8,
    padding: "10px 10px",
    color: "#fff",
    outline: "none",
    pointerEvents: "auto",
  },
  footer: {
    marginTop: 14,
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
  },
  btn: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #333",
    background: "#1a1a1a",
    color: "#fff",
    cursor: "pointer",
  },
  btnPrimary: { border: "1px solid #4a4a4a", background: "#2a2a2a" },
};
