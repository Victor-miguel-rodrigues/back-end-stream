export declare const sha256: (texto: string) => string;
export declare const gerarToken: (bytes?: number) => string;
export declare const gerarCodigoVerificacao: () => string;
export declare const compararSenha: (senhaDigitada: string, senhaHash: string) => boolean;
export declare const hashSenha: (senha: string) => string;
export declare const compararSecretSeguro: (a: string, b: string) => boolean;
//# sourceMappingURL=crypto.d.ts.map