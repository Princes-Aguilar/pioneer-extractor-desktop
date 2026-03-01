import json
import sys
from datetime import datetime
from docx import Document

def replace_text_in_doc(doc: Document, mapping: dict):
  # Replace in paragraphs
  for p in doc.paragraphs:
    for k, v in mapping.items():
      if k in p.text:
        for run in p.runs:
          if k in run.text:
            run.text = run.text.replace(k, v)

  # Replace in tables
  for table in doc.tables:
    for row in table.rows:
      for cell in row.cells:
        for p in cell.paragraphs:
          for k, v in mapping.items():
            if k in p.text:
              for run in p.runs:
                if k in run.text:
                  run.text = run.text.replace(k, v)

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

  # You must put these placeholders into your DOCX template
  mapping = {
    "{{DATE_OF_DELIVERY}}": today,
    "{{FIRST_PORT}}": str(payload.get("firstPort","")),
    "{{SECOND_PORT}}": str(payload.get("secondPort","")),
    "{{BOOKING_NUMBER}}": str(payload.get("bookingNumber","")),
    "{{VESSEL_VOYAGE}}": str(payload.get("vesselVoyage","")),
    "{{CONTAINER_SIZE_TYPE}}": str(payload.get("containerSizeType","")),
    "{{CONTAINER_NUMBERS}}": str(payload.get("containerNumbers","")),
    "{{SEAL_NUMBERS}}": str(payload.get("sealNumbers","")),
    "{{TARE_WEIGHT_KGS}}": str(payload.get("tareWeightKgs","")),
    "{{TRUCKER}}": str(payload.get("trucker","")),
    "{{PLATE_NUMBER}}": str(payload.get("plateNumber","")),

    "{{CARGO_WEIGHT_KGS}}": f'{float(payload.get("cargoWeightKgs", 0) or 0):.2f}',
    "{{UNNO_IMO_CLASS}}": str(payload.get("unnoImoClass","")),
  }

  doc = Document(template_path)
  replace_text_in_doc(doc, mapping)
  doc.save(out_path)
  print(out_path)

if __name__ == "__main__":
  main()