// ============================================================
// Ödeme sağlayıcı soyutlaması (iyzico)
// ------------------------------------------------------------
// Şu an PAYMENT_MODE='simulate' ile çalışır: gerçek para hareketi YOK.
// "Ödeme başlat → onayla" akışı, gerçek iyzico'nun
// (checkoutFormInitialize → checkoutForm.retrieve) akışını taklit eder;
// böylece frontend hiç değişmeden gerçek entegrasyona geçilebilir.
//
// GERÇEK iyzico'ya geçiş:
//   1) cd backend && npm i iyzipay
//   2) backend/.env:
//        PAYMENT_MODE=iyzico
//        IYZICO_API_KEY=...
//        IYZICO_SECRET_KEY=...
//        IYZICO_BASE_URL=https://sandbox-api.iyzipay.com   (canlı: https://api.iyzipay.com)
//   3) Aşağıdaki TODO bloklarını gerçek SDK çağrılarıyla doldur.
// ============================================================

const crypto = require('crypto');
const { PREMIUM, PAYMENT_MODE } = require('../config/plans');

function getIyzipayClient() {
    // TODO (gerçek iyzico): const Iyzipay = require('iyzipay');
    // return new Iyzipay({
    //   apiKey: process.env.IYZICO_API_KEY,
    //   secretKey: process.env.IYZICO_SECRET_KEY,
    //   uri: process.env.IYZICO_BASE_URL || 'https://sandbox-api.iyzipay.com',
    // });
    throw new Error('iyzico SDK yapılandırılmadı. `npm i iyzipay` ve .env anahtarlarını ekleyin.');
}

/**
 * Ödeme başlatır.
 * Dönen (simülasyon): { simulated:true, token, amount, currency, message }
 * Dönen (iyzico)     : { simulated:false, token, checkoutFormContent, paymentPageUrl }
 */
async function createCheckout({ user, amount, currency }) {
    if (PAYMENT_MODE === 'iyzico') {
        // TODO (gerçek iyzico):
        // const iyzipay = getIyzipayClient();
        // return new Promise((resolve, reject) => {
        //   iyzipay.checkoutFormInitialize.create({
        //     locale: 'tr', conversationId: user.id,
        //     price: amount.toFixed(2), paidPrice: amount.toFixed(2), currency,
        //     basketId: 'premium', paymentGroup: 'SUBSCRIPTION',
        //     callbackUrl: process.env.IYZICO_CALLBACK_URL,
        //     buyer: { id: user.id, name: user.name, email: user.email, /* ... */ },
        //     basketItems: [{ id: 'premium', name: 'Premium Üyelik', category1: 'Abonelik',
        //                     itemType: 'VIRTUAL', price: amount.toFixed(2) }],
        //   }, (err, result) => err ? reject(err) : resolve({
        //     simulated: false, token: result.token,
        //     checkoutFormContent: result.checkoutFormContent,
        //     paymentPageUrl: result.paymentPageUrl,
        //   }));
        // });
        getIyzipayClient();
    }

    // ── SİMÜLASYON ──
    const token = 'sim_' + crypto.randomBytes(12).toString('hex');
    return {
        simulated: true,
        token,
        amount,
        currency,
        message: 'Simülasyon modu: ödeme onay adımına geçebilirsiniz.',
    };
}

/**
 * Ödemeyi doğrular.
 * Dönen: { success: boolean, providerRef: string }
 */
async function verifyPayment({ token }) {
    if (PAYMENT_MODE === 'iyzico') {
        // TODO (gerçek iyzico):
        // const iyzipay = getIyzipayClient();
        // return new Promise((resolve, reject) => {
        //   iyzipay.checkoutForm.retrieve({ locale: 'tr', token }, (err, result) =>
        //     err ? reject(err)
        //         : resolve({ success: result.paymentStatus === 'SUCCESS', providerRef: result.paymentId }));
        // });
        getIyzipayClient();
    }

    // ── SİMÜLASYON: token formatı geçerliyse başarılı say ──
    const success = typeof token === 'string' && token.startsWith('sim_');
    return { success, providerRef: token };
}

module.exports = { createCheckout, verifyPayment };
