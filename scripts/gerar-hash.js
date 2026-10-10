// Gera o hash SHA-256 no mesmo formato usado pela API (src/utils/crypto.ts).
// Uso:  node scripts/gerar-hash.js "minhaSenha"
const crypto = require('crypto');

const texto = process.argv[2];
if (!texto) {
    console.error('Uso: node scripts/gerar-hash.js "texto"');
    process.exit(1);
}

// A API remove espacos e caracteres invisiveis antes de gerar o hash
const limpo = texto.replace(/[\s\u200B-\u200D\uFEFF\xA0]/g, '').trim();
console.log(crypto.createHash('sha256').update(limpo).digest('hex'));
