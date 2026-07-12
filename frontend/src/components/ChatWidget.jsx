import { useEffect, useRef, useState } from 'react';
import { chatApi, ApiError } from '../api/client';
import './ChatWidget.css';

const WELCOME = {
  role: 'assistant',
  content: "Hi, I'm the TransitOps assistant. Ask me to look up fleet data or take an action — e.g. \"dispatch trip TR012\" or \"how many vehicles are in shop?\" I'll only do what your role allows.",
};

// Minimal inline-markdown renderer: **bold**, *italic*/_italic_, `code`, line breaks.
function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, li) => {
    const tokens = [];
    const pattern = /(\*\*([^*]+)\*\*|\*([^*]+)\*|_([^_]+)_|`([^`]+)`)/g;
    let lastIndex = 0;
    let match;
    let key = 0;
    while ((match = pattern.exec(line))) {
      if (match.index > lastIndex) tokens.push(line.slice(lastIndex, match.index));
      if (match[2] !== undefined) tokens.push(<strong key={key++}>{match[2]}</strong>);
      else if (match[3] !== undefined) tokens.push(<em key={key++}>{match[3]}</em>);
      else if (match[4] !== undefined) tokens.push(<em key={key++}>{match[4]}</em>);
      else if (match[5] !== undefined) tokens.push(<code key={key++}>{match[5]}</code>);
      lastIndex = pattern.lastIndex;
    }
    if (lastIndex < line.length) tokens.push(line.slice(lastIndex));
    return (
      <span key={li}>
        {tokens}
        {li < lines.length - 1 ? <br /> : null}
      </span>
    );
  });
}

function ChatIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M4 5.5C4 4.67157 4.67157 4 5.5 4H18.5C19.3284 4 20 4.67157 20 5.5V14.5C20 15.3284 19.3284 16 18.5 16H9.5L5.5 19.5V16H5.5C4.67157 16 4 15.3284 4 14.5V5.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="8.5" cy="10" r="1" fill="currentColor" />
      <circle cx="12" cy="10" r="1" fill="currentColor" />
      <circle cx="15.5" cy="10" r="1" fill="currentColor" />
    </svg>
  );
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const nextMessages = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setInput('');
    setError(null);
    setLoading(true);

    try {
      const res = await chatApi.send(
        nextMessages.filter((m) => m.role === 'user' || m.role === 'assistant').map((m) => ({ role: m.role, content: m.content }))
      );
      setMessages((prev) => [...prev, { role: 'assistant', content: res.reply, actions: res.actions }]);
    } catch (err) {
      const detail = err instanceof ApiError ? err.detail || err.message : 'Something went wrong reaching the assistant.';
      setError(detail);
      setMessages((prev) => [...prev, { role: 'assistant', content: `Sorry, I ran into an error: ${detail}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="chat-widget">
      {open && (
        <div className="chat-widget__panel">
          <div className="chat-widget__header">
            <span className="chat-widget__title">TransitOps Assistant</span>
            <button className="chat-widget__close" onClick={() => setOpen(false)} aria-label="Close chat">
              &times;
            </button>
          </div>

          <div className="chat-widget__messages" ref={scrollRef}>
            {messages.map((m, i) => (
              <div key={i} className={`chat-widget__msg chat-widget__msg--${m.role}`}>
                <div className="chat-widget__bubble">{renderMarkdown(m.content)}</div>
                {m.actions && m.actions.length > 0 && (
                  <div className="chat-widget__actions">
                    {m.actions.map((a, j) => (
                      <div key={j} className={`chat-widget__action ${a.result?.error ? 'chat-widget__action--error' : 'chat-widget__action--ok'}`}>
                        {a.tool}
                        {a.result?.error ? `: ${a.result.error}` : ' ✓'}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="chat-widget__msg chat-widget__msg--assistant">
                <div className="chat-widget__bubble chat-widget__bubble--typing">Thinking…</div>
              </div>
            )}
          </div>

          <div className="chat-widget__composer">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask or ask me to do something…"
              rows={1}
              disabled={loading}
            />
            <button className="chat-widget__send" onClick={send} disabled={loading || !input.trim()}>
              Send
            </button>
          </div>
        </div>
      )}

      <button className="chat-widget__toggle" onClick={() => setOpen((v) => !v)} aria-label="Toggle assistant">
        {open ? <span className="chat-widget__toggle-close">&times;</span> : <ChatIcon />}
      </button>
    </div>
  );
}
