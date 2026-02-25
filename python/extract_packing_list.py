import sys
import json
import re
from pathlib import Path
import pdfplumber

NUM_TOKEN = re.compile(r"^-?\d{1,3}(?:,\d{3})*(?:\.\d+)?$|^-?\d+(?:\.\d+)?$")

UNITS = {"BOX", "BOXES", "PC", "PCS", "SET", "SETS", "PAIL", "POUCH", "BOTTLE", "BAG"}


def to_int(val):
    if val is None:
        return None
    s = str(val).replace(",", "").strip()
    try:
        return int(float(s))
    except:
        return None


def to_float(val):
    if val is None:
        return None
    s = str(val).replace(",", "").strip()
    try:
        return float(s)
    except:
        return None


def is_num_token(t):
    return bool(NUM_TOKEN.match(t or ""))


def normalize_line(line: str) -> str:
    s = (line or "").replace("\xa0", " ").strip()
    s = re.sub(r"\s+", " ", s)

    # Fix: "1 ,140.48" -> "1,140.48"
    s = re.sub(r"(\d)\s+,(\d)", r"\1,\2", s)

    # Fix: "1 9,872.00" -> "19,872.00" (only comma-thousands)
    s = re.sub(r"(\d)\s+(\d{1,3}(?:,\d{3})+\.\d{2,4})\b", r"\1\2", s)

    # ✅ Fix the exact problem: "5 47.20" -> "547.20"
    s = re.sub(r"(?<!\d)(\d)\s+(\d{2}\.\d{2,4})(?!\d)", r"\1\2", s)

    # Fix split decimals: "2 0.80" -> "20.80"
    s = re.sub(r"(?<!\d)(\d)\s+(\d\.\d{2,4})(?!\d)", r"\1\2", s)

    # Fix: "20 .80" -> "20.80"
    s = re.sub(r"(?<!\d)(\d)\s+\.(\d{2,4})(?!\d)", r"\1.\2", s)

    return s.strip()

def extract_net_gross(line: str):
    decs = re.findall(r"(\d{1,3}(?:,\d{3})*\.\d{2,4}|\d+\.\d{2,4})", line)
    if len(decs) >= 2:
        return to_float(decs[-2]), to_float(decs[-1])
    return None, None

def extract_line(line):
    tokens = line.split()
    if len(tokens) < 8:
        return None

    unit_idx = None
    for i in range(1, len(tokens) - 1):
        if tokens[i].upper() in UNITS:
            if to_int(tokens[i - 1]) is not None and to_int(tokens[i + 1]) is not None:
                unit_idx = i
                break

    if unit_idx is None:
        return None

    qty = to_int(tokens[unit_idx - 1])
    boxes = to_int(tokens[unit_idx + 1])

    if qty is None or boxes is None:
        return None

    desc_tokens = tokens[: unit_idx - 1]
    while desc_tokens and to_int(desc_tokens[-1]) is not None:
        desc_tokens.pop()

    description = " ".join(desc_tokens).strip()
    if len(description) < 3:
        return None

    net, gross = extract_net_gross(line)
    if net is None or gross is None:
        return None

    return {
        "description": description,
        "qty": qty,
        "noOfBoxes": boxes,
        "netWeight": net,
        "grossWeight": gross,
    }


def extract_pdf(pdf_path):
    with pdfplumber.open(str(pdf_path)) as pdf:
        pages_text = [(p.extract_text() or "") for p in pdf.pages]

    full_text = "\n".join(pages_text).strip()

    if len(full_text) < 20:
        return {
            "ok": False,
            "error": "No text extracted. Likely scanned PDF.",
        }

    items = []

    for raw in full_text.splitlines():
        line = normalize_line(raw)
        if not line:
            continue

        up = line.upper()
        if up.startswith("TOTAL") or "TOTAL NO" in up:
            continue

        it = extract_line(line)
        if it:
            it["fileName"] = pdf_path.name
            items.append(it)

    # Deduplicate
    seen = set()
    uniq = []
    for it in items:
        key = (
            it["description"],
            it["qty"],
            it["noOfBoxes"],
            it["netWeight"],
            it["grossWeight"],
        )
        if key in seen:
            continue
        seen.add(key)
        uniq.append(it)

    return {
        "ok": True,
        "fileName": pdf_path.name,
        "numberOfItemsExtracted": len(uniq),
        "items": uniq,
        "debug": {"textLength": len(full_text)},
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"ok": False, "error": "Missing PDF path"}))
        sys.exit(1)

    p = Path(sys.argv[1])

    if not p.exists():
        print(json.dumps({"ok": False, "error": "File not found"}))
        sys.exit(1)

    try:
        print(json.dumps(extract_pdf(p)))
    except Exception as e:
        print(json.dumps({"ok": False, "error": str(e)}))
        sys.exit(1)