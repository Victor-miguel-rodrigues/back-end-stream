"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.compararSecretSeguro = exports.hashSenha = exports.compararSenha = exports.gerarCodigoVerificacao = exports.gerarToken = exports.sha256 = void 0;
const crypto_1 = __importDefault(require("crypto"));
// Remove caracteres invisíveis e espaços extras
const limparTexto = (texto) => {
    if (!texto)
        return '';
    return texto.replace(/[\s\u200B-\u200D\uFEFF\xA0]/g, '').trim();
};
const sha256 = (texto) => {
    const textoLimpo = limparTexto(texto);
    return crypto_1.default.createHash('sha256').update(textoLimpo).digest('hex');
};
exports.sha256 = sha256;
const gerarToken = (bytes = 32) => {
    return crypto_1.default.randomBytes(bytes).toString('hex');
};
exports.gerarToken = gerarToken;
const gerarCodigoVerificacao = () => {
    return crypto_1.default.randomInt(100000, 1000000).toString();
};
exports.gerarCodigoVerificacao = gerarCodigoVerificacao;
const compararSenha = (senhaDigitada, senhaHash) => {
    const senhaLimpa = limparTexto(senhaDigitada);
    const hashCalculado = (0, exports.sha256)(senhaLimpa);
    try {
        const bufA = Buffer.from(hashCalculado, 'hex');
        const bufB = Buffer.from(senhaHash, 'hex');
        if (bufA.length !== bufB.length)
            return false;
        return crypto_1.default.timingSafeEqual(bufA, bufB);
    }
    catch {
        return false;
    }
};
exports.compararSenha = compararSenha;
const hashSenha = (senha) => {
    return (0, exports.sha256)(senha);
};
exports.hashSenha = hashSenha;
const compararSecretSeguro = (a, b) => {
    try {
        const bufA = Buffer.from(a);
        const bufB = Buffer.from(b);
        if (bufA.length !== bufB.length) {
            // Compara de qualquer forma para evitar timing oracle
            const pad = Buffer.alloc(bufA.length);
            crypto_1.default.timingSafeEqual(pad, pad);
            return false;
        }
        return crypto_1.default.timingSafeEqual(bufA, bufB);
    }
    catch {
        return false;
    }
};
exports.compararSecretSeguro = compararSecretSeguro;
//# sourceMappingURL=crypto.js.map