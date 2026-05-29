// app/api/export/route.js
import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { exportExcel } from "../../../lib/export_excel.js";

export const runtime = "nodejs";

export async function POST(req) {

  let tempOutPath = null;
  
  try {
    const { clients } = await req.json();
    if (!clients || !Array.isArray(clients)) {
      return NextResponse.json({ error: "Invalid clients data provided." }, { status: 400 });
    }
    
    // Use OS temp directory for Vercel compatibility
    const tempDir = path.join(os.tmpdir(), "gdai_uploads");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const timestamp = Date.now();

    tempOutPath = path.join(tempDir, `${timestamp}_export_output.xlsx`);
    

    
    // Paths for template
    const templatePath = path.join(process.cwd(), "data", "TwoGoodCo-PWI_Client_Tracker.xlsx");
    
    // Execute Native JS script
    exportExcel(clients, templatePath, tempOutPath);
    
    // Read the generated Excel file
    const fileBuffer = fs.readFileSync(tempOutPath);
    
    // Return file as attachment
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=\"TwoGood_Generated_Tracker.xlsx\""
      }
    });

  } catch (err) {
    console.error("[api/export] failed:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to generate Excel file." },
      { status: 500 }
    );
  } finally {
    // Cleanup temporary files
    if (tempOutPath && fs.existsSync(tempOutPath)) {
      try {
        fs.unlinkSync(tempOutPath);
      } catch (e) {
        console.warn(`[api/export] failed to clean up temp file ${tempOutPath}:`, e.message);
      }
    }
  }
}
