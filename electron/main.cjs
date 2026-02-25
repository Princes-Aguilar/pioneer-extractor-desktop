const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

// pdf-parse import (handles both CJS and ESM shapes)
const pdfParse = require("pdf-parse");
console.log("pdfParse type:", typeof pdfParse);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 700,
    backgroundColor: "#0b0b0b",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173";
  const indexPath = path.join(__dirname, "..", "dist", "index.html");

  if (!app.isPackaged) {
    mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(indexPath);
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ---------- IPC: Open PDF Dialog ----------
ipcMain.handle("dialog:openPdf", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "PDF", extensions: ["pdf"] }],
  });

  if (result.canceled) return null;
  return result.filePaths[0];
});

// ---------- IPC: Extract PDF ----------
ipcMain.handle("pdf:extract", async (_event, filePath) => {
  try {
    if (!filePath) throw new Error("No filePath received.");

    const pythonCmd = process.platform === "win32" ? "python" : "python3";
    const scriptPath = path.join(
      __dirname,
      "..",
      "python",
      "extract_packing_list.py",
    );

    const result = await runPythonJson(pythonCmd, scriptPath, [filePath]);

    if (!result?.ok) {
      return { ok: false, error: result?.error || "Python extraction failed." };
    }

    return result;
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
});

ipcMain.handle("dialog:openXlsx", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "Excel", extensions: ["xlsx"] }],
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

ipcMain.handle("xlsx:extract", async (_event, filePath) => {
  try {
    if (!filePath) throw new Error("No filePath received.");

    const pythonCmd = process.platform === "win32" ? "python" : "python3";
    const scriptPath = path.join(
      __dirname,
      "..",
      "python",
      "extract_packinglist_xlsx.py",
    );

    const result = await runPythonJson(pythonCmd, scriptPath, [filePath]);

    if (!result?.ok)
      return { ok: false, error: result?.error || "XLSX extraction failed." };
    return result;
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
});

function runPythonJson(pythonCmd, scriptPath, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(pythonCmd, [scriptPath, ...args], { windowsHide: true });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));

    proc.on("close", (code) => {
      try {
        const parsed = JSON.parse(stdout || "{}");
        if (!parsed.ok && stderr) parsed.error = parsed.error || stderr;
        resolve(parsed);
      } catch (e) {
        reject(
          new Error(
            `Python did not return JSON (code=${code}). stderr=${stderr}\nstdout=${stdout}`,
          ),
        );
      }
    });
  });
}

function runPython(pythonCmd, scriptPath, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(pythonCmd, [scriptPath, ...args], { windowsHide: true });

    let out = "";
    let err = "";

    proc.stdout.on("data", (d) => (out += d.toString()));
    proc.stderr.on("data", (d) => (err += d.toString()));

    proc.on("close", (code) => {
      try {
        const parsed = JSON.parse(out || "{}");
        if (!parsed.ok && err) parsed.error = parsed.error || err;
        resolve(parsed);
      } catch (e) {
        reject(
          new Error(
            `Python output not JSON. code=${code}. stderr=${err}. stdout=${out}`,
          ),
        );
      }
    });
  });
}

// ---------------- helpers ----------------

function normalizePdfText(text) {
  return (
    String(text)
      // Fix glued letter+digit and digit+letter like "1L5.65" -> "1L 5.65"
      .replace(/([A-Za-z])(\d)/g, "$1 $2")
      .replace(/(\d)([A-Za-z])/g, "$1 $2")
      // Clean excessive spaces
      .replace(/[ \t]+/g, " ")
      .trim()
  );
}

// Strategy A: Proforma invoice type table:
// "2000 PC CODE PRODUCT NAME 0.19 375.62"
function parseQtyUnitCodeRows(lines) {
  const headerIdx = findHeaderIndex(lines, [
    "Qty Unit Product Code",
    "Qty Unit Product",
    "Qty Unit",
  ]);

  const start = headerIdx >= 0 ? headerIdx + 1 : 0;

  const out = [];
  let i = start;

  while (i < lines.length) {
    const line = lines[i];

    // Start of item row: qty + unit + product code
    const startMatch = line.match(
      /^(\d{1,3}(?:,\d{3})*|\d+)\s+([A-Z]{1,5})\s+([A-Z0-9]{4,})\s+(.+)$/,
    );

    if (!startMatch) {
      i++;
      continue;
    }

    // Accumulate wrapped lines until we see "... <unitPrice> <netAmount>" at the end
    let full = line;
    let j = i;

    while (j + 1 < lines.length && !hasTrailingTwoNumbers(full)) {
      // Stop if next line looks like a new item
      const next = lines[j + 1];
      if (
        next.match(
          /^(\d{1,3}(?:,\d{3})*|\d+)\s+([A-Z]{1,5})\s+([A-Z0-9]{4,})\s+/,
        )
      ) {
        break;
      }
      full = `${full} ${next}`;
      j++;
    }

    // Now try to parse from tokens (more reliable than strict regex)
    const tokens = full.split(" ").filter(Boolean);
    if (tokens.length >= 6) {
      const qty = parseInt(tokens[0].replace(/,/g, ""), 10);
      const unit = tokens[1];
      const code = tokens[2];

      // last two tokens are typically: unitPrice + netAmount
      const unitPrice = tokens[tokens.length - 2];
      const netAmount = tokens[tokens.length - 1];

      // everything between code and price is description
      const description = tokens
        .slice(3, tokens.length - 2)
        .join(" ")
        .trim();

      // Only push if description looks real
      if (description.length >= 3) {
        out.push({
          description,
          qty,
          // if you later want these:
          unit,
          code,
          unitPrice,
          netAmount,
        });
      }
    }

    i = j + 1;
  }

  return out.length ? out : null;
}

