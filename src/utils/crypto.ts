import crypto from 'crypto';

export const sha256 = (texto: string): string => {
    console.log(`🔐 sha256 - Entrada: "${texto}"`);
    console.log(`🔐 sha256 - Tipo: ${typeof texto}`);
    console.log(`🔐 sha256 - Tamanho: ${texto?.length}`);
    console.log(`🔐 sha256 - Caracteres:`, [...texto || ''].map(c => `'${c}'`).join(', '));
    
    const hash = crypto.createHash('sha256').update(texto).digest('hex');
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
    console.log("🔍 COMPARAR SENHA:");
    console.log(`  Senha digitada: "${senhaDigitada}"`);
    console.log(`  Hash banco:     "${senhaHash}"`);
    
    const hash = sha256(senhaDigitada);
    console.log(`  Hash calculado: "${hash}"`);
    console.log(`  Resultado: ${hash === senhaHash ? '✅ IGUAIS' : '❌ DIFERENTES'}`);
    
    return hash === senhaHash;
};

export const hashSenha = (senha: string): string => {
    return sha256(senha);
};