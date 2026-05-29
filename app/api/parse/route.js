// app/api/parse/route.js
// Endpoint to parse wellbeing tracker spreadsheets and return client lists for preview.
// POST multipart/form-data { file: <Excel file> }

import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { parseFiles } from "../../../lib/parse_excel.js";

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
    
    // Use OS temp directory for Vercel compatibility
    const tempDir = path.join(os.tmpdir(), "gdai_uploads");
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
    
    // Execute Native JS parser
    const parsed = parseFiles(tempFilePaths);
    
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
