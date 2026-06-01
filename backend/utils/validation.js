// ============================================================
// Girdi doğrulama yardımcıları (auth uçları için).
// app.js içinden buraya taşındı — route'lar ince kalsın diye.
// Her fonksiyon hata mesajlarından oluşan bir dizi döner ([] = geçerli).
// ============================================================

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN = 6;
const NAME_MIN = 2;

function isValidEmail(email) {
    return EMAIL_RE.test(String(email || ''));
}

function validateRegister({ name, email, password, passwordConfirm }) {
    const errors = [];

    if (!name || name.trim().length < NAME_MIN) {
        errors.push(`İsim en az ${NAME_MIN} karakter olmalıdır`);
    }
    if (!isValidEmail(email)) {
        errors.push('Geçerli bir e-posta adresi girin');
    }
    if (!password || password.length < PASSWORD_MIN) {
        errors.push(`Şifre en az ${PASSWORD_MIN} karakter olmalıdır`);
    }
    if (password && !/[a-zA-ZığüşöçİĞÜŞÖÇ]/.test(password)) {
        errors.push('Şifre en az 1 harf içermelidir');
    }
    if (password && !/[0-9]/.test(password)) {
        errors.push('Şifre en az 1 rakam içermelidir');
    }
    if (password !== passwordConfirm) {
        errors.push('Şifreler eşleşmiyor');
    }

    return errors;
}

function validateLogin({ email, password }) {
    const errors = [];
    if (!isValidEmail(email)) {
        errors.push('Geçerli bir e-posta adresi girin');
    }
    if (!password || password.length < PASSWORD_MIN) {
        errors.push(`Şifre en az ${PASSWORD_MIN} karakter olmalıdır`);
    }
    return errors;
}

module.exports = { isValidEmail, validateRegister, validateLogin };
