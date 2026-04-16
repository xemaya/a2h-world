// game/build/lib/gemini.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

export async function geminiText(model, systemPrompt, userPrompt, key, { temperature = 0.7 } = {}) {
  const url = `${BASE_URL}/${model}:generateContent?key=${key}`;
  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ parts: [{ text: userPrompt }] }],
    generationConfig: { temperature }
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`Gemini text API ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No text in Gemini response');
  return text;
}

export async function geminiImage(model, prompt, outputPath, key, { maxRetries = 2 } = {}) {
  const url = `${BASE_URL}/${model}:generateContent?key=${key}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.4, candidateCount: 1 }
  };

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const parts = json.candidates?.[0]?.content?.parts || [];
      const imgPart = parts.find(p => p.inline_data || p.inlineData);
      const b64 = imgPart?.inline_data?.data || imgPart?.inlineData?.data;
      if (!b64) throw new Error('No image data in response');

      mkdirSync(dirname(outputPath), { recursive: true });
      writeFileSync(outputPath, Buffer.from(b64, 'base64'));
      return { success: true, path: outputPath };
    } catch (err) {
      if (attempt === maxRetries) return { success: false, path: outputPath, error: err.message };
      await new Promise(r => setTimeout(r, (attempt + 1) * 2000));
    }
  }
}