function parsePackingListRows(lines, fileName) {
  const out = [];

  for (const line of lines) {
    // Must contain at least: description + box + qty + unit + some numbers
    // Example:
    // "MIGHTY BOND 3G FLAG TYPE 40 2,000 PC 50.00 0.72 36.00 40.5625"

    const tokens = line.split(/\s+/).filter(Boolean);
    if (tokens.length < 7) continue;

    // Find the first numeric token => everything before it is description
    const firstNumIdx = tokens.findIndex((t) => isNumberToken(t));
    if (firstNumIdx <= 0) continue;

    const description = tokens.slice(0, firstNumIdx).join(" ").trim();

    const boxToken = tokens[firstNumIdx];
    const qtyToken = tokens[firstNumIdx + 1];
    const unitToken = tokens[firstNumIdx + 2];

    if (!isIntegerToken(boxToken)) continue;
    if (!isNumberToken(qtyToken)) continue;
    if (!/^[A-Za-z]+$/.test(unitToken)) continue;

    const noOfBoxes = parseInt(boxToken.replace(/,/g, ""), 10);
    const qty = parseInt(qtyToken.replace(/,/g, ""), 10);

    // Remaining tokens after UNIT should include numeric values
    const rest = tokens.slice(firstNumIdx + 3);

    // Extract numeric tokens from the end — your PDF ends with "... NET GROSS"
    const numericRest = rest
      .filter((t) => isNumberToken(t))
      .map((t) => toNumber(t));

    // Need at least 2 numbers for net + gross
    if (numericRest.length < 2) continue;

    const netWeight = numericRest[numericRest.length - 2];
    const grossWeight = numericRest[numericRest.length - 1];

    out.push({
      description,
      qty,
      noOfBoxes,
      netWeight,
      grossWeight,
      fileName,
    });
  }

  return out;
}

function isNumberToken(t) {
  return (
    /^-?\d{1,3}(?:,\d{3})*(?:\.\d+)?$/.test(t) || /^-?\d+(?:\.\d+)?$/.test(t)
  );
}

function isIntegerToken(t) {
  return /^\d{1,3}(?:,\d{3})*$/.test(t) || /^\d+$/.test(t);
}

function toNumber(t) {
  const cleaned = t.replace(/,/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

// Strategy B: Packing list with wide-spaced columns:
// "DESCRIPTION    10    2    12.5    13.2"
function parsePackingListWideSpaceRows(lines) {
  const headerIdx = findHeaderIndex(lines, ["Description", "DESCRIPTION"]);

  const start = headerIdx >= 0 ? headerIdx + 1 : 0;

  const out = [];

  for (let i = start; i < lines.length; i++) {
    const line = lines[i];

    // Require multiple spaces between columns to avoid false matches
    const m = line.match(
      /^(.*?)\s{2,}(\d+(?:\.\d+)?)\s{2,}(\d+)\s{2,}([\d,]+(?:\.\d+)?)\s{2,}([\d,]+(?:\.\d+)?)$/,
    );

    if (!m) continue;

    const description = m[1].trim();
    const qty = Number(m[2]);
    const noOfBoxes = Number(m[3]);
    const netWeight = m[4];
    const grossWeight = m[5];

    if (description) {
      out.push({ description, qty, noOfBoxes, netWeight, grossWeight });
    }
  }

  return out.length ? out : null;
}

function hasTrailingTwoNumbers(str) {
  // Checks if line ends with "... <number> <number/with commas>"
  return /(\d+(?:\.\d+)?)\s+([\d,]+(?:\.\d+)?)$/.test(str);
}

function findHeaderIndex(lines, headerSnippets) {
  const lower = lines.map((l) => l.toLowerCase());
  for (let i = 0; i < lower.length; i++) {
    for (const h of headerSnippets) {
      if (lower[i].includes(h.toLowerCase())) return i;
    }
  }
  return -1;
}

function extractNumberNear(text, keywords) {
  const lower = text.toLowerCase();
  for (const k of keywords) {
    const idx = lower.indexOf(k.toLowerCase());
    if (idx >= 0) {
      const slice = text.slice(idx, idx + 120);
      const m = slice.match(/(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)/);
      if (m) return m[1];
    }
  }
  return null;
}

function extractWeight(text, keywords) {
  // tries to capture "NET WEIGHT: 123.45 KG" OR "NET WT 123.45"
  const lower = text.toLowerCase();
  for (const k of keywords) {
    const idx = lower.indexOf(k.toLowerCase());
    if (idx >= 0) {
      const slice = text.slice(idx, idx + 160);
      const m = slice.match(
        /(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)(\s*(kg|kgs|lb|lbs))?/i,
      );
      if (m) return (m[1] + (m[2] ? m[2].toUpperCase() : "")).trim();
    }
  }
  return null;
}

function extractNumberNear(text, keywords) {
  const lower = text.toLowerCase();
  for (const k of keywords) {
    const idx = lower.indexOf(k);
    if (idx >= 0) {
      const slice = text.slice(idx, idx + 100);
      const m = slice.match(/(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)/);
      if (m) return m[1];
    }
  }
  return null;
}
