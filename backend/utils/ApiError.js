// ============================================================
// ApiError — kontrollü HTTP hataları için tek tip hata sınıfı.
// ------------------------------------------------------------
// Route içinde `throw new ApiError(400, 'Geçersiz veri')` dersiniz;
// global errorHandler bunu doğru status + JSON gövdesine çevirir.
// Beklenen (operasyonel) hatalar `isOperational=true` taşır; böylece
// errorHandler bunları 500 yerine kullanıcıya gösterilebilir sayar.
// ============================================================

class ApiError extends Error {
    /**
     * @param {number} statusCode  HTTP durum kodu (400, 401, 404, 502 ...)
     * @param {string} message     Kullanıcıya gösterilebilir mesaj
     * @param {object} [opts]
     * @param {string} [opts.code]     Makine-okunur kod (frontend için, ör. 'QUOTA_EXCEEDED')
     * @param {object} [opts.details]  Ek alanlar (errors dizisi vb.)
     */
    constructor(statusCode, message, { code, details } = {}) {
        super(message);
        this.name = 'ApiError';
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.isOperational = true;
        Error.captureStackTrace?.(this, ApiError);
    }

    static badRequest(message, opts) { return new ApiError(400, message, opts); }
    static unauthorized(message, opts) { return new ApiError(401, message, opts); }
    static notFound(message, opts) { return new ApiError(404, message, opts); }
}

module.exports = ApiError;
