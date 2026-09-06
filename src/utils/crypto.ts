import crypto from 'crypto';

export const sha256 = (texto: string): string => {
    return crypto.createHash('sha256').update(texto).digest('hex');
};

export const gerarToken = (bytes: number = 32): string => {
    return crypto.randomBytes(bytes).toString('hex');
};

export const gerarCodigoVerificacao = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

export const compararSenha = (senhaDigitada: string, senhaHash: string): boolean => {
    return sha256(senhaDigitada) === senhaHash;
};

export const hashSenha = (senha: string): string => {
    return sha256(senha);
};