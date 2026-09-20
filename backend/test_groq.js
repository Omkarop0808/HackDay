const Groq = require('groq-sdk');
require('dotenv').config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function testCompletion() {
  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: "Say hello! return json {\"msg\":\"hello\"}" }],
      model: "openai/gpt-oss-20b",
      response_format: { type: "json_object" },
      max_tokens: 100
    });
    console.log("Success:", completion.choices[0].message.content);
  } catch (err) {
    console.error("Error:", err.message);
  }
}

testCompletion();
