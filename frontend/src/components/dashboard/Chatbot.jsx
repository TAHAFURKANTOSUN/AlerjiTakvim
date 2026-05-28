import { useState, useRef, useEffect } from 'react';
import { usePollen } from '../../context/PollenContext';
import { sendChatMessage } from '../../api/client';

export default function Chatbot() {
  const { selectedLocation, userAllergens } = usePollen();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from: 'bot', text: 'Merhaba! 🌿 Ben Polen Asistanı. Polen ve alerji konusundaki sorularınızı yanıtlayabilirim.' },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  // Yeni mesaj geldiğinde / yazma indikatörü değiştiğinde otomatik en alta kay
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);

  // Sohbet açıldığında ilk başta input'a odaklan (kullanıcı doğrudan yazmaya başlayabilsin)
  useEffect(() => {
    if (isOpen) {
      // küçük gecikme: pencere DOM'a girdikten sonra focus
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Yanıt geldiğinde (isTyping false olunca) input'a tekrar odaklan
  // — disabled attribute focus'u kaldırdığı için bunu tipping bittikten sonra yapıyoruz.
  useEffect(() => {
    if (!isTyping && isOpen) {
      // requestAnimationFrame: input "disabled=false" olarak render edildikten sonra focus
      const raf = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(raf);
    }
  }, [isTyping, isOpen]);

  async function askWith(text) {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    const userMsg = { from: 'user', text: trimmed };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setIsTyping(true);

    try {
      const historyForApi = updatedMessages.slice(-10);
      const data = await sendChatMessage(
        trimmed,
        selectedLocation.name,
        selectedLocation.lat,
        selectedLocation.lng,
        userAllergens,
        historyForApi
      );
      setMessages(prev => [...prev, { from: 'bot', text: data.reply }]);
    } catch (err) {
      console.error('Chat error:', err);
      const isQuota = err?.status === 429 || err?.code === 'QUOTA_EXCEEDED';
      const quotaText = err?.action === 'upgrade'
        ? '⭐ Günlük sohbet hakkınız doldu. Sınırsız sohbet için Premium’a geçebilirsiniz.'
        : '🔒 Günlük misafir sohbet hakkınız doldu. Devam etmek için ücretsiz kayıt olun.';
      setMessages(prev => [...prev, {
        from: 'bot',
        text: isQuota
          ? quotaText
          : '❌ Yanıt alınamadı. Lütfen tekrar deneyin veya internet bağlantınızı kontrol edin.'
      }]);
    }
    setIsTyping(false);
  }

  const suggestions = ['Bugünkü risk?', 'Tavsiye ver', 'Alerjenlerim', 'Korunma'];

  return (
    <>
      <button
        id="chatbot-fab"
        onClick={() => setIsOpen(!isOpen)}
        className={`clean-chat-fab ${isOpen ? 'open' : ''}`}
        title={isOpen ? 'Kapat' : 'Sohbeti aç'}
        aria-label={isOpen ? 'Sohbeti kapat' : 'Sohbeti aç'}
      >
        {/* Sade SVG ikon — emoji slop'unu kapat */}
        {isOpen ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>

      {isOpen && (
        <div className="chatbot-window" role="dialog" aria-label="Polen Asistanı sohbet penceresi">
          {/* Header — gradient avatar + status dot YOK */}
          <div className="clean-chat-header">
            <div className="flex-1 min-w-0">
              <h4 className="clean-chat-title leading-tight tracking-tight">Polen Asistanı</h4>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5 truncate">
                {selectedLocation.name}
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="clean-chat-close"
              aria-label="Sohbeti kapat"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M3 3l6 6M9 3l-6 6" />
              </svg>
            </button>
          </div>

          <div className="chat-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-msg ${msg.from}`}>{msg.text}</div>
            ))}
            {isTyping && (
              <div className="chat-msg bot typing-indicator" aria-label="Yazıyor">
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="clean-chat-footer">
            <div className="clean-chat-input-row">
              <input
                ref={inputRef}
                id="chatbot-input"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), askWith(input))}
                placeholder="Bir soru yazın…"
                disabled={isTyping}
                autoFocus
                className="clean-chat-input"
                aria-label="Mesaj"
              />
              <button
                onClick={() => askWith(input)}
                disabled={!input.trim() || isTyping}
                className="clean-chat-send"
                aria-label="Gönder"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 11.5V2.5M3 6.5L7 2.5L11 6.5" />
                </svg>
              </button>
            </div>
            <div className="clean-chat-suggestions">
              {suggestions.map((q) => (
                <button
                  key={q}
                  onClick={() => askWith(q)}
                  disabled={isTyping}
                  className="clean-chat-suggestion"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
