import sys
import json
import re
from pathlib import Path
import pdfplumber

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass


def clean_text(s: str) -> str:
    s = s or ""
    s = s.replace("\xa0", " ")
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r"\r\n?", "\n", s)
    s = re.sub(r"\n+", "\n", s)
    return s.strip()


def normalize_for_multiline_search(text: str) -> str:
    text = text or ""
    text = text.replace("\xa0", " ")
    text = re.sub(r"[ \t]+", " ", text)
    return text


def find_first(patterns, text, flags=re.IGNORECASE):
    for p in patterns:
        m = re.search(p, text, flags)
        if m:
            val = m.group(1).strip()
            val = re.sub(r"\s+", " ", val)
            return val
    return ""


def normalize_un(val: str) -> str:
    val = (val or "").strip().upper()
    if not val:
        return ""
    digits = re.sub(r"[^0-9]", "", val)
    if digits:
        return f"UN {digits}"
    return val


def normalize_class(val: str) -> str:
    return re.sub(r"\s+", " ", (val or "").strip())


def normalize_pg(val: str) -> str:
    val = (val or "").strip().upper()
    val = re.sub(r"\s+", " ", val)
    val = (
        val.replace("PACKING GROUP", "")
        .replace("PACKING NUMBER", "")
        .replace("PG", "")
        .strip(": ")
        .strip()
    )

    mapping = {
        "1": "I",
        "2": "II",
        "3": "III",
    }
    return mapping.get(val, val)


def normalize_flash(val: str) -> str:
    val = re.sub(r"\s+", " ", (val or "").strip())
    val = re.sub(r"\b(AUTO[- ]?IGNITION.*)$", "", val, flags=re.IGNORECASE).strip()
    val = re.sub(r"\b(NOT AVAILABLE.*)$", "", val, flags=re.IGNORECASE).strip()
    return val


def normalize_yes_no(val: str) -> str:
    v = (val or "").strip().upper()
    if not v:
        return ""
    if any(x in v for x in ["YES", "Y", "TRUE"]):
        return "Yes"
    if any(
        x in v
        for x in [
            "NO",
            "N",
            "FALSE",
            "NOT MARINE POLLUTANT",
            "NON-MARINE POLLUTANT",
            "NOT APPLICABLE",
            "NONE",
        ]
    ):
        return "No"
    return val.strip()


def extract_product_name(text: str, file_name: str) -> str:
    patterns = [
        r"Product\s*(?:identifier|name)?\s*[:\-]\s*(.+)",
        r"Trade\s*name\s*[:\-]\s*(.+)",
        r"Material\s*name\s*[:\-]\s*(.+)",
        r"Substance\s*name\s*[:\-]\s*(.+)",
        r"Product\s*Code\s*[:\-]\s*(.+)",
    ]
    val = find_first(patterns, text)
    if val:
        return val

    lines = [x.strip() for x in text.splitlines() if x.strip()]
    for line in lines[:25]:
        up = line.upper()
        if any(
            skip in up
            for skip in [
                "SAFETY DATA SHEET",
                "MATERIAL SAFETY DATA SHEET",
                "SECTION 1",
                "IDENTIFICATION",
                "PRODUCT IDENTIFIER",
                "PRODUCT NAME",
            ]
        ):
            continue
        if len(line) >= 4:
            return line
    return Path(file_name).stem


def extract_flash_point(text: str) -> str:
    patterns = [
        r"\bFlash\s*Point\s*[:\-]?\s*([^\n]+)",
        r"\bFlashpoint\s*[:\-]?\s*([^\n]+)",
    ]
    val = find_first(patterns, text)
    if val:
        return normalize_flash(val)

    m = re.search(
        r"Flash\s*Point.*?(\-?\d+(?:\.\d+)?\s*(?:°\s*[CF]|o\s*[CF]|DEG(?:REES)?\s*[CF]|[CF]))",
        text,
        re.IGNORECASE | re.DOTALL,
    )
    if m:
        return normalize_flash(m.group(1))
    return ""


def extract_ems(text: str) -> str:
    patterns = [
        r"\bEMS\s*[:\-]?\s*([A-Z]\-[A-Z]\s*,\s*S\-[A-Z0-9]+)",
        r"\bEmS\s*No\.?\s*[:\-]?\s*([A-Z]\-[A-Z]\s*,\s*S\-[A-Z0-9]+)",
        r"\b(F\-[A-Z]\s*,\s*S\-[A-Z0-9]+)\b",
    ]
    val = find_first(patterns, text, flags=re.IGNORECASE)
    if val:
        return re.sub(r"\s+", " ", val.strip())

    m = re.search(r"\b(F\-[A-Z]\s*,\s*S\-[A-Z0-9]+)\b", text, re.IGNORECASE)
    return m.group(1).strip() if m else ""


