// ============================================================
// BUILD INDEX — makaleler/ → chunks → embeddings → JSON indeks
//
// Kullanım:
//   node rag/build-index.js
//
// Çıktı: data/vector-store.json
//   {
//     model: "Xenova/paraphrase-multilingual-MiniLM-L12-v2",
//     dimension: 384,
//     items: [{ content, embedding: [0.12, -0.08, ...], metadata }, ...]
//   }
//
// Bu script'i YALNIZCA makaleler/ klasörü değiştiğinde
// tekrar çalıştırman gerekir.
//
// NOT: Native binding (hnswlib-node vs.) gerektirmeyen saf JSON
// persistence kullanıyoruz — Node'un tüm sürümlerinde çalışır.
// MemoryVectorStore runtime'da cosine similarity yapar.
// ============================================================

const fs = require('fs');
const path = require('path');
const { Document } = require('@langchain/core/documents');
const { MemoryVectorStore } = require('@langchain/classic/vectorstores/memory');
const { processAllPDFsInFolder } = require('../pdf-processor');
const { embeddings } = require('./embeddings');

const PDF_DIR = path.resolve(__dirname, '..', 'makaleler');
const INDEX_FILE = path.resolve(__dirname, '..', 'data', 'vector-store.json');
const MODEL_NAME = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';

async function build() {
  // 1) PDF → chunks
  const chunks = await processAllPDFsInFolder(PDF_DIR);

  console.log(`\n🧮 ${chunks.length} chunk embedding'e gönderiliyor...`);
  console.log('   (İlk çalıştırma: model indirilirken ~120 MB, sonra hızlı)\n');

  // 2) Tüm chunk'ları embed et
  const t0 = Date.now();
  const texts = chunks.map((c) => c.pageContent);
  const vectors = await embeddings.embedDocuments(texts);
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`✅ Embedding tamamlandı: ${vectors.length} vektör, ${elapsed}s`);

  // 3) JSON olarak kaydet
  const payload = {
    model: MODEL_NAME,
    dimension: vectors[0]?.length ?? 0,
    createdAt: new Date().toISOString(),
    items: chunks.map((c, i) => ({
      content: c.pageContent,
      embedding: vectors[i],
      metadata: c.metadata,
    })),
  };

  fs.mkdirSync(path.dirname(INDEX_FILE), { recursive: true });
  fs.writeFileSync(INDEX_FILE, JSON.stringify(payload));
  const sizeMB = (fs.statSync(INDEX_FILE).size / 1024 / 1024).toFixed(1);
  console.log(`💾 Kaydedildi: ${INDEX_FILE} (${sizeMB} MB, ${payload.dimension} dim)`);

  // 4) Sanity check: gerçekten sorgulanabiliyor mu?
  const store = new MemoryVectorStore(embeddings);
  await store.addVectors(
    vectors,
    chunks.map((c) => new Document({ pageContent: c.pageContent, metadata: c.metadata })),
  );

  const probe = await store.similaritySearchWithScore('polen alerjisi belirtileri', 2);
  console.log('\n🔎 Sanity check — "polen alerjisi belirtileri":');
  probe.forEach(([doc, score], i) => {
    console.log(`  ${i + 1}. [${doc.metadata.source} s.${doc.metadata.page}] skor=${score.toFixed(3)}`);
    console.log(`     "${doc.pageContent.slice(0, 140).replace(/\s+/g, ' ')}..."`);
  });
}

build().catch((err) => {
  console.error('\n❌ Index oluşturma hatası:', err);
  process.exit(1);
});
