import json
import sys
from datetime import datetime
from docx import Document

def _replace_in_paragraph_runs(paragraph, mapping: dict):
    """
    Replaces placeholders even if Word split them across multiple runs.
    Tradeoff: may flatten formatting within the paragraph where replacement happens.
    (Usually OK for template placeholders.)
    """
    if not paragraph.runs:
        return

    full = "".join(run.text for run in paragraph.runs)
    new = full
    for k, v in mapping.items():
        if k in new:
            new = new.replace(k, v)

    if new != full:
        # Put all text into the first run, clear the rest
        paragraph.runs[0].text = new
        for r in paragraph.runs[1:]:
            r.text = ""

def replace_text_in_doc(doc: Document, mapping: dict):
    # Replace in normal paragraphs
    for p in doc.paragraphs:
        _replace_in_paragraph_runs(p, mapping)

    # Replace in tables
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for p in cell.paragraphs:
                    _replace_in_paragraph_runs(p, mapping)

def main():
    if len(sys.argv) != 4:
        print("Usage: generate_preadvise_docx_cli.py <template.docx> <out.docx> <payload.json>", file=sys.stderr)
        sys.exit(2)

    template_path = sys.argv[1]
    out_path = sys.argv[2]
    payload_path = sys.argv[3]

    with open(payload_path, "r", encoding="utf-8") as f:
        payload = json.load(f)

    today = datetime.now().strftime("%B %d, %Y").upper()

    def f2(x):
        try:
            return f"{float(x or 0):,.2f}"
        except Exception:
            return "0.00"

    cargo_weight = float(payload.get("cargoWeightKgs", 0) or 0)
    tare_weight = float(payload.get("tareWeightKgs", 0) or 0)

    # ✅ NEW: compute VGMD automatically
    vgmd_weight = cargo_weight + tare_weight

    mapping = {
        "{{DATE_OF_DELIVERY}}": today,
        "{{FIRST_PORT}}": str(payload.get("firstPort", "")),
        "{{SECOND_PORT}}": str(payload.get("secondPort", "")),
        "{{BOOKING_NUMBER}}": str(payload.get("bookingNumber", "")),
        "{{VESSEL_VOYAGE}}": str(payload.get("vesselVoyage", "")),
        "{{CONTAINER_SIZE_TYPE}}": str(payload.get("containerSizeType", "")),
        "{{CONTAINER_NUMBERS}}": str(payload.get("containerNumbers", "")),
        "{{SEAL_NUMBERS}}": str(payload.get("sealNumbers", "")),

        "{{TARE_WEIGHT_KGS}}": f2(tare_weight),
        "{{CARGO_WEIGHT_KGS}}": f2(cargo_weight),

        # ✅ NEW PLACEHOLDER
        "{{VGMD_KGS}}": f2(vgmd_weight),

        "{{TRUCKER}}": str(payload.get("trucker", "")),
        "{{PLATE_NUMBER}}": str(payload.get("plateNumber", "")),
        "{{UNNO_IMO_CLASS}}": str(payload.get("unnoImoClass", "")),
    }
    doc = Document(template_path)
    replace_text_in_doc(doc, mapping)
    doc.save(out_path)
    print(out_path)

if __name__ == "__main__":
    main()