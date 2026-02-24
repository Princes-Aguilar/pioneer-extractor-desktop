import sys
import json
import re
from pathlib import Path

import pdfplumber

NUM_RE = re.compile(r"^-?\d{1,3}(?:,\d{3})*(?:\.\d+)?$|^-?\d+(?:\.\d+)?$")
INT_RE = re.compile(r"^\d{1,3}(?:,\d{3})*$|^\d+$")

def is_num(t: str) -> bool:
    return bool(NUM_RE.match(t))

def is_int(t: str) -> bool:
    return bool(INT_RE.match(t))

def to_num(t: str):
    try:
        return float(t.replace(",", ""))
    except Exception:
        return None

def normalize_line(s: str) -> str:
    s = (s or "").replace("\xa0", " ").strip()

    # Fix common broken tokens:
    # "1 ,140.48" -> "1,140.48"
    s = re.sub(r"(\d)\s+,(\d)", r"\1,\2", s)

    # "3 6.00" -> "36.00", "4 03.20" -> "403.20"
    s = re.sub(r"(\d)\s+(\d{1,3}\.\d+)", r"\1\2", s)

    s = re.sub(r"\s+", " ", s).strip()
    return s

def parse_item_line(text_line: str):
    """
    Robustly find the columns even if description contains numbers like:
    - "WATER-TITE 401 PU PLUS 20KG PAIL ..."
    We search for a position i where:
      tokens[i]   = boxes (int)
      tokens[i+1] = qty   (int)
      tokens[i+2] = unit  (letters)
    """
    s = normalize_line(text_line)
    toks = s.split(" ")
    if len(toks) < 7:
        return None, None

    # Skip obvious headers/totals
    low = s.lower()
    if low.startswith("description") or low.startswith("qty") or low.startswith("total"):
        return None, None

    for i in range(1, len(toks) - 3):
        boxes = toks[i]
        qty = toks[i + 1]
        unit = toks[i + 2]

        if not is_int(boxes):
            continue
        if not is_int(qty):
            continue
        if not unit.isalpha():
            continue

        desc = " ".join(toks[:i]).strip()
        if len(desc) < 3:
            continue

        rest = toks[i + 3:]
        nums = [to_num(t) for t in rest if is_num(t)]
        nums = [n for n in nums if n is not None]

        if len(nums) >= 2:
            net = nums[-2]
            gross = nums[-1]
            return {
                "description": desc,
                "noOfBoxes": int(boxes.replace(",", "")),
                "qty": int(qty.replace(",", "")),
                "netWeight": net,
                "grossWeight": gross,
            }, None

        # Some lines don’t include net/gross inline; those weights appear in a separate cell.
        return {
            "description": desc,
            "noOfBoxes": int(boxes.replace(",", "")),
            "qty": int(qty.replace(",", "")),
            "netWeight": None,
            "grossWeight": None,
        }, "needs_weights"

    return None, None

def parse_weights_cell(cell_text: str):
    s = normalize_line(cell_text)
    toks = s.split(" ")
    nums = [to_num(t) for t in toks if is_num(t)]
    nums = [n for n in nums if n is not None]
    # returns list like [net1, gross1, net2, gross2, ...] if present
    return nums

def extract(pdf_path: str):
    pdf_path = Path(pdf_path)
    items = []
    queue = []  # items missing net/gross; to be filled from separate weights cells

    with pdfplumber.open(str(pdf_path)) as pdf:
        # Your file is 1 page, but we support multiple pages
        for page in pdf.pages:
            tables = page.extract_tables()
            if not tables:
                continue

            # Use the largest table (usually the item table)
            table = max(tables, key=lambda t: len(t))

            for row in table:
                c0 = (row[0] or "").strip()
                c2 = (row[2] or "").strip()

                # Column 0 may contain one or multiple item lines separated by newline
                if c0:
                    low = c0.lower()
                    if low.startswith("qty") or "description/size" in low or low.startswith("box box"):
                        continue

                    parts = str(c0).split("\n")
                    for p in parts:
                        p = p.strip()
                        if not p:
                            continue

                        it, flag = parse_item_line(p)
                        if it:
                            it["fileName"] = pdf_path.name
                            if it["netWeight"] is None:
                                queue.append(it)
                            else:
                                items.append(it)

                # Column 2 sometimes contains weights for queued items
                if c2:
                    nums = parse_weights_cell(c2)
                    while len(nums) >= 2 and queue:
                        net = nums.pop(0)
                        gross = nums.pop(0)
                        it = queue.pop(0)
                        it["netWeight"] = net
                        it["grossWeight"] = gross
                        items.append(it)

    return {
        "ok": True,
        "fileName": pdf_path.name,
        "items": items
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"ok": False, "error": "Missing PDF path argument"}))
        sys.exit(1)

    try:
        result = extract(sys.argv[1])
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"ok": False, "error": str(e)}))
        sys.exit(1)