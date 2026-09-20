require('dotenv').config();
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const { PromptTemplate } = require('@langchain/core/prompts');

async function test() {
  try {
    const model = new ChatGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY,
      model: 'gemini-3.7-flash',
      temperature: 0.2,
      maxOutputTokens: 100
    });
    
    console.log("Model initialized, invoking...");
    const res = await model.invoke("Reply with exactly the word Hello");
    console.log("Response:", res.content);
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
