"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validarUsuario = validarUsuario;
exports.validarLogin = validarLogin;
function validarUsuario(req, res, next) {
    const { nome, email, senha } = req.body;
    if (!nome || typeof nome !== "string" || nome.trim() === "") {
        return res.status(400).json({
            status: false,
            message: "Nome é obrigatório"
        });
    }
    if (!email || typeof email !== "string" || email.trim() === "") {
        return res.status(400).json({
            status: false,
            message: "Email é obrigatório"
        });
    }
    if (!senha || typeof senha !== "string" || senha.trim() === "") {
        return res.status(400).json({
            status: false,
            message: "senha é obrigatório"
        });
    }
    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailValido.test(email)) {
        return res.status(400).json({
            status: false,
            message: "Email inválido"
        });
    }
    next();
}
function validarLogin(req, res, next) {
    const { email, senha } = req.body;
    if (!email || typeof email !== "string") {
        return res.status(400).json({
            status: false,
            message: "Email é obrigatório"
        });
    }
    if (!senha || typeof senha !== "string") {
        return res.status(400).json({
            status: false,
            message: "Senha é obrigatória"
        });
    }
    next();
}
//# sourceMappingURL=userValidator.js.map