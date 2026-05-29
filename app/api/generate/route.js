// app/api/generate/route.js
// Central endpoint. POST { problem: <id>, input: <string|number> }.
// Routes to the right handler via the registry. Always returns a JSON body
// the page can render — even when something goes wrong.

import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { handle as handleTwoGood } from "../../../problems/two-good/handler.js";
import { PROBLEM_IDS } from "../../../lib/constants.js";
import { loadFallback } from "../../../lib/loadData.js";

// Force Node runtime — we read files from disk and call the Gemini SDK.
export const runtime = "nodejs";

export async function POST(req) {
  const contentType = req.headers.get("content-type") || "";
  let problem, input, file;

  try {
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      problem = formData.get("problem");
      input = formData.get("input");
      const fileDatas = formData.getAll("files");

      let filesArr = [];
      if (fileDatas && fileDatas.length > 0) {
        // Create workspace temp directory
        const tempDir = path.join(process.cwd(), ".tmp_uploads");
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        
        for (const fileData of fileDatas) {
          if (typeof fileData.arrayBuffer !== "function") continue;
          
          // Save file locally
          const tPath = path.join(tempDir, `${Date.now()}_${fileData.name}`);
          const buffer = Buffer.from(await fileData.arrayBuffer());
          fs.writeFileSync(tPath, buffer);

          filesArr.push({
            name: fileData.name,
            size: fileData.size,
            type: fileData.type,
            tempFilePath: tPath,
          });
        }
        if (filesArr.length > 0) {
          file = filesArr;
        }
      }
    } else {
      const body = await req.json();
      problem = body?.problem;
      input = body?.input;
    }

    if (!problem || !PROBLEM_IDS.includes(problem)) {
      return NextResponse.json(
        { error: `Unknown problem id. Expected one of: ${PROBLEM_IDS.join(", ")}` },
        { status: 400 }
      );
    }
    if (input === undefined || input === null || input === "") {
      return NextResponse.json(
        { error: "Missing input." },
        { status: 400 }
      );
    }

    const handle = handleTwoGood;
    const { isFallback, result } = await handle({ input, file });
    return NextResponse.json({ ok: true, problem, isFallback, result });
  } catch (err) {
    // Last-ditch safety net: even unexpected errors return a usable fallback
    // so the live demo doesn't show an error screen.
    console.error(`[api/generate] ${problem} blew up:`, err);
    let fallback;
    try {
      fallback = loadFallback(problem);
    } catch {
      fallback = {
        narrative:
          "Something went wrong and no fallback was defined. Try again or pick a different problem.",
      };
    }
    return NextResponse.json(
      {
        ok: true,
        problem,
        isFallback: true,
        result: {
          narrative: fallback.narrative,
          metrics: { Error: err?.code || "UNKNOWN" },
          raw: { error: String(err?.message || err) },
        },
      },
      { status: 200 }
    );
  } finally {
    // Clean up temporary local workspace upload
    if (file && Array.isArray(file)) {
      for (const f of file) {
        if (fs.existsSync(f.tempFilePath)) {
          try {
            fs.unlinkSync(f.tempFilePath);
          } catch (e) {
            console.warn(`[api/generate] failed to clean up temp file ${f.tempFilePath}:`, e.message);
          }
        }
      }
    }
  }
}

