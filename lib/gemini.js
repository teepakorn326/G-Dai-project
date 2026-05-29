// lib/gemini.js
// Shared Gemini client. The only file in the app that imports @google/genai.
// Reads GOOGLE_API_KEY from process.env — never hardcoded.

import { GoogleGenAI } from "@google/genai";
import { MODEL_DEFAULT, MODEL_COMPLEX } from "./constants.js";

let _client = null;

function getClient() {
  if (_client) return _client;
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GOOGLE_API_KEY is not set. Add it to .env.local (see .env.local.example)."
    );
  }
  _client = new GoogleGenAI({ apiKey });
  return _client;
}

/**
 * gen(system, user)
 * Always uses the complex (pro) model — see MODEL_COMPLEX.
 * @param {string} system  - System / instruction prompt.
 * @param {string} user    - User prompt (already-built string).
 * @returns {Promise<string>} The model's text response.
 *
 * Errors bubble up as Error with a `.code` and `.status` where possible so the
 * caller (handler / API route) can show the user a friendly fallback.
 */
export async function gen(system, user) {
  const model = MODEL_COMPLEX;
  const client = getClient();

  try {
    const response = await client.models.generateContent({
      model,
      contents: user,
      config: {
        systemInstruction: system,
        // Keep outputs tight for a live demo. The complex model reasons before
        // answering, so leave generous headroom or the JSON output gets cut off.
        temperature: 0.6,
        maxOutputTokens: 4096,
      },
    });

    // The new SDK exposes `.text` as a convenience getter.
    const text = response?.text ?? "";
    if (!text || !text.trim()) {
      const err = new Error("Empty response from Gemini.");
      err.code = "EMPTY_RESPONSE";
      throw err;
    }
    return text.trim();
  } catch (err) {
    // Normalise common errors so callers can decide what to do.
    const status =
      err?.status ||
      err?.response?.status ||
      (typeof err?.message === "string" && err.message.includes("429")
        ? 429
        : undefined);

    if (status === 429) {
      const e = new Error(
        "Gemini rate limit hit (429). Backing off — using fallback for this demo."
      );
      e.code = "RATE_LIMITED";
      e.status = 429;
      throw e;
    }
    if (status === 401 || status === 403) {
      const e = new Error("Gemini auth failed — check GOOGLE_API_KEY.");
      e.code = "AUTH_FAILED";
      e.status = status;
      throw e;
    }
    // Re-wrap so the original message is preserved but typed.
    const e = new Error(err?.message || "Gemini call failed.");
    e.code = err?.code || "GEMINI_ERROR";
    e.status = status;
    throw e;
  }
}

/**
 * uploadFile(tempFilePath, mimeType)
 * Uploads a local file to Gemini File API.
 */
export async function uploadFile(tempFilePath, mimeType) {
  const client = getClient();
  const file = await client.files.upload({
    file: tempFilePath,
    mimeType,
  });
  return file;
}

/**
 * getFile(name)
 * Gets metadata of an uploaded file.
 */
export async function getFile(name) {
  const client = getClient();
  return await client.files.get({ name });
}

/**
 * deleteFile(name)
 * Deletes a file from Gemini storage.
 */
export async function deleteFile(name) {
  const client = getClient();
  try {
    await client.files.delete({ name });
  } catch (err) {
    console.warn(`Failed to delete file ${name} from Gemini:`, err.message);
  }
}

/**
 * genMultimodal(system, userPrompt, fileUri, mimeType, complex)
 * Multimodal content generation.
 */
export async function genMultimodal(system, userPrompt, fileUri, mimeType, complex = false) {
  const model = complex ? MODEL_COMPLEX : MODEL_DEFAULT;
  const client = getClient();

  try {
    const response = await client.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [
            { text: userPrompt },
            { fileData: { fileUri, mimeType } }
          ],
        },
      ],
      config: {
        systemInstruction: system,
        temperature: 0.4,
        maxOutputTokens: 1500,
      },
    });

    const text = response?.text ?? "";
    if (!text || !text.trim()) {
      const err = new Error("Empty response from Gemini.");
      err.code = "EMPTY_RESPONSE";
      throw err;
    }
    return text.trim();
  } catch (err) {
    const status =
      err?.status ||
      err?.response?.status ||
      (typeof err?.message === "string" && err.message.includes("429")
        ? 429
        : undefined);

    if (status === 429) {
      const e = new Error(
        "Gemini rate limit hit (429). Backing off — using fallback for this demo."
      );
      e.code = "RATE_LIMITED";
      e.status = 429;
      throw e;
    }
    if (status === 401 || status === 403) {
      const e = new Error("Gemini auth failed — check GOOGLE_API_KEY.");
      e.code = "AUTH_FAILED";
      e.status = status;
      throw e;
    }
    const e = new Error(err?.message || "Gemini call failed.");
    e.code = err?.code || "GEMINI_ERROR";
    e.status = status;
    throw e;
  }
}