def extract_packing_group(text: str) -> str:
    text_n = normalize_for_multiline_search(text)

    patterns = [
        r"Packing\s*Group\s*[:\-]?\s*(I{1,3}|[1-3])\b",
        r"Packing\s*Number\s*[:\-]?\s*(I{1,3}|[1-3])\b",
        r"\bPG\s*[:\-]?\s*(I{1,3}|[1-3])\b",
        r"IMDG\s*Packing\s*Group\s*[:\-]?\s*(I{1,3}|[1-3])\b",
        r"IMDG\s*Packing\s*Number\s*[:\-]?\s*(I{1,3}|[1-3])\b",
        r"Transport\s*packing\s*group\s*[:\-]?\s*(I{1,3}|[1-3])\b",
        r"Transport\s*packing\s*number\s*[:\-]?\s*(I{1,3}|[1-3])\b",

        # value on next line
        r"Packing\s*Group\s*[:\-]?\s*\n\s*(I{1,3}|[1-3])\b",
        r"Packing\s*Number\s*[:\-]?\s*\n\s*(I{1,3}|[1-3])\b",
        r"\bPG\s*[:\-]?\s*\n\s*(I{1,3}|[1-3])\b",

        # combined transport block
        r"UN\s*\d{3,4}.*?Transport\s*Hazard\s*Class\s*[:\-]?\s*[0-9A-Za-z\.\-]+.*?Packing\s*(?:Group|Number)\s*[:\-]?\s*(I{1,3}|[1-3])\b",
        r"UN\s*\d{3,4}.*?Class\s*[:\-]?\s*[0-9A-Za-z\.\-]+.*?Packing\s*(?:Group|Number)\s*[:\-]?\s*(I{1,3}|[1-3])\b",
        r"Proper\s*Shipping\s*Name.*?UN\s*\d{3,4}.*?Packing\s*(?:Group|Number)\s*[:\-]?\s*(I{1,3}|[1-3])\b",
    ]

    for p in patterns:
        m = re.search(p, text_n, re.IGNORECASE | re.DOTALL)
        if m:
            return normalize_pg(m.group(1))

    # fallback: transport line like "UN1993 FLAMMABLE LIQUID..., 3, III"
    m = re.search(
        r"UN\s*\d{3,4}.*?(?:,|\s)(I{1,3}|[1-3])\b",
        text_n,
        re.IGNORECASE | re.DOTALL,
    )
    if m:
        return normalize_pg(m.group(1))

    return ""


def extract_proper_shipping_name(text: str) -> str:
    patterns = [
        r"\bUN\s*Proper\s*Shipping\s*Name\s*[:\-]?\s*([^\n]+)",
        r"\bProper\s*Shipping\s*Name\s*[:\-]?\s*([^\n]+)",
        r"\bShipping\s*Name\s*[:\-]?\s*([^\n]+)",
    ]
    val = find_first(patterns, text)
    if val:
        return val

    m = re.search(
        r"UN\s*\d{3,4}\s*[-,:]?\s*([A-Z0-9 ,\.\-\(\)/]+?)\s*(?:Transport\s*Hazard\s*Class|Class|Packing\s*Group|Packing\s*Number|PG|EMS|Marine\s*Pollutant|\n)",
        text,
        re.IGNORECASE | re.DOTALL,
    )
    if m:
        return re.sub(r"\s+", " ", m.group(1).strip(" ,.-"))
    return ""


def extract_technical_name(text: str) -> str:
    patterns = [
        r"\bTechnical\s*Name\s*[:\-]?\s*([^\n]+)",
    ]
    return find_first(patterns, text)


def extract_marine_pollutant(text: str) -> str:
    patterns = [
        r"\bMarine\s*Pollutant\s*[:\-]?\s*([^\n]+)",
        r"\bMarine\s*pollutant\s*[:\-]?\s*([^\n]+)",
        r"\bEnvironmentally\s*hazardous\s*substance\s*[:\-]?\s*([^\n]+)",
    ]
    val = find_first(patterns, text)
    if val:
        return normalize_yes_no(val)

    if re.search(r"\bmarine\s*pollutant\b", text, re.IGNORECASE):
        return "Yes"
    if re.search(r"\bnot\s*marine\s*pollutant\b", text, re.IGNORECASE):
        return "No"
    return ""


def extract_msds_fields(text: str, file_name: str):
    text = clean_text(text)
    text_n = normalize_for_multiline_search(text)

    product = extract_product_name(text, file_name)

    un_number = find_first(
        [
            r"\bUN\s*No\.?\s*[:\-]?\s*(\d{3,4})",
            r"\bUN\s*Number\s*[:\-]?\s*(\d{3,4})",
            r"\bUN\s*[:\-]?\s*(\d{3,4})",
            r"\bUN\s*(\d{3,4})\b",
        ],
        text_n,
    )
    un_number = normalize_un(un_number)

    hazard_class = find_first(
        [
            r"\bTransport\s*Hazard\s*Class\s*[:\-]?\s*([0-9][0-9A-Za-z\.\-]*)",
            r"\bHazard\s*Class\s*[:\-]?\s*([0-9][0-9A-Za-z\.\-]*)",
            r"\bIMDG\s*Class\s*[:\-]?\s*([0-9][0-9A-Za-z\.\-]*)",
            r"\bClass\s*[:\-]?\s*([0-9][0-9A-Za-z\.\-]*)",
        ],
        text_n,
    )
    hazard_class = normalize_class(hazard_class)

    pg = extract_packing_group(text_n)
    flash_point = extract_flash_point(text_n)
    marine_pollutant = extract_marine_pollutant(text_n)
    ems = extract_ems(text_n)
    proper_shipping_name = extract_proper_shipping_name(text_n)
    technical_name = extract_technical_name(text_n)

    return {
        "product": product,
        "unNumber": un_number,
        "classNumber": hazard_class,
        "packingGroup": pg,
        "flashPoint": flash_point,
        "marinePollutant": marine_pollutant,
        "ems": ems,
        "properShippingName": proper_shipping_name,
        "technicalName": technical_name,
        "fileName": file_name,
    }


def extract_pdf(pdf_path: Path):
    texts = []
    with pdfplumber.open(str(pdf_path)) as pdf:
        for page in pdf.pages:
            texts.append(page.extract_text() or "")
    full_text = "\n".join(texts).strip()

    if len(full_text) < 20:
        return {
            "ok": False,
            "error": f"No readable text found in {pdf_path.name}. If this is scanned, OCR is needed.",
        }

    item = extract_msds_fields(full_text, pdf_path.name)
    return {
        "ok": True,
        "fileName": pdf_path.name,
        "item": item,
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