import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// ─── In-memory chat history (per session) ────────────────────────────────────
const sessions = {}; // sessionId -> [ { role, content }, ... ]

// ─── Supported models ────────────────────────────────────────────────────────
const AVAILABLE_MODELS = [
  { id: "openai/gpt-4o-mini",         label: "GPT-4o Mini"       },
  { id: "openai/gpt-4o",              label: "GPT-4o"            },
  { id: "anthropic/claude-3-haiku",   label: "Claude 3 Haiku"    },
  { id: "google/gemini-flash-1.5",    label: "Gemini Flash 1.5"  },
  { id: "meta-llama/llama-3-8b-instruct", label: "Llama 3 8B"   },
];

// ─── GET /models — return model list to frontend ──────────────────────────────
app.get("/models", (req, res) => {
  res.json({ models: AVAILABLE_MODELS });
});

// ─── GET / ────────────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.send("Server is running 🚀");
});

// ─── POST /chat — main chat endpoint (streaming) ─────────────────────────────
app.post("/chat", async (req, res) => {
  const { message, sessionId = "default", model = "openai/gpt-4o-mini" } = req.body;

  // ── Validate input ──────────────────────────────────────────────────────────
  if (!message || typeof message !== "string" || message.trim() === "") {
    return res.status(400).json({ error: "Message is required and must be a non-empty string." });
  }

  const validModel = AVAILABLE_MODELS.find((m) => m.id === model);
  if (!validModel) {
    return res.status(400).json({
      error: `Invalid model. Choose one of: ${AVAILABLE_MODELS.map((m) => m.id).join(", ")}`,
    });
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return res.status(500).json({ error: "Server misconfiguration: API key not set." });
  }

  // ── Build history ───────────────────────────────────────────────────────────
  if (!sessions[sessionId]) sessions[sessionId] = [];
  sessions[sessionId].push({ role: "user", content: message.trim() });

  // Keep last 20 messages to avoid token overflow
  const messages = sessions[sessionId].slice(-20);

  // ── Set up SSE for streaming ────────────────────────────────────────────────
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const sendEvent = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "http://localhost:5173",
        "X-Title": "AI Assistant",
      },
      body: JSON.stringify({ model, messages, stream: true }),
    });

    // ── Handle non-OK HTTP from OpenRouter ──────────────────────────────────
    if (!response.ok) {
      let errMsg = `OpenRouter error: ${response.status} ${response.statusText}`;
      try {
        const errData = await response.json();
        errMsg = errData?.error?.message || errMsg;
      } catch (_) {}
      sendEvent({ error: errMsg });
      return res.end();
    }

    // ── Stream response chunks ───────────────────────────────────────────────
    let fullReply = "";
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n").filter((l) => l.startsWith("data:"));

      for (const line of lines) {
        const raw = line.replace(/^data:\s*/, "");
        if (raw === "[DONE]") break;

        try {
          const parsed = JSON.parse(raw);
          const token = parsed?.choices?.[0]?.delta?.content;
          if (token) {
            fullReply += token;
            sendEvent({ token }); // send each token to frontend
          }
        } catch (_) {
          // skip malformed chunks
        }
      }
    }

    // ── Save assistant reply to history ────────────────────────────────────
    if (fullReply) {
      sessions[sessionId].push({ role: "assistant", content: fullReply });
    }

    sendEvent({ done: true, model: validModel.label });
    res.end();
  } catch (err) {
    console.error("Chat error:", err);
    sendEvent({ error: "Unexpected server error. Please try again." });
    res.end();
  }
});

// ─── DELETE /history — clear session history ─────────────────────────────────
app.delete("/history/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  if (sessions[sessionId]) {
    delete sessions[sessionId];
    return res.json({ message: `History cleared for session: ${sessionId}` });
  }
  res.status(404).json({ error: "Session not found." });
});

// ─── GET /history/:sessionId — fetch history ─────────────────────────────────
app.get("/history/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  res.json({ history: sessions[sessionId] || [] });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error." });
});

app.listen(5000, () => {
  console.log("✅ Server running on http://localhost:5000");
  console.log("🔑 API Key loaded:", !!process.env.OPENROUTER_API_KEY);
});