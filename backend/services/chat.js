// ============================================================
// CHAT SERVİSİ — Groq (model-öncelikli anahtar fallback) + RAG + Polen
// ------------------------------------------------------------
// app.js'in dev chat handler'ı buraya taşındı. Route artık yalnızca
// istek doğrulama + bu servisi çağırmaktan ibaret (ince controller).
// Orkestrasyon:
//   1) RAG + anlık polen verisini PARALEL topla (biri patlasa diğeri sürer)
//   2) Sistem promptunu + dil kilidini kur
//   3) Groq anahtar/model kombinasyonlarını sırayla dene (fallback)
//   4) İlk başarılı yanıtı döndür; hepsi tükenirse 502 (ApiError) fırlat
// ============================================================

const Groq = require('groq-sdk');
const groqKeyManager = require('../groqKeyManager');
const ApiError = require('../utils/ApiError');
const { buildSystemPrompt, withLanguageLock, toGroqHistory } = require('../prompts/chatPrompt');

const { retrieveRelevantChunks } = require('../../rag/retriever');
const { fetchPollenSummary } = require('../tools/pollen');

const CHAT_TEMPERATURE = 0.4; // Dil kaymasını önlemek için düşük tutuldu
const CHAT_MAX_TOKENS = 512;

// Tek bir {key, model} ile Groq'a sohbet isteği gönderir.
async function tryGroqChat(apiKey, model, systemPrompt, messages) {
    const client = new Groq({ apiKey });
    const completion = await client.chat.completions.create({
        model,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        temperature: CHAT_TEMPERATURE,
        max_tokens: CHAT_MAX_TOKENS,
    });
    return completion.choices[0]?.message?.content || '';
}

// RAG + anlık polen verisini paralel toplar. Hata durumunda ilgili
// parça boş/null döner — sohbet akışını bloklamaz.
async function gatherContext({ message, lat, lng, locationName }) {
    const [ragResult, pollenResult] = await Promise.allSettled([
        retrieveRelevantChunks(message, 3),
        fetchPollenSummary({ lat, lng, locationName }),
    ]);

    if (ragResult.status === 'rejected') {
        console.warn('[Chat] RAG retrieval başarısız:', ragResult.reason?.message);
    }

    return {
        chunks: ragResult.status === 'fulfilled' ? ragResult.value : [],
        livePollen: pollenResult.status === 'fulfilled' ? pollenResult.value : null,
    };
}

/**
 * Bir sohbet yanıtı üretir.
 * @returns {Promise<{ reply: string, provider: 'groq', model: string }>}
 * @throws  {ApiError} 502 — tüm Groq anahtar/model kombinasyonları tükendiyse
 */
async function generateChatReply({ message, locationName, lat, lng, userAllergens, history }) {
    const { chunks, livePollen } = await gatherContext({ message, lat, lng, locationName });

    const systemPrompt = buildSystemPrompt({ locationName, userAllergens, chunks, livePollen });

    console.log(
        `[Chat] "${message.slice(0, 60)}..." — RAG: ${chunks.length} kaynak, Pollen: ${livePollen ? 'var' : 'yok'}`
    );

    const groqHistory = toGroqHistory(history);
    groqHistory.push({ role: 'user', content: withLanguageLock(message) });

    // ── GROQ FALLBACK DÖNGÜSÜ ──
    const maxRetries = groqKeyManager.getStatus().totalCombinations || 1;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        const cfg = groqKeyManager.getActiveConfig();
        if (!cfg) break; // Tüm key/model kombinasyonları tükendi

        try {
            const maskedKey = cfg.apiKey.substring(0, 8) + '...';
            console.log(`[Chat] Groq deneniyor: model=${cfg.model} key=${maskedKey} (deneme ${attempt + 1})`);

            const reply = await tryGroqChat(cfg.apiKey, cfg.model, systemPrompt, groqHistory);
            if (reply) {
                return { reply, provider: 'groq', model: cfg.model };
            }
        } catch (err) {
            const status = err?.status || err?.statusCode || err?.error?.status_code || 0;
            if (status !== 429 && status !== 401 && status !== 403) {
                console.error(`[Chat] Groq hatası (${status}):`, err.message || err);
            }
            // Rate-limit/auth ya da bilinmeyen hata → bu kombinasyonu blokla, sıradakini dene.
            groqKeyManager.markBlocked(cfg.apiKey, cfg.model, status || 500);
        }
    }

    // Tüm Groq anahtar/modelleri tükendi.
    const status = groqKeyManager.getStatus();
    console.error(
        `[Chat] Tüm Groq keyler/modeller tükendi. Bloklanmış: ${status.blockedCount}/${status.totalCombinations}`
    );
    throw new ApiError(
        502,
        'Chatbot şu anda yanıt veremiyor. Tüm API anahtarları sınıra ulaştı. Lütfen birkaç dakika sonra tekrar deneyin.',
        { details: { status } }
    );
}

module.exports = { generateChatReply };
