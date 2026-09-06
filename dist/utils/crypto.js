"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashSenha = exports.compararSenha = exports.gerarCodigoVerificacao = exports.gerarToken = exports.sha256 = void 0;
const crypto_1 = __importDefault(require("crypto"));
const sha256 = (texto) => {
    return crypto_1.default.createHash('sha256').update(texto).digest('hex');
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
    return (0, exports.sha256)(senhaDigitada) === senhaHash;
};
exports.compararSenha = compararSenha;
const hashSenha = (senha) => {
    return (0, exports.sha256)(senha);
};
exports.hashSenha = hashSenha;
//# sourceMappingURL=crypto.js.map