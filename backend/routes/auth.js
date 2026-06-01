// ============================================================
// AUTH ROUTE'LARI  →  /api altına monte edilir
//   POST   /register   kayıt
//   POST   /login      giriş
//   GET    /me         oturum sahibi (auth)
//   PUT    /profile    profil güncelle (auth)
//   PUT    /favorites  favoriler güncelle (auth)
//   DELETE /account    hesap sil (auth)
// Tekrarlı try/catch yok: asyncHandler + ApiError + global errorHandler.
// ============================================================

const express = require('express');
const bcrypt = require('bcryptjs');

const usersService = require('../services/users');
const { authMiddleware, signToken } = require('../middleware/auth');
const { authLimiter } = require('../middleware/security');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { validateRegister, validateLogin } = require('../utils/validation');

const router = express.Router();

// KAYIT
router.post('/register', authLimiter, asyncHandler(async (req, res) => {
    const { name, email, password, passwordConfirm } = req.body;

    const errors = validateRegister({ name, email, password, passwordConfirm });
    if (errors.length > 0) {
        throw ApiError.badRequest(errors[0], { details: { errors } });
    }

    const existing = await usersService.findByEmail(email);
    if (existing) {
        throw ApiError.badRequest('Bu e-posta adresi zaten kayıtlı');
    }

    const created = await usersService.createUser({ name, email, password });
    const user = usersService.publicUser(created);
    const token = signToken(user);

    res.status(201).json({ message: 'Kayıt başarılı', token, user });
}));

// GİRİŞ
router.post('/login', authLimiter, asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const errors = validateLogin({ email, password });
    if (errors.length > 0) {
        throw ApiError.badRequest(errors[0], { details: { errors } });
    }

    const row = await usersService.findByEmail(email);
    if (!row) {
        throw ApiError.unauthorized('E-posta veya şifre hatalı');
    }

    const isMatch = await bcrypt.compare(password, row.password);
    if (!isMatch) {
        throw ApiError.unauthorized('E-posta veya şifre hatalı');
    }

    const user = usersService.publicUser(row);
    const token = signToken(user);

    res.json({ message: 'Giriş başarılı', token, user });
}));

// BEN KİMİM
router.get('/me', authMiddleware, asyncHandler(async (req, res) => {
    const row = await usersService.findById(req.user.id);
    if (!row) {
        throw ApiError.notFound('Kullanıcı bulunamadı');
    }
    res.json({ user: usersService.publicUser(row) });
}));

// PROFİL GÜNCELLE
router.put('/profile', authMiddleware, asyncHandler(async (req, res) => {
    const { name, avatar, allergies } = req.body;
    if (name !== undefined && name.trim().length < 2) {
        throw ApiError.badRequest('İsim en az 2 karakter olmalıdır');
    }
    const updated = await usersService.updateProfile(req.user.id, { name, avatar, allergies });
    if (!updated) {
        throw ApiError.notFound('Kullanıcı bulunamadı');
    }
    res.json({ message: 'Profil güncellendi', user: usersService.publicUser(updated) });
}));

// FAVORİLER GÜNCELLE
router.put('/favorites', authMiddleware, asyncHandler(async (req, res) => {
    const updated = await usersService.updateFavorites(req.user.id, req.body.favorites);
    if (!updated) {
        throw ApiError.notFound('Kullanıcı bulunamadı');
    }
    res.json({
        message: 'Favoriler güncellendi',
        favorites: usersService.publicUser(updated).favorites,
    });
}));

// HESAP SİL
router.delete('/account', authMiddleware, asyncHandler(async (req, res) => {
    const { password } = req.body;
    const row = await usersService.findById(req.user.id);
    if (!row) {
        throw ApiError.notFound('Kullanıcı bulunamadı');
    }
    // Şifre doğrulama (gönderildiyse)
    if (password) {
        const isMatch = await bcrypt.compare(password, row.password);
        if (!isMatch) {
            throw ApiError.unauthorized('Şifre hatalı');
        }
    }
    await usersService.deleteUser(req.user.id);
    res.json({ message: 'Hesap başarıyla silindi' });
}));

module.exports = router;
