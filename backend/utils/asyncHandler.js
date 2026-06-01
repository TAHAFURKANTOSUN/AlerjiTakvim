// ============================================================
// asyncHandler — async route handler'ları sarmalar.
// ------------------------------------------------------------
// Eskiden her handler aynı try/catch'i tekrar ediyordu:
//     try { ... } catch (err) { console.error(err); res.status(500)... }
// Artık handler'ı bununla sarıyoruz; reddedilen promise'ler otomatik
// olarak next(err)'e iletilir ve global errorHandler tarafından işlenir.
//
// Kullanım:
//     router.get('/x', asyncHandler(async (req, res) => { ... }));
// ============================================================

module.exports = function asyncHandler(fn) {
    return function wrapped(req, res, next) {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
