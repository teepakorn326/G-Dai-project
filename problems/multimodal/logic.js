// problems/multimodal/logic.js
// Pure code logic for the Multimodal File Analyzer.
// Computes descriptive metadata for files. No AI.

/**
 * Format file size into a human-readable string.
 * @param {number} bytes
 * @returns {string}
 */
export function formatSize(bytes) {
  const num = Number(bytes);
  if (!Number.isFinite(num) || num <= 0) return "0 Bytes";
  
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(num) / Math.log(k));
  
  return `${parseFloat((num / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Categorize the file type by its MIME type and extension.
 * @param {string} filename
 * @param {string} mimeType
 * @returns {string}
 */
export function classifyFileType(filename, mimeType = "") {
  const ext = String(filename).split(".").pop().toLowerCase();
  const mime = String(mimeType).toLowerCase();
  
  if (mime.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) {
    return "Image File";
  }
  if (mime.startsWith("video/") || ["mp4", "mov", "avi", "mkv", "webm"].includes(ext)) {
    return "Video File";
  }
  if (mime.startsWith("audio/") || ["mp3", "wav", "m4a", "ogg", "aac", "flac"].includes(ext)) {
    return "Audio Recording";
  }
  if (mime === "application/pdf" || ext === "pdf") {
    return "PDF Document";
  }
  if (
    ["xlsx", "xls", "csv", "ods"].includes(ext) ||
    mime.includes("spreadsheet") ||
    mime.includes("csv") ||
    mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    return "Excel / CSV Spreadsheet";
  }
  if (mime.startsWith("text/") || ["txt", "md", "json", "xml"].includes(ext)) {
    return "Text Document";
  }
  
  return "Document / File";
}

/**
 * Get file stats.
 * @param {{ name: string, size: number, type: string }} fileDetails
 * @returns {{
 *   filename: string,
 *   formattedSize: string,
 *   category: string,
 *   rawBytes: number
 * }}
 */
export function getFileStats(fileDetails) {
  if (!fileDetails || !fileDetails.name) {
    throw new Error("Invalid file details provided.");
  }
  return {
    filename: fileDetails.name,
    formattedSize: formatSize(fileDetails.size),
    category: classifyFileType(fileDetails.name, fileDetails.type),
    rawBytes: fileDetails.size,
  };
}
