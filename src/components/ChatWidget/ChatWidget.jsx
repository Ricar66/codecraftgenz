// src/components/ChatWidget/ChatWidget.jsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader2 } from 'lucide-react';
import styles from './ChatWidget.module.css';

const API_URL = import.meta.env.VITE_AI_AGENT_URL || 'https://agente-codecraftgenz.onrender.com';

function getSessionId() {
  let id = sessionStorage.getItem('cc_chat_session');
  if (!id) {
    id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem('cc_chat_session', id);
  }
  return id;
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Olá! Sou o assistente virtual da CodeCraft Gen-Z. Como posso ajudar você hoje?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const sessionId = useRef(getSessionId());

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          session_id: sessionId.current,
        }),
      });

      if (!res.ok) throw new Error('Erro na resposta do servidor');

      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'assistant', text: data.response }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'Desculpe, não consegui processar sua mensagem. Tente novamente em alguns instantes.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!open && (
        <button
          className={styles.fab}
          onClick={() => setOpen(true)}
          aria-label="Abrir chat com assistente virtual"
        >
          <MessageCircle size={24} />
          <span className={styles.fabPulse} />
        </button>
      )}

      {/* Chat Window */}
      {open && (
        <div className={styles.chatWindow} role="dialog" aria-label="Chat com assistente virtual">
          {/* Header */}
          <div className={styles.chatHeader}>
            <div className={styles.headerInfo}>
              <div className={styles.headerAvatar}>
                <Bot size={20} />
              </div>
              <div>
                <span className={styles.headerName}>CodeCraft AI</span>
                <span className={styles.headerStatus}>Online</span>
              </div>
            </div>
            <button
              className={styles.closeBtn}
              onClick={() => setOpen(false)}
              aria-label="Fechar chat"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className={styles.messagesArea}>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`${styles.message} ${
                  msg.role === 'user' ? styles.messageUser : styles.messageBot
                }`}
              >
                <div className={styles.messageIcon}>
                  {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                </div>
                <div className={styles.messageBubble}>{msg.text}</div>
              </div>
            ))}
            {loading && (
              <div className={`${styles.message} ${styles.messageBot}`}>
                <div className={styles.messageIcon}>
                  <Bot size={14} />
                </div>
                <div className={`${styles.messageBubble} ${styles.typing}`}>
                  <Loader2 size={16} className={styles.spinner} />
                  <span>Pensando...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className={styles.inputArea}>
            <input
              ref={inputRef}
              className={styles.input}
              type="text"
              placeholder="Digite sua mensagem..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              autoComplete="off"
            />
            <button
              className={styles.sendBtn}
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              aria-label="Enviar mensagem"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
