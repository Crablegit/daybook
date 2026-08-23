// ============================================================
// AI ASSISTANT — Google Gemini (called directly from the browser
// using the user's OWN API key, stored only in their profile row).
// ============================================================

const AI_JSON_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "Short task title" },
    description: { type: "string", description: "Extra notes, or empty string" },
    date: { type: "string", description: "ISO date YYYY-MM-DD if known, otherwise empty string" },
    time: { type: "string", description: "24h time HH:MM if known, otherwise empty string" },
    tag: { type: "string", enum: ["study", "work", "personal", "entertainment", ""] },
    completed: { type: "boolean" },
  },
  required: ["title", "description", "date", "time", "tag", "completed"],
};

function buildAiSystemPrompt() {
  const today = new Date().toISOString().slice(0, 10);
  return (
    `You extract ONE actionable to-do/task from the user's note (text or image of a note/screenshot/schedule). ` +
    `Today's date is ${today}. Resolve relative dates ("tomorrow", "this Friday", "ngày mai", "thứ 6 tuần này") into an absolute ISO date. ` +
    `If a field is genuinely not mentioned, return an empty string for it (or false for completed) rather than guessing. ` +
    `Pick the single closest tag from: study, work, personal, entertainment — or "" if unclear. ` +
    `Respond ONLY with JSON matching the given schema, no extra commentary.`
  );
}

async function callGeminiExtractTask({ text, imageBase64, imageMimeType }) {
  const apiKey = APP_STATE.profile?.gemini_api_key;
  const model = APP_STATE.profile?.ai_model || window.APP_CONFIG.DEFAULT_GEMINI_MODEL;
  if (!apiKey) {
    const e = new Error("NO_KEY");
    e.code = "NO_KEY";
    throw e;
  }

  const parts = [];
  if (text && text.trim()) parts.push({ text: text.trim() });
  if (imageBase64) {
    parts.push({
      inline_data: { mime_type: imageMimeType || "image/jpeg", data: imageBase64 },
    });
  }
  if (parts.length === 0) throw new Error("EMPTY_INPUT");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const body = {
    system_instruction: { parts: [{ text: buildAiSystemPrompt() }] },
    contents: [{ role: "user", parts }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: AI_JSON_SCHEMA,
      temperature: 0.2,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    console.error("Gemini error:", res.status, errBody);
    throw new Error("API_ERROR");
  }

  const data = await res.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error("NO_OUTPUT");

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error("PARSE_ERROR");
  }
  return parsed;
}

// Convert a File to base64 (without the data: prefix)
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
