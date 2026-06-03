const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

async function askGemini(prompt) {
  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini API error:', error.message);
    return null;
  }
}

async function askGeminiJSON(prompt) {
  try {
    const text = await askGemini(prompt);
    if (!text) return null;
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*$/gm, '').trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('Gemini JSON parse error:', error.message);
    return null;
  }
}

module.exports = { askGemini, askGeminiJSON };
