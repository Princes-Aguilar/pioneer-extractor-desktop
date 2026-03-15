import sys
import json
import re
from pathlib import Path
import pdfplumber

UNITS = {"BOX", "BOXES", "PC", "PCS", "SET", "SETS", "PAIL", "POUCH", "BOTTLE", "BAG"}


def to_int(val):
    if val is None:
        return None
    s = str(val).replace(",", "").strip()
    try:
        return int(round(float(s)))
    except Exception:
        return None


def to_float(val):
    if val is None:
        return None
    s = str(val).replace(",", "").strip()
    try:
        return float(s)
    except Exception:
        return None


def is_numeric_token(tok: str) -> bool:
    return bool(re.fullmatch(r"\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?|\.\d+", tok or ""))


def is_single_digit(tok: str) -> bool:
    return bool(re.fullmatch(r"\d", tok or ""))


def tokenize_line(line: str):
    s = (line or "").replace("\xa0", " ").strip()
    s = re.sub(r"\s+", " ", s)

    # Fix broken comma numbers like: 2 ,280.96 -> 2,280.96
    s = re.sub(r"(\d)\s+,\s*(\d)", r"\1,\2", s)

    return s.split()


def normalize_line(line: str) -> str:
    """
    Used mainly for format A parser.
    Carefully fixes split decimals like:
    1 38.24 -> 138.24
    7 .20   -> 7.20

    But it does NOT merge valid separate columns like:
    81 22.28
    """
    s = (line or "").replace("\xa0", " ").strip()
    s = re.sub(r"\s+", " ", s)

    # Fix broken comma numbers
    s = re.sub(r"(\d)\s+,\s*(\d)", r"\1,\2", s)

    # Fix split decimal values only when the left side is a single digit token
    s = re.sub(r"(?<!\S)(\d)\s+(\d{1,3}\.\d{2,4})(?!\S)", r"\1\2", s)
    s = re.sub(r"(?<!\S)(\d)\s+\.(\d{2,4})(?!\S)", r"\1.\2", s)

    return s.strip()


def looks_like_header(line: str) -> bool:
    up = line.upper()

    if up.startswith("DESCRIPTION"):
        return True
    if up.startswith("BOX PER PACK"):
        return True
    if "NET WEIGHT" in up and "GROSS WEIGHT" in up:
        return True
    if up.startswith("PREPARED BY") or up.startswith("APPROVED BY"):
        return True
    if "PACKED AND CERTIFIED CORRECT BY" in up:
        return True
    if up.startswith("EXPORT IN-CHARGE") or up.startswith("SR. LOGISTICS MANAGER"):
        return True

    return False


def is_junk_line(line: str) -> bool:
    up = line.upper()

    junk_phrases = [
        "PREPARED BY",
        "APPROVED BY",
        "PACKED AND CERTIFIED CORRECT BY",
        "EXPORT IN-CHARGE",
        "SR. LOGISTICS MANAGER",
        "LOGISTIC SUPERVISOR",
        "GUIA ROSE",
        "MARY LOUISE",
        "ROLANDO DELA CRUZ",
    ]

    return any(p in up for p in junk_phrases)


def extract_totals_line(line: str):
    if "TOTAL NO. OF PALLETS" not in line.upper():
        return None

    nums = re.findall(r"\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?", line)
    if len(nums) < 5:
        return None

    return {
        "rawNumbers": [to_float(x) for x in nums],
        "totalQty": to_float(nums[-4]),
        "totalNetWeight": to_float(nums[-3]),
        "totalGrossWeight": to_float(nums[-2]),
        "totalBoxes": to_float(nums[-1]),
    }


def parse_float_from_right(tokens, idx, prefer_combined=True):
    """
    Parses a numeric value from the right side of token list.

    Handles:
    - normal token: 138.24
    - split token:  1 38.24 -> 138.24

    prefer_combined=True is used for GROSS/NET fields because PDFs often split them.
    prefer_combined=False is used for WT/PACK in format B because boxes and wt/pack
    are separate columns like: 5 3.64
    """
    if idx < 0:
        return None, idx

    tok = tokens[idx]
    standalone = to_float(tok) if is_numeric_token(tok) else None

    combined = None
    if idx - 1 >= 0 and is_single_digit(tokens[idx - 1]) and is_numeric_token(tok):
        combined = to_float(tokens[idx - 1] + tok)

    if prefer_combined and combined is not None:
        return combined, idx - 2

    if standalone is not None:
        return standalone, idx - 1

    if combined is not None:
        return combined, idx - 2

    return None, idx


def extract_line_format_a(line: str):
    """
    Format A:
    DESCRIPTION QTY UNIT NET GROSS BOXES

    Example from 5447-1.pdf:
    MIGHTY BOND 3G FLAG TYPE 7,680 PC 1 38.24 1 55.76 1 92.00
    """
    tokens = line.split()
    if len(tokens) < 6:
        return None

    boxes_tok = tokens[-1]
    boxes = to_float(boxes_tok)
    if boxes is None:
        return None

    idx = len(tokens) - 2

    gross, idx = parse_float_from_right(tokens, idx, prefer_combined=True)
    net, idx = parse_float_from_right(tokens, idx, prefer_combined=True)

    if gross is None or net is None:
        return None

    if idx < 1:
        return None

    unit_tok = tokens[idx].upper()
    qty_tok = tokens[idx - 1]

    qty = to_int(qty_tok)
    if unit_tok not in UNITS or qty is None:
        return None

    description = " ".join(tokens[: idx - 1]).strip()
    if not description:
        return None

    return {
        "description": description,
        "qty": qty,
        "unit": unit_tok,
        "noOfBoxes": boxes,
        "netWeight": net,
        "grossWeight": gross,
    }


