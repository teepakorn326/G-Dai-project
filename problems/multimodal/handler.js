// problems/multimodal/handler.js
// 1. Process uploaded file stats (pure-code)
// 2. Upload file to Gemini File API
// 3. Wait/poll if processing is required (e.g. video/audio)
// 4. Generate narrative analysis using the file context and user prompt
// 5. Explicitly clean up file from Gemini storage in finally block

import { loadData, loadFallback } from "../../lib/loadData.js";
import { getFileStats } from "./logic.js";
import { SYSTEM, buildUserPrompt } from "./prompt.js";
import { uploadFile, getFile, deleteFile, genMultimodal } from "../../lib/gemini.js";

export async function handle({ input, file }) {
  if (!file) {
    throw new Error("A file must be uploaded for analysis.");
  }
  
  const stats = getFileStats(file);
  const data = loadData("multimodal");
  
  let narrative;
  let isFallback = false;
  let uploadResult = null;
  
  try {
    console.log(`[multimodal] Uploading local temp file to Gemini: ${file.name}`);
    uploadResult = await uploadFile(file.tempFilePath, file.type);
    
    // Poll for status if it's processing
    let fileState = uploadResult;
    let pollCount = 0;
    while (fileState.state === "PROCESSING") {
      pollCount++;
      if (pollCount > 30) {
        throw new Error("Gemini file processing timed out.");
      }
      console.log(`[multimodal] File processing... waiting 2s (poll #${pollCount})`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      fileState = await getFile(uploadResult.name);
    }
    
    if (fileState.state === "FAILED") {
      throw new Error("Gemini File API processing state failed.");
    }
    
    console.log(`[multimodal] File active. Sending prompt analysis request to Gemini.`);
    const userPrompt = buildUserPrompt(input, stats);
    narrative = await genMultimodal(
      SYSTEM,
      userPrompt,
      uploadResult.uri,
      uploadResult.mimeType,
      false // Use gemini-2.5-flash for speed
    );
    
  } catch (err) {
    console.warn("[multimodal] processing failed, using fallback:", err);
    if (err.cause) {
      console.warn("[multimodal] error cause:", err.cause);
    }
    const fb = loadFallback("multimodal");
    narrative = fb.narrative;
    isFallback = true;
  } finally {
    // Delete file from Gemini storage to keep it clean
    if (uploadResult && uploadResult.name) {
      console.log(`[multimodal] Cleaning up Gemini file resource: ${uploadResult.name}`);
      await deleteFile(uploadResult.name);
    }
  }
  
  const metrics = {
    "File name": stats.filename,
    "File type": stats.category,
    "File size": stats.formattedSize,
  };
  
  return {
    isFallback,
    result: {
      narrative,
      metrics,
      raw: { fileStats: stats },
    },
  };
}
