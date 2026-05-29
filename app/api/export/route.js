// app/api/export/route.js
import { NextResponse } from "next/server";
import path from "node:path";
import { exportExcel } from "../../../lib/export_excel.js";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { clients, generatedAt } = await req.json();
    if (!clients || !Array.isArray(clients)) {
      return NextResponse.json({ error: "Invalid clients data provided." }, { status: 400 });
    }

    const templatePath = path.join(process.cwd(), "data", "TwoGoodCo-PWI_Client_Tracker.xlsx");

    // Fill the styled template in memory and return the workbook directly.
    const fileBuffer = await exportExcel(clients, templatePath, generatedAt);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=\"TwoGood_Generated_Tracker.xlsx\"",
      },
    });
  } catch (err) {
    console.error("[api/export] failed:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to generate Excel file." },
      { status: 500 }
    );
  }
}
