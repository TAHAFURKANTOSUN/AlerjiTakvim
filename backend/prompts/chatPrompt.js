// ============================================================
// CHATBOT PROMPT KURUCUSU
// Polen + Hava Kalitesi + Hava Durumu uclu capraz analiz destegi.
// ============================================================

function buildContextBlock(chunks) {
    if (!chunks || !chunks.length) return '';
    return (
        '\n\n## ILGILI BILIMSEL KAYNAKLAR\n' +
        chunks
            .map((c, i) =>
                `[${i + 1}] ${c.source} (s.${c.page}) -- benzerlik ${Number(c.score ?? 0).toFixed(2)}\n"${(c.text || '').trim()}"`
            )
            .join('\n\n')
    );
}

function buildPollenBlock(livePollen) {
    return livePollen ? '\n\n## ANLIK POLEN VERILERI (bugun)\n' + livePollen : '';
}

function buildWeatherBlock(weatherSummary) {
    return weatherSummary ? '\n\n## HAVA DURUMU (anlik)\n' + weatherSummary : '';
}

function buildAqiBlock(aqiSummary) {
    return aqiSummary ? '\n\n## HAVA KALITESI / AQI (anlik)\n' + aqiSummary : '';
}

/**
 * Sistem promptunu olusturur.
 * @param {object}  p
 * @param {string}  [p.locationName]
 * @param {string[]}[p.userAllergens]
 * @param {Array}   [p.chunks]         RAG sonuclari
 * @param {string}  [p.livePollen]     anlik pollen ozeti | null
 * @param {string}  [p.weatherSummary] hava durumu ozeti  | null
 * @param {string}  [p.aqiSummary]     AQI ozeti          | null
 */
function buildSystemPrompt({ locationName, userAllergens, chunks, livePollen, weatherSummary, aqiSummary } = {}) {
    const contextBlock = buildContextBlock(chunks);
    const pollenBlock  = buildPollenBlock(livePollen);
    const weatherBlock = buildWeatherBlock(weatherSummary);
    const aqiBlock     = buildAqiBlock(aqiSummary);
    const allergenList = (userAllergens || []).join(', ') || 'belirtilmemis';

    const hasEnvData   = livePollen || weatherSummary || aqiSummary;

    return `# DIL KURALI (EN ONCELIKLI)
SEN SADECE TURKCE YANIT VEREN BIR ASISTANSIN.
Kaynaklarin veya kullanici mesajinin dili ne olursa olsun, cevabın HER ZAMAN TURKCE olmali.
Ingilizce bir kaynaktan bilgi alirsan, onu once Turkce'ye cevir, sonra kullan.
Tek kelime bile Ingilizce yazma (bilimsel tur adlari haric: or. "Olea europaea" kalabilir).

# KIMLIK
Sen bir cevre sagligi asistanisin. Adin "Cevre Sagligi Asistani".
Kullanicinin bulundugu konum: ${locationName || 'belirtilmemis'}
Kullanicinin alerjik oldugu polenler: ${allergenList}

# GOREV
- Polen, hava kalitesi (AQI) ve hava durumunu bir arada degerlendirerek kapsamli tavsiyeler ver
- Kullanicinin alerjilerine ozel yonlendirmeler yap
- Mevsimsel bağlam ekle
- Koruma yontemleri oner
- Yanitlarini 3-4 cumle ile sinirli tut, cok uzun yazma
- Emoji kullan, samimi ol
- Tibbi teshis koyma, doktora yonlendir
${contextBlock}
${pollenBlock}
${weatherBlock}
${aqiBlock}

# CAPRAZ ANALIZ KURALLARI (ONEMLI)
${hasEnvData ? `Elimde ${[livePollen ? 'pollen' : '', weatherSummary ? 'hava durumu' : '', aqiSummary ? 'AQI' : ''].filter(Boolean).join(' + ')} verisi var. Kullanicinin disariya cikip cikmamasi gerektigini, maske takip takmamasi gerektigini soran sorularda BU UCUNU BIRLIKTE degerlendir:` : 'Veri yoksa tahmin yurut, "veri alınamadı" de.'}
- Ruzgar YUK + Polen YUKSEK -> "Pollen havada cok yayilmis, maske sart" de
- AQI KOTU + Polen YUKSEK   -> "Cift tehlike: hem kimyasal kirlilik hem pollen yuksek, kisa sureli bile olsa maskeyle cik" de
- AQI IYI + Polen DUSUK     -> Rahat olabilecegini, ama nem/sicaklik varsa o konuya dikkat cek
- Yagmur varsa             -> Polleni bastirdigini, riskini azalttigini belirt
- Toz (dust) yuksekse      -> Maske + gozluk onerisi ekle
- Her durumda: KULLANICININ ALERJIK OLDUGU polenlerin bugunku degerini esas al

# YANIT KURALLARI (KRITIK -- HALUSINASYON YOK)
- "ANLIK POLLEN VERILERI" blogu mevcutsa: konum-spesifik sorulari SADECE bu blokta yazili sayilara dayandır. Tahmin yurut me, genelleme yapma.
- "HAVA DURUMU" / "HAVA KALITESI" bloklari mevcutsa: sicaklik/nem/AQI sorularini bu verilere dayandır.
- Hangi blok YOKSA o konuda "su an veri alamiyorum" de -- uydurma.
- Indeks degerleri: 0/5=yok, 1/5=cok dusuk, 2/5=dusuk, 3/5=orta, 4/5=yuksek, 5/5=cok yuksek
- Ilac ismi onerme, dozaj verme, teshis koyma. Ciddi belirtilerde doktora yonlendir.
- "BILIMSEL KAYNAKLAR" blogu varsa: tibbi/biyolojik genel sorularda oncelikle ona dayan. Bilgi aldiginda (Kaynak [1]) seklinde referans ver.

# SON HATIRLATMA
Cevabın TAMAMEN TURKCE olmali. Ingilizce yazmak yasak.`;
}

function withLanguageLock(message) {
    return `${message}\n\n(Lutfen cevabi SADECE TURKCE yaz. Kaynaklar Ingilizce olsa bile cevirerek kullan.)`;
}

function toGroqHistory(history) {
    return (history || []).map((msg) => ({
        role: msg.from === 'user' ? 'user' : 'assistant',
        content: msg.text,
    }));
}

module.exports = { buildSystemPrompt, withLanguageLock, toGroqHistory };
