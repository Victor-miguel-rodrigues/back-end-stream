import crypto from 'crypto';

// Função para limpar caracteres invisíveis
const limparTexto = (texto: string): string => {
    if (!texto) return '';
    // Remove caracteres invisíveis: espaços, quebras de linha, tabs, etc.
    return texto.replace(/[\s\u200B-\u200D\uFEFF\xA0]/g, '').trim();
};

export const sha256 = (texto: string): string => {
    // 🔴 LIMPAR O TEXTO ANTES DE GERAR O HASH
    const textoLimpo = limparTexto(texto);
    
    console.log(`🔐 sha256 - Entrada original: "${texto}"`);
    console.log(`🔐 sha256 - Entrada limpa:   "${textoLimpo}"`);
    console.log(`🔐 sha256 - Tipo: ${typeof texto}`);
    console.log(`🔐 sha256 - Tamanho original: ${texto?.length}`);
    console.log(`🔐 sha256 - Tamanho limpo: ${textoLimpo.length}`);
    console.log(`🔐 sha256 - Caracteres originais:`, [...texto || ''].map(c => `'${c}'`).join(', '));
    console.log(`🔐 sha256 - Caracteres limpos:`, [...textoLimpo || ''].map(c => `'${c}'`).join(', '));
    
    const hash = crypto.createHash('sha256').update(textoLimpo).digest('hex');
    console.log(`🔐 sha256 - Hash gerado: "${hash}"`);
    
    return hash;
};

export const gerarToken = (bytes: number = 32): string => {
    return crypto.randomBytes(bytes).toString('hex');
};

export const gerarCodigoVerificacao = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

export const compararSenha = (senhaDigitada: string, senhaHash: string): boolean => {
    // 🔴 LIMPAR A SENHA ANTES DE COMPARAR
    const senhaLimpa = limparTexto(senhaDigitada);
    
    console.log("🔍 COMPARAR SENHA:");
    console.log(`  Senha original: "${senhaDigitada}"`);
    console.log(`  Senha limpa:    "${senhaLimpa}"`);
    console.log(`  Hash banco:     "${senhaHash}"`);
    
    const hash = sha256(senhaLimpa);
    console.log(`  Hash calculado: "${hash}"`);
    console.log(`  Resultado: ${hash === senhaHash ? '✅ IGUAIS' : '❌ DIFERENTES'}`);
    
    return hash === senhaHash;
};

export const hashSenha = (senha: string): string => {
    return sha256(senha);
};