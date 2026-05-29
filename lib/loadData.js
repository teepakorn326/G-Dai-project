// lib/loadData.js
// Shared JSON loader. Reads /data/<problemId>.json synchronously at request
// time on the server. Each JSON file is the single source of truth for that
// problem's demo records AND its fallback sample result.

import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");

const _cache = new Map();

/**
 * Load JSON for a given problem id (e.g. "two-good").
 * Cached after the first successful read so repeated handler calls are cheap.
 * @param {string} problemId
 * @returns {object}
 */
export function loadData(problemId) {
  if (!problemId || typeof problemId !== "string") {
    throw new Error("loadData: problemId is required");
  }
  if (_cache.has(problemId)) return _cache.get(problemId);

  const file = path.join(DATA_DIR, `${problemId}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(`loadData: no data file at ${file}`);
  }
  const raw = fs.readFileSync(file, "utf8");
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`loadData: invalid JSON in ${file}: ${e.message}`);
  }
  _cache.set(problemId, parsed);
  return parsed;
}

/**
 * Pull the canned fallback result for a problem if Gemini fails mid-demo.
 * Convention: every data file has a `fallback` object with at least `narrative`.
 */
export function loadFallback(problemId) {
  const data = loadData(problemId);
  return (
    data.fallback || {
      narrative:
        "Demo fallback unavailable — please retry. (No fallback was defined in the data file.)",
    }
  );
}
