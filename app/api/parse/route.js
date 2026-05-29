// app/api/parse/route.js
// Endpoint to parse wellbeing tracker spreadsheets and return client lists for preview.
// POST multipart/form-data { file: <Excel file> }

import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const runtime = "nodejs";

export async function POST(req) {
  let tempFilePaths = [];
  
  try {
    const formData = await req.formData();
    const fileDatas = formData.getAll("files");
    
    if (!fileDatas || fileDatas.length === 0) {
      return NextResponse.json({ error: "No files uploaded." }, { status: 400 });
    }
    
    if (fileDatas.length > 5) {
      return NextResponse.json({ error: "Maximum of 5 files allowed." }, { status: 400 });
    }
    
    // Create temp directory
    const tempDir = path.join(process.cwd(), ".tmp_uploads");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Save files locally
    for (const fileData of fileDatas) {
      if (typeof fileData.arrayBuffer !== "function") continue;
      const tempFilePath = path.join(tempDir, `${Date.now()}_preview_${fileData.name}`);
      const buffer = Buffer.from(await fileData.arrayBuffer());
      fs.writeFileSync(tempFilePath, buffer);
      tempFilePaths.push(tempFilePath);
    }
    
    if (tempFilePaths.length === 0) {
      return NextResponse.json({ error: "Invalid files uploaded." }, { status: 400 });
    }
    
    // Execute Python parser
    const scriptPath = path.join(process.cwd(), "lib", "parse_excel.py");
    const { stdout } = await execFileAsync("python3", [scriptPath, ...tempFilePaths]);
    
    const parsed = JSON.parse(stdout.trim());
    if (parsed.error) {
      throw new Error(parsed.error);
    }
    
    return NextResponse.json({ ok: true, clients: parsed.clients, sheets: parsed.sheets });
  } catch (err) {
    console.error("[api/parse] failed:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to parse spreadsheet file." },
      { status: 500 }
    );
  } finally {
    // Cleanup
    for (const tempFilePath of tempFilePaths) {
      if (fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
        } catch (e) {
          console.warn(`[api/parse] failed to clean up temp file ${tempFilePath}:`, e.message);
        }
      }
    }
  }
}
