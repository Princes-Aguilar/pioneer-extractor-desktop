import json
import sys
from generate_dgdec_excel import generate_dg_excel

if __name__ == "__main__":
    # usage: python generate_dgdec_excel_cli.py template.xlsx output.xlsx payload.json
    template = sys.argv[1]
    out = sys.argv[2]
    payload_path = sys.argv[3]

    with open(payload_path, "r", encoding="utf-8") as f:
      payload = json.load(f)

    generate_dg_excel(template, out, payload)
    print("OK")