// ==========================================
// FORM VALIDASYON FONKSİYONLARI
// ==========================================

export function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

export function validateLoginForm(email, password) {
    const errors = {};

    if (!email || !email.trim()) {
        errors.email = 'E-posta adresi gerekli';
    } else if (!validateEmail(email.trim())) {
        errors.email = 'Geçerli bir e-posta adresi girin';
    }

    if (!password) {
        errors.password = 'Şifre gerekli';
    } else if (password.length < 6) {
        errors.password = 'Şifre en az 6 karakter olmalıdır';
    }

    return errors;
}

export function validateRegisterForm(name, email, password, passwordConfirm) {
    const errors = {};

    if (!name || name.trim().length < 2) {
        errors.name = 'İsim en az 2 karakter olmalıdır';
    }

    if (!email || !email.trim()) {
        errors.email = 'E-posta adresi gerekli';
    } else if (!validateEmail(email.trim())) {
        errors.email = 'Geçerli bir e-posta adresi girin';
    }

    if (!password) {
        errors.password = 'Şifre gerekli';
    } else if (password.length < 6) {
        errors.password = 'Şifre en az 6 karakter olmalıdır';
    } else {
        if (!/[a-zA-ZığüşöçİĞÜŞÖÇ]/.test(password)) {
            errors.password = 'Şifre en az 1 harf içermelidir';
        } else if (!/[0-9]/.test(password)) {
            errors.password = 'Şifre en az 1 rakam içermelidir';
        }
    }

    if (!passwordConfirm) {
        errors.passwordConfirm = 'Şifre tekrarı gerekli';
    } else if (password !== passwordConfirm) {
        errors.passwordConfirm = 'Şifreler eşleşmiyor';
    }

    return errors;
}
