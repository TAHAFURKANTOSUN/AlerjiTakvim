// ============================================================
// PDF PROCESSOR — makaleler/ klasöründeki PDF'leri chunk'lara böler
// LangChain v1.x (CommonJS)
//
// Kullanım:
//   const { processAllPDFsInFolder } = require('./pdf-processor');
//   const chunks = await processAllPDFsInFolder('./makaleler');
//
// Bu dosyayı doğrudan `node pdf-processor.js` ile çalıştırırsan
// smoke test yapar ve ilk chunk'ı ekrana basar.
// ============================================================

const fs = require('fs');
const path = require('path');
const { PDFLoader } = require('@langchain/community/document_loaders/fs/pdf');
const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');

/**
 * Belirtilen klasördeki tüm PDF'leri yükler, sayfalara ayırır,
 * sonra chunk'lara böler ve LangChain Document[] döndürür.
 *
 * Her Document:
 *   pageContent: ~1000 karakterlik metin parçası
 *   metadata:    { source: "dosya-adi.pdf", page: 3, chunkIndex: 12 }
 */
async function processAllPDFsInFolder(folderPath = './makaleler') {
  const absFolder = path.resolve(folderPath);

  if (!fs.existsSync(absFolder)) {
    throw new Error(`Klasör bulunamadı: ${absFolder}`);
  }

  const pdfFiles = fs
    .readdirSync(absFolder)
    .filter((f) => path.extname(f).toLowerCase() === '.pdf');

  if (pdfFiles.length === 0) {
    throw new Error(`${absFolder} altında PDF yok.`);
  }

  console.log(`📚 ${pdfFiles.length} PDF bulundu: ${pdfFiles.join(', ')}\n`);

  // 1) Her PDF'i sayfa bazında yükle (page metadata'sı korunur)
  const allPageDocs = [];
  for (const fileName of pdfFiles) {
    const fullPath = path.join(absFolder, fileName);
    try {
      const loader = new PDFLoader(fullPath, { splitPages: true });
      const pages = await loader.load();

      // LangChain PDFLoader metadata.source'a tam path koyar — sadece dosya adını tutalım
      for (const page of pages) {
        page.metadata = {
          source: fileName,
          page:
            page.metadata?.loc?.pageNumber ??
            page.metadata?.pageNumber ??
            null,
        };
      }

      allPageDocs.push(...pages);
      console.log(`  ✓ ${fileName} — ${pages.length} sayfa`);
    } catch (err) {
      console.warn(`  ✗ ${fileName} okunamadı: ${err.message}`);
    }
  }

  if (allPageDocs.length === 0) {
    throw new Error('Hiçbir PDF başarıyla okunamadı.');
  }

  // 2) Sayfa dokümanlarını anlamlı chunk'lara böl
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
    separators: ['\n\n', '\n', '. ', ' ', ''],
  });

  const chunks = await splitter.splitDocuments(allPageDocs);
  chunks.forEach((c, i) => {
    c.metadata.chunkIndex = i;
  });

  console.log(`\n✂️  Toplam ${chunks.length} chunk üretildi.`);
  return chunks;
}

module.exports = { processAllPDFsInFolder };

// --- Doğrudan çalıştırılırsa smoke test ---
if (require.main === module) {
  processAllPDFsInFolder('./makaleler')
    .then((chunks) => {
      console.log('\n--- Örnek chunk[0] ---');
      console.log('pageContent:', (chunks[0]?.pageContent || '').slice(0, 300), '...');
      console.log('metadata:', chunks[0]?.metadata);
      console.log('\n--- Örnek chunk[son] ---');
      console.log('metadata:', chunks[chunks.length - 1]?.metadata);
    })
    .catch((err) => {
      console.error('❌ Hata:', err);
      process.exit(1);
    });
}
