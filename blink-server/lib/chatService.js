// Multi-provider chat service. Grounds answers in Blink's MongoDB courses catalog.
// Supports:
// 1. Google Gemini (100% Free tier at https://aistudio.google.com) - GEMINI_API_KEY
// 2. Groq (Fast & Free tier at https://console.groq.com) - GROQ_API_KEY
// 3. OpenRouter (Free models at https://openrouter.ai) - OPENROUTER_API_KEY
// 4. OpenAI / Compatible - OPENAI_API_KEY
// 5. Anthropic Claude - ANTHROPIC_API_KEY
// 6. Intelligent Local Catalog Grounding (works with 0 API keys)

const { Course } = require("../db");

const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_TURNS = 10;

function isConfigured() {
  return Boolean(
    process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GROQ_API_KEY ||
      process.env.OPENROUTER_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.ANTHROPIC_API_KEY
  );
}

function getProviderInfo() {
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) {
    return {
      provider: "gemini",
      model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
      freeTier: true,
    };
  }
  if (process.env.GROQ_API_KEY) {
    return {
      provider: "groq",
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      freeTier: true,
    };
  }
  if (process.env.OPENROUTER_API_KEY) {
    return {
      provider: "openrouter",
      model: process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-lite-preview-02-05:free",
      freeTier: true,
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return {
      provider: "openai",
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      freeTier: false,
    };
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      provider: "anthropic",
      model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001",
      freeTier: false,
    };
  }
  return {
    provider: "built-in-catalog",
    model: "blink-catalog-matcher-v1",
    freeTier: true,
  };
}

// Pull meaningful words out of the message and match them against
// title/blurb/category/platform in MongoDB.
async function findRelevantCourses(message, limit = 6) {
  const words = message
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 8);

  let docs = [];
  if (words.length > 0) {
    const orConditions = [];
    words.forEach((w) => {
      const reg = new RegExp(w, "i");
      orConditions.push(
        { title: reg },
        { blurb: reg },
        { category: reg },
        { platform: reg }
      );
    });
    docs = await Course.find({ $or: orConditions }).limit(limit).lean();
  }

  if (docs.length === 0) {
    // No keyword hits — fall back to a general sample
    docs = await Course.find().sort({ updatedAt: -1, _id: -1 }).limit(limit).lean();
  }

  return docs;
}

function buildSystemPrompt(courseContext) {
  const listing = courseContext
    .map(
      (c) =>
        `- "${c.title}" (${c.platform}, ${c.category || "General"}, ${c.access || "Check on page"}) — ${c.url}`
    )
    .join("\n");

  return `You are Blink's course-finding assistant, embedded on a free-course directory site (Coursera, Udemy, edX, freeCodeCamp, Khan Academy, MIT OpenCourseWare).

Only recommend courses from this list of what's currently in Blink's catalog — never invent a course, platform, or URL that isn't listed here:
${listing || "(nothing matched in the catalog for this query)"}

If nothing in the list is a good fit, say so plainly and suggest the person browse the board or search a different term, rather than making something up.
Keep answers short, friendly, and structured. When you recommend something, name the course and its platform with the link.`;
}

// Provider: Google Gemini
async function callGemini(apiKey, model, systemPrompt, userMessage, history) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const contents = [];
  // Add conversation history
  history.forEach((turn) => {
    contents.push({
      role: turn.role === "assistant" ? "model" : "user",
      parts: [{ text: String(turn.content || "") }],
    });
  });

  // Current prompt
  contents.push({
    role: "user",
    parts: [{ text: `${systemPrompt}\n\nUser Question: ${userMessage}` }],
  });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      generationConfig: {
        maxOutputTokens: 600,
        temperature: 0.7,
      },
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No response received from Gemini");
  return text.trim();
}

