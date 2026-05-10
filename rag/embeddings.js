// ============================================================
// EMBEDDINGS — Lokal, ücretsiz, multilingual
// @huggingface/transformers + Xenova/paraphrase-multilingual-MiniLM-L12-v2
//
// KRİTİK: Hem index oluştururken hem de sorgu anında AYNI
// embedder'ı kullanmak ZORUNDAYIZ. Tek yerden export.
//
// Model: 384 boyutlu vektör, Türkçe + İngilizce, ~120 MB (ilk çağrıda indirilir).
//
// AĞ AYARLARI (isteğe bağlı env var'lar):
//   HF_ENDPOINT           — alternatif mirror (ör: https://hf-mirror.com)
//   HF_HUB_CACHE          — model cache dizini (varsayılan: ~/.cache/huggingface/hub)
//   HF_HUB_ALLOW_LOCAL    — 'true' ise sadece lokalden oku (model indirilmişse)
// ============================================================

const { env } = require('@huggingface/transformers');
const {
  HuggingFaceTransformersEmbeddings,
} = require('@langchain/community/embeddings/huggingface_transformers');

// Mirror desteği: HF_ENDPOINT set edilmişse onu kullan
if (process.env.HF_ENDPOINT) {
  env.remoteHost = process.env.HF_ENDPOINT;
  console.log(`🌐 HF mirror: ${env.remoteHost}`);
}

// Cache dizini override
if (process.env.HF_HUB_CACHE) {
  env.cacheDir = process.env.HF_HUB_CACHE;
}

// Offline / önceden indirilmiş modele zorla
if (process.env.HF_HUB_ALLOW_LOCAL === 'true') {
  env.allowRemoteModels = false;
  env.allowLocalModels = true;
}

const embeddings = new HuggingFaceTransformersEmbeddings({
  model: 'Xenova/paraphrase-multilingual-MiniLM-L12-v2',
});

module.exports = { embeddings };
