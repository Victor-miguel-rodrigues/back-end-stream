"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashSenha = exports.compararSenha = exports.gerarCodigoVerificacao = exports.gerarToken = exports.sha256 = void 0;
const crypto_1 = __importDefault(require("crypto"));
const sha256 = (texto) => {
    console.log(`🔐 sha256 - Entrada: "${texto}"`);
    console.log(`🔐 sha256 - Tipo: ${typeof texto}`);
    console.log(`🔐 sha256 - Tamanho: ${texto?.length}`);
    console.log(`🔐 sha256 - Caracteres:`, [...texto || ''].map(c => `'${c}'`).join(', '));
    const hash = crypto_1.default.createHash('sha256').update(texto).digest('hex');
    console.log(`🔐 sha256 - Hash gerado: "${hash}"`);
    return hash;
};
exports.sha256 = sha256;
const gerarToken = (bytes = 32) => {
    return crypto_1.default.randomBytes(bytes).toString('hex');
};
exports.gerarToken = gerarToken;
const gerarCodigoVerificacao = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};
exports.gerarCodigoVerificacao = gerarCodigoVerificacao;
const compararSenha = (senhaDigitada, senhaHash) => {
    console.log("🔍 COMPARAR SENHA:");
    console.log(`  Senha digitada: "${senhaDigitada}"`);
    console.log(`  Hash banco:     "${senhaHash}"`);
    const hash = (0, exports.sha256)(senhaDigitada);
    console.log(`  Hash calculado: "${hash}"`);
    console.log(`  Resultado: ${hash === senhaHash ? '✅ IGUAIS' : '❌ DIFERENTES'}`);
    return hash === senhaHash;
};
exports.compararSenha = compararSenha;
const hashSenha = (senha) => {
    return (0, exports.sha256)(senha);
};
exports.hashSenha = hashSenha;
//# sourceMappingURL=crypto.js.map