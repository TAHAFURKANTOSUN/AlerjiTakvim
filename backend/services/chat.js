// ============================================================
// CHAT SERVISI -- Groq (model-oncelikli anahtar fallback) + RAG + Cevre
// Orkestrasyon:
//   1) RAG + anlik pollen PARALEL topla
//   2) clientWeather / clientAqi frontend'den gelmisse kullan
//   3) Sistem promptunu kur
//   4) Groq anahtar/model kombinasyonlarini siralayla dene (fallback)
//   5) Ilk basarili yaniti dondur; hepsi tukenirse 502 fırlat
// ============================================================

const Groq = require('groq-sdk');
const groqKeyManager = require('../groqKeyManager');
const ApiError = require('../utils/ApiError');
const { buildSystemPrompt, withLanguageLock, toGroqHistory } = require('../prompts/chatPrompt');

const CHAT_TEMPERATURE = 0.4;
const CHAT_MAX_TOKENS  = 512;

// RAG modulu -- lazy + korumal yukle (native binding sorunu varsa chatbot surmaya devam eder)
let _retrieve = null;
let _ragLoadFailed = false;
function getRetriever() {
    if (_retrieve || _ragLoadFailed) return _retrieve;
    try {
        ({ retrieveRelevantChunks: _retrieve } = require('../../rag/retriever'));
    } catch (err) {
        _ragLoadFailed = true;
        console.error('[Chat] RAG modulu yuklenemedi -- RAG\'siz devam:', err.message);
    }
    return _retrieve;
}

const { fetchPollenSummary, annotatePollenSummary } = require('../tools/pollen');

// Tek bir {key, model} ile Groq'a sohbet istegi gonderir.
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

// RAG + anlik pollen paralel toplar. Hata durumunda ilgili parca bos/null doner.
async function gatherContext({ message, lat, lng, locationName, userAllergens, clientPollen, clientWeather, clientAqi }) {
    const retrieve = getRetriever();
    const [ragResult, pollenResult] = await Promise.allSettled([
        retrieve ? retrieve(message, 3) : Promise.resolve([]),
        fetchPollenSummary({ lat, lng, locationName, userAllergens }),
    ]);

    if (ragResult.status === 'rejected') {
        console.warn('[Chat] RAG retrieval basarisiz:', ragResult.reason?.message);
    }

    let livePollen = pollenResult.status === 'fulfilled' ? pollenResult.value : null;
    let pollenSource = 'live';

    // Canli pollen alinamadiysa frontend'in clientPollen ozeti fallback
    if (!livePollen && clientPollen) {
        livePollen = annotatePollenSummary(clientPollen, userAllergens);
        pollenSource = 'client';
    }

    // Hava durumu + AQI: canli cekme yok, frontend'in ozeti kullanilir
    // (PollenContext zaten /api/environment ile cekti)
    const weatherSummary = clientWeather || null;
    const aqiSummary     = clientAqi     || null;

    return {
        chunks:        ragResult.status === 'fulfilled' ? ragResult.value : [],
        livePollen,
        pollenSource,
        weatherSummary,
        aqiSummary,
    };
}

/**
 * Bir sohbet yaniti uretir.
 * @returns {Promise<{ reply: string, provider: 'groq', model: string }>}
 * @throws  {ApiError} 502
 */
async function generateChatReply({ message, locationName, lat, lng, userAllergens, history, clientPollen, clientWeather, clientAqi }) {
    const { chunks, livePollen, pollenSource, weatherSummary, aqiSummary } =
        await gatherContext({ message, lat, lng, locationName, userAllergens, clientPollen, clientWeather, clientAqi });

    const systemPrompt = buildSystemPrompt({
        locationName,
        userAllergens,
        chunks,
        livePollen,
        weatherSummary,
        aqiSummary,
    });

    console.log(
        `[Chat] "${message.slice(0, 60)}..." -- RAG: ${chunks.length} kaynak, ` +
        `Pollen: ${livePollen ? pollenSource : 'yok'}, ` +
        `Weather: ${weatherSummary ? 'var' : 'yok'}, AQI: ${aqiSummary ? 'var' : 'yok'}`
    );

    const groqHistory = toGroqHistory(history);
    groqHistory.push({ role: 'user', content: withLanguageLock(message) });

    // GROQ FALLBACK DONGUSU
    const maxRetries = groqKeyManager.getStatus().totalCombinations || 1;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        const cfg = groqKeyManager.getActiveConfig();
        if (!cfg) break;

        try {
            const maskedKey = cfg.apiKey.substring(0, 8) + '...';
            console.log(`[Chat] Groq deneniyor: model=${cfg.model} key=${maskedKey} (deneme ${attempt + 1})`);

            const reply = await tryGroqChat(cfg.apiKey, cfg.model, systemPrompt, groqHistory);
            if (reply) return { reply, provider: 'groq', model: cfg.model };
        } catch (err) {
            const status = err?.status || err?.statusCode || err?.error?.status_code || 0;
            if (status !== 429 && status !== 401 && status !== 403) {
                console.error(`[Chat] Groq hatasi (${status}):`, err.message || err);
            }
            groqKeyManager.markBlocked(cfg.apiKey, cfg.model, status || 500);
        }
    }

    const status = groqKeyManager.getStatus();
    console.error(`[Chat] Tum Groq keyler/modeller tukendi. Bloklanmis: ${status.blockedCount}/${status.totalCombinations}`);
    throw new ApiError(502, 'Chatbot su anda yanit veremiyor. Lutfen birkas dakika sonra tekrar deneyin.', { details: { status } });
}

module.exports = { generateChatReply };
