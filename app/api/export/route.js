// app/api/export/route.js
import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
export const runtime = "nodejs";

export async function POST(req) {
  let tempJsonPath = null;
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
    tempJsonPath = path.join(tempDir, `${timestamp}_export_input.json`);
    tempOutPath = path.join(tempDir, `${timestamp}_export_output.xlsx`);
    
    // Write JSON payload to temp file
    fs.writeFileSync(tempJsonPath, JSON.stringify(clients));
    
    // Paths for python script
    const scriptPath = path.join(process.cwd(), "lib", "export_excel.py");
    const templatePath = path.join(process.cwd(), "data", "TwoGoodCo-PWI_Client_Tracker.xlsx");
    
    // Execute Python script
    const { stdout } = await execFileAsync("python3", [scriptPath, tempJsonPath, templatePath, tempOutPath]);
    
    const parsed = JSON.parse(stdout.trim());
    if (parsed.error) {
      throw new Error(parsed.error);
    }
    
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
    [tempJsonPath, tempOutPath].forEach(p => {
      if (p && fs.existsSync(p)) {
        try {
          fs.unlinkSync(p);
        } catch (e) {
          console.warn(`[api/export] failed to clean up temp file ${p}:`, e.message);
        }
      }
    });
  }
}
