import crypto from 'crypto';

// Remove caracteres invisíveis e espaços extras
const limparTexto = (texto: string): string => {
    if (!texto) return '';
    return texto.replace(/[\s\u200B-\u200D\uFEFF\xA0]/g, '').trim();
};

export const sha256 = (texto: string): string => {
    const textoLimpo = limparTexto(texto);
    return crypto.createHash('sha256').update(textoLimpo).digest('hex');
};

export const gerarToken = (bytes: number = 32): string => {
    return crypto.randomBytes(bytes).toString('hex');
};

export const gerarCodigoVerificacao = (): string => {
    return crypto.randomInt(100000, 1000000).toString();
};

export const compararSenha = (senhaDigitada: string, senhaHash: string): boolean => {
    const senhaLimpa = limparTexto(senhaDigitada);
    const hashCalculado = sha256(senhaLimpa);

    try {
        const bufA = Buffer.from(hashCalculado, 'hex');
        const bufB = Buffer.from(senhaHash, 'hex');
        if (bufA.length !== bufB.length) return false;
        return crypto.timingSafeEqual(bufA, bufB);
    } catch {
        return false;
    }
};

export const hashSenha = (senha: string): string => {
    return sha256(senha);
};

export const compararSecretSeguro = (a: string, b: string): boolean => {
    try {
        const bufA = Buffer.from(a);
        const bufB = Buffer.from(b);
        if (bufA.length !== bufB.length) {
            // Compara de qualquer forma para evitar timing oracle
            const pad = Buffer.alloc(bufA.length);
            crypto.timingSafeEqual(pad, pad);
            return false;
        }
        return crypto.timingSafeEqual(bufA, bufB);
    } catch {
        return false;
    }
};