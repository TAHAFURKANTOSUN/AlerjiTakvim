// ============================================================
// RETRIEVER — data/vector-store.json'u RAM'e yükler ve sorgular
//
// Kullanım:
//   const { retrieveRelevantChunks } = require('./rag/retriever');
//   const hits = await retrieveRelevantChunks('polen alerjisi belirtileri');
//   // → [{ text, source, page, score }, ...]
//
// Indeks sunucu başında BIR KEZ yüklenir (lazy singleton).
// Sonraki sorgular RAM'de cosine similarity ile çalışır.
// ============================================================

const fs = require('fs');
const path = require('path');
const { Document } = require('@langchain/core/documents');
const { MemoryVectorStore } = require('@langchain/classic/vectorstores/memory');
const { embeddings } = require('./embeddings');

const INDEX_FILE = path.resolve(__dirname, '..', 'data', 'vector-store.json');

let storePromise = null;

async function loadStore() {
  if (!fs.existsSync(INDEX_FILE)) {
    throw new Error(
      `Indeks bulunamadı: ${INDEX_FILE}\n` +
      `Önce şu komutu çalıştır: node rag/build-index.js`,
    );
  }

  const payload = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));

  const store = new MemoryVectorStore(embeddings);
  await store.addVectors(
    payload.items.map((x) => x.embedding),
    payload.items.map(
      (x) => new Document({ pageContent: x.content, metadata: x.metadata }),
    ),
  );

  console.log(
    `📖 ${payload.items.length} vektör RAM'e yüklendi (${payload.model}, ${payload.dimension} dim).`,
  );
  return store;
}

/** Store'u lazy yükler; sonraki çağrılarda cache'ten döner. */
function getVectorStore() {
  if (!storePromise) storePromise = loadStore();
  return storePromise;
}

/**
 * Soruya en yakın `k` makale parçasını cosine similarity ile bulur.
 * @param {string} query
 * @param {number} k
 * @returns {Promise<Array<{text:string, source:string, page:number|null, score:number}>>}
 */
async function retrieveRelevantChunks(query, k = 3) {
  const store = await getVectorStore();
  const results = await store.similaritySearchWithScore(query, k);
  return results.map(([doc, score]) => ({
    text: doc.pageContent,
    source: doc.metadata.source,
    page: doc.metadata.page,
    score, // cosine similarity: yüksek = daha benzer (0..1)
  }));
}

module.exports = { retrieveRelevantChunks, getVectorStore };

// CLI: node rag/retriever.js "sorgu metni"
if (require.main === module) {
  const query = process.argv.slice(2).join(' ').trim();
  if (!query) {
    console.log('Kullanım: node rag/retriever.js "sorgu metni"');
    process.exit(1);
  }
  retrieveRelevantChunks(query, 3)
    .then((hits) => {
      console.log(`\n🔎 "${query}" için en iyi 3 sonuç:\n`);
      hits.forEach((h, i) => {
        console.log(`${i + 1}. [${h.source} s.${h.page}] skor=${h.score.toFixed(3)}`);
        console.log(`   "${h.text.slice(0, 220).replace(/\s+/g, ' ')}..."\n`);
      });
    })
    .catch((err) => {
      console.error('❌ Hata:', err);
      process.exit(1);
    });
}
