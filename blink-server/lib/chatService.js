// Powers the chat widget. Grounds every answer in Blink's MongoDB database —
// pulls a handful of courses that look relevant to the question and tells
// Claude to only recommend from that list.

const Anthropic = require("@anthropic-ai/sdk");
const { Course } = require("../db");

const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_TURNS = 10;

let client = null;
function getClient() {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

function isConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

// Pull meaningful words out of the message and match them against
// title/blurb/category/platform in MongoDB.
async function findRelevantCourses(message, limit = 6) {
  const words = message
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 6);

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
        `- "${c.title}" (${c.platform}, ${c.category || "General"}, ${c.access || "check access on the page"}) — ${c.url}`
    )
    .join("\n");

  return `You are Blink's course-finding assistant, embedded on a free-course directory site (Coursera, Udemy, edX, freeCodeCamp, Khan Academy, MIT OpenCourseWare).

Only recommend courses from this list of what's currently in Blink's catalog — never invent a course, platform, or URL that isn't listed here:
${listing || "(nothing matched in the catalog for this query)"}

If nothing in the list is a good fit, say so plainly and suggest the person browse the board or search a different term, rather than making something up.
Keep answers short — a few sentences or a short list. When you recommend something, name the course and its platform.`;
}

async function getChatReply(message, history = []) {
  if (!isConfigured()) {
    throw new Error("Chat isn't configured on this server yet — set ANTHROPIC_API_KEY in .env.");
  }
  if (!message || !message.trim()) {
    throw new Error("Message can't be empty");
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`Message is too long (${MAX_MESSAGE_LENGTH} characters max)`);
  }

  const relevant = await findRelevantCourses(message);

  const trimmedHistory = history.slice(-MAX_HISTORY_TURNS).map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: String(m.content || "").slice(0, MAX_MESSAGE_LENGTH),
  }));

  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 500,
    system: buildSystemPrompt(relevant),
    messages: [...trimmedHistory, { role: "user", content: message }],
  });

  const reply = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  return {
    reply,
    sources: relevant.map((c) => ({ title: c.title, platform: c.platform, url: c.url })),
  };
}

module.exports = { getChatReply, isConfigured, findRelevantCourses };
