import { PoolClient } from 'pg';
export interface CodigoLogin {
    codigo: string;
    ativo: boolean;
    data_criacao: Date;
    data_expiracao: Date;
}
export declare function buscarCodigoLoginAtivo(usuarioId: number): Promise<CodigoLogin | null>;
export declare function gerarCodigoLogin(usuarioId: number): Promise<{
    criado: boolean;
    dados: CodigoLogin;
}>;
export declare const normalizarCodigoExterno: (valor: unknown) => string | null;
export declare function salvarCodigoLogin(usuarioId: number, codigo: string): Promise<CodigoLogin | 'EM_USO'>;
export declare function disableOfCodLogin(usuarioId: number, client?: PoolClient): Promise<boolean>;
//# sourceMappingURL=codigoLoginService.d.ts.map