import { useEffect, useRef, useState } from "react";
import { sendChatMessage } from "../api.js";
import Bulb from "./Bulb.jsx";

const GREETING = {
  role: "assistant",
  content: "Ask me what you're trying to learn, and I'll point you at free courses actually on the board.",
};

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  async function handleSend(e) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || busy) return;

    setError("");
    const nextMessages = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setBusy(true);

    try {
      // Send prior turns as history (skip the initial greeting — it
      // wasn't something the person said, just our own opener).
      const history = nextMessages.slice(1, -1);
      const data = await sendChatMessage(trimmed, history);
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setError(err.message || "Couldn't reach the chat backend. Is it running?");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="chat-widget">
      {open && (
        <div className="chat-panel" role="dialog" aria-label="Blink course assistant">
          <div className="chat-panel-header">
            <span className="chat-panel-title">
              <Bulb /> Ask Blink
            </span>
            <button
              type="button"
              className="chat-close"
              aria-label="Close chat"
              onClick={() => setOpen(false)}
            >
              &times;
            </button>
          </div>

          <div className="chat-messages" ref={scrollRef}>
            {messages.map((m, i) => (
              <div key={i} className={`chat-bubble ${m.role}`}>
                {m.content}
              </div>
            ))}
            {busy && <div className="chat-bubble assistant chat-typing">Thinking…</div>}
          </div>

          {error && <div className="form-msg error show chat-error">{error}</div>}

          <form className="chat-input-row" onSubmit={handleSend}>
            <input
              type="text"
              placeholder="e.g. I want to learn web development"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={busy}
              aria-label="Message"
            />
            <button type="submit" className="chat-send" disabled={busy || !input.trim()}>
              Send
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        className="chat-launcher"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? "Close chat" : "Open chat"}
      >
        <Bulb /> {open ? "Close" : "Ask Blink"}
      </button>
    </div>
  );
}