// Provider: OpenAI-compatible (Groq, OpenRouter, OpenAI)
async function callOpenAICompatible(apiKey, baseUrl, model, systemPrompt, userMessage, history, extraHeaders = {}) {
  const messages = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content || ""),
    })),
    { role: "user", content: userMessage },
  ];

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 600,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`AI API error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("No response text received from AI provider");
  return text.trim();
}

// Fallback: Smart local recommendation generator
function generateCatalogFallbackReply(message, relevantCourses) {
  if (relevantCourses.length === 0) {
    return "I couldn't find any courses matching that specific topic in our catalog right now. Try searching for broader terms like **Programming**, **AI & ML**, **Data Science**, or browse the board above!";
  }

  const courseList = relevantCourses
    .slice(0, 4)
    .map(
      (c) =>
        `• **${c.title}** (${c.platform})\n  _${c.access || "Free access"}_ · ${c.blurb || "Free course listing"}\n  [View Course](${c.url})`
    )
    .join("\n\n");

  return `Here are the top free courses in our catalog matching your interest:\n\n${courseList}\n\nYou can also explore our interactive **Domain Roadmaps** for structured step-by-step tracks!`;
}

async function getChatReply(message, history = []) {
  if (!message || !message.trim()) {
    throw new Error("Message can't be empty");
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`Message is too long (${MAX_MESSAGE_LENGTH} characters max)`);
  }

  const relevant = await findRelevantCourses(message);
  const systemPrompt = buildSystemPrompt(relevant);

  const trimmedHistory = history.slice(-MAX_HISTORY_TURNS).map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: String(m.content || "").slice(0, MAX_MESSAGE_LENGTH),
  }));

  // 1. Try Google Gemini (Free API)
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (geminiKey) {
    try {
      const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
      const reply = await callGemini(geminiKey, model, systemPrompt, message, trimmedHistory);
      return {
        reply,
        provider: `Gemini (${model})`,
        sources: relevant.map((c) => ({ title: c.title, platform: c.platform, url: c.url })),
      };
    } catch (err) {
      console.warn("[ChatService] Gemini failed, attempting fallback:", err.message);
    }
  }

  // 2. Try Groq (Free API)
  if (process.env.GROQ_API_KEY) {
    try {
      const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
      const reply = await callOpenAICompatible(
        process.env.GROQ_API_KEY,
        "https://api.groq.com/openai/v1",
        model,
        systemPrompt,
        message,
        trimmedHistory
      );
      return {
        reply,
        provider: `Groq (${model})`,
        sources: relevant.map((c) => ({ title: c.title, platform: c.platform, url: c.url })),
      };
    } catch (err) {
      console.warn("[ChatService] Groq failed, attempting fallback:", err.message);
    }
  }

  // 3. Try OpenRouter (Free tier models)
  if (process.env.OPENROUTER_API_KEY) {
    try {
      const model = process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-lite-preview-02-05:free";
      const reply = await callOpenAICompatible(
        process.env.OPENROUTER_API_KEY,
        "https://openrouter.ai/api/v1",
        model,
        systemPrompt,
        message,
        trimmedHistory,
        {
          "HTTP-Referer": "http://localhost:5173",
          "X-Title": "Blink Course Directory",
        }
      );
      return {
        reply,
        provider: `OpenRouter (${model})`,
        sources: relevant.map((c) => ({ title: c.title, platform: c.platform, url: c.url })),
      };
    } catch (err) {
      console.warn("[ChatService] OpenRouter failed, attempting fallback:", err.message);
    }
  }

  // 4. Try OpenAI
  if (process.env.OPENAI_API_KEY) {
    try {
      const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
      const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
      const reply = await callOpenAICompatible(
        process.env.OPENAI_API_KEY,
        baseUrl,
        model,
        systemPrompt,
        message,
        trimmedHistory
      );
      return {
        reply,
        provider: `OpenAI (${model})`,
        sources: relevant.map((c) => ({ title: c.title, platform: c.platform, url: c.url })),
      };
    } catch (err) {
      console.warn("[ChatService] OpenAI failed, attempting fallback:", err.message);
    }
  }

  // 5. Try Anthropic Claude
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const Anthropic = require("@anthropic-ai/sdk");
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
      const response = await client.messages.create({
        model,
        max_tokens: 500,
        system: systemPrompt,
        messages: [...trimmedHistory, { role: "user", content: message }],
      });
      const reply = response.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("\n");
      return {
        reply,
        provider: `Anthropic (${model})`,
        sources: relevant.map((c) => ({ title: c.title, platform: c.platform, url: c.url })),
      };
    } catch (err) {
      console.warn("[ChatService] Anthropic failed, attempting fallback:", err.message);
    }
  }

  // 6. Intelligent Local Catalog Grounding (Always available!)
  const fallbackReply = generateCatalogFallbackReply(message, relevant);
  return {
    reply: fallbackReply,
    provider: "Blink Catalog Assistant",
    sources: relevant.map((c) => ({ title: c.title, platform: c.platform, url: c.url })),
  };
}

module.exports = {
  getChatReply,
  isConfigured,
  getProviderInfo,
  findRelevantCourses,
};
