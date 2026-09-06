"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashSenha = exports.compararSenha = exports.gerarCodigoVerificacao = exports.gerarToken = exports.sha256 = void 0;
const crypto_1 = __importDefault(require("crypto"));
// Função para limpar caracteres invisíveis
const limparTexto = (texto) => {
    if (!texto)
        return '';
    // Remove caracteres invisíveis: espaços, quebras de linha, tabs, etc.
    return texto.replace(/[\s\u200B-\u200D\uFEFF\xA0]/g, '').trim();
};
const sha256 = (texto) => {
    // 🔴 LIMPAR O TEXTO ANTES DE GERAR O HASH
    const textoLimpo = limparTexto(texto);
    console.log(`🔐 sha256 - Entrada original: "${texto}"`);
    console.log(`🔐 sha256 - Entrada limpa:   "${textoLimpo}"`);
    console.log(`🔐 sha256 - Tipo: ${typeof texto}`);
    console.log(`🔐 sha256 - Tamanho original: ${texto?.length}`);
    console.log(`🔐 sha256 - Tamanho limpo: ${textoLimpo.length}`);
    console.log(`🔐 sha256 - Caracteres originais:`, [...texto || ''].map(c => `'${c}'`).join(', '));
    console.log(`🔐 sha256 - Caracteres limpos:`, [...textoLimpo || ''].map(c => `'${c}'`).join(', '));
    const hash = crypto_1.default.createHash('sha256').update(textoLimpo).digest('hex');
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
    // 🔴 LIMPAR A SENHA ANTES DE COMPARAR
    const senhaLimpa = limparTexto(senhaDigitada);
    console.log("🔍 COMPARAR SENHA:");
    console.log(`  Senha original: "${senhaDigitada}"`);
    console.log(`  Senha limpa:    "${senhaLimpa}"`);
    console.log(`  Hash banco:     "${senhaHash}"`);
    const hash = (0, exports.sha256)(senhaLimpa);
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