def extract_line_format_b(raw_line: str):
    """
    Format B:
    DESCRIPTION PERPACK QTY UNIT BOXES WTPACK NET GROSS

    Example from 5431.pdf:
    PIONEER PAINTERS BUDDY GAP SEALANT POUCH 65 mL 30 150 PC 5 3.64 1 8.20 1 8.79
    """
    tokens = tokenize_line(raw_line)
    if len(tokens) < 8:
        return None

    idx = len(tokens) - 1

    gross, idx = parse_float_from_right(tokens, idx, prefer_combined=True)
    net, idx = parse_float_from_right(tokens, idx, prefer_combined=True)
    wt_per_pack, idx = parse_float_from_right(tokens, idx, prefer_combined=False)

    if gross is None or net is None or wt_per_pack is None:
        return None

    if idx < 3:
        return None

    boxes_tok = tokens[idx]
    unit_tok = tokens[idx - 1].upper()
    qty_tok = tokens[idx - 2]
    per_pack_tok = tokens[idx - 3]

    boxes = to_float(boxes_tok)
    qty = to_int(qty_tok)
    per_pack = to_int(per_pack_tok)

    if any(v is None for v in [boxes, qty, per_pack]):
        return None

    if unit_tok not in UNITS:
        return None

    description = " ".join(tokens[: idx - 3]).strip()
    if not description:
        return None

    return {
        "description": description,
        "qty": qty,
        "unit": unit_tok,
        "noOfBoxes": boxes,
        "netWeight": net,
        "grossWeight": gross,
        "perPack": per_pack,
        "weightPerPack": wt_per_pack,
    }


def detect_pdf_format(full_text: str) -> str:
    up = full_text.upper()

    # 5431-style
    if "BOX PER PACK" in up or "WEIGHT NET WEIGHT GROSS WEIGHT" in up:
        return "B"

    # 5447-style
    return "A"


def extract_line(raw_line: str, pdf_format: str):
    if pdf_format == "B":
        return extract_line_format_b(raw_line)

    # default A
    normalized = normalize_line(raw_line)
    return extract_line_format_a(normalized)


def extract_pdf(pdf_path: Path):
    with pdfplumber.open(str(pdf_path)) as pdf:
        pages_text = [(p.extract_text() or "") for p in pdf.pages]

    full_text = "\n".join(pages_text).strip()

    if len(full_text) < 20:
        return {
            "ok": False,
            "error": "No text extracted. Likely scanned PDF.",
        }

    pdf_format = detect_pdf_format(full_text)

    items = []
    totals_from_file = None
    rejected_lines = []

    for raw in full_text.splitlines():
        line = normalize_line(raw)
        if not line:
            continue

        if looks_like_header(line) or is_junk_line(line):
            continue

        maybe_total = extract_totals_line(line)
        if maybe_total:
            totals_from_file = maybe_total
            continue

        item = extract_line(raw, pdf_format)
        if item:
            item["fileName"] = pdf_path.name
            items.append(item)
        else:
            rejected_lines.append(line)

    # Exact dedupe only
    seen = set()
    uniq = []
    for it in items:
        key = (
            it.get("description"),
            it.get("qty"),
            it.get("unit"),
            it.get("noOfBoxes"),
            it.get("netWeight"),
            it.get("grossWeight"),
        )
        if key in seen:
            continue
        seen.add(key)
        uniq.append(it)

    calc_total_qty = sum((it.get("qty") or 0) for it in uniq)
    calc_total_net = sum((it.get("netWeight") or 0) for it in uniq)
    calc_total_gross = sum((it.get("grossWeight") or 0) for it in uniq)
    calc_total_boxes = sum((it.get("noOfBoxes") or 0) for it in uniq)

    return {
        "ok": True,
        "fileName": pdf_path.name,
        "detectedFormat": pdf_format,
        "numberOfItemsExtracted": len(uniq),
        "items": uniq,
        "totals": {
            "qty": calc_total_qty,
            "netWeight": round(calc_total_net, 2),
            "grossWeight": round(calc_total_gross, 2),
            "boxes": round(calc_total_boxes, 2),
            "fromFile": totals_from_file,
        },
        "rejectedLines": rejected_lines,
    }


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"ok": False, "error": "No file path provided"}, ensure_ascii=True))
        sys.exit(0)

    path = Path(sys.argv[1])
    if not path.exists():
        print(json.dumps({"ok": False, "error": f"File not found: {path}"}, ensure_ascii=True))
        sys.exit(0)

    result = extract_pdf(path)
    print(json.dumps(result, ensure_ascii=True))


if __name__ == "__main__":
    main()