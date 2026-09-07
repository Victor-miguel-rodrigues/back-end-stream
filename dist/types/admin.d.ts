import { Request } from "express";
export interface Administrador {
    id: number;
    nome: string;
    email: string;
    senha_hash: string;
    palavra_secreta_hash: string;
    ativo: boolean;
    ultimo_login?: Date;
    ultimo_ip?: string;
    data_criacao: Date;
}
export interface AdminPublico {
    id: number;
    nome: string;
    email: string;
    ativo: boolean;
    permissoes?: string[];
}
export interface PermissaoAdmin {
    id: number;
    nome: string;
    descricao?: string;
    ativo: boolean;
}
export interface SessaoAdmin {
    id: number;
    admin_id: number;
    token: string;
    data_criacao: Date;
    data_expiracao: Date;
    ip?: string;
    user_agent?: string;
    ativo: boolean;
}
export interface LogAdmin {
    id: number;
    admin_id?: number;
    acao: string;
    descricao?: string;
    ip?: string;
    dados_acao?: any;
    data_log: Date;
}
export interface ConfiguracaoAdmin {
    id: number;
    chave: string;
    valor: string;
    descricao?: string;
    atualizado_em: Date;
}
export interface AdminLoginRequest {
    email: string;
    senha: string;
}
export interface AdminPalavraSecretaRequest {
    admin_id: number;
    palavra_secreta: string;
}
export interface AdminLoginResponse {
    status: boolean;
    mensagem: string;
    dados?: {
        admin: AdminPublico;
        token: string;
        expira_em: string;
    };
}
export interface DashboardData {
    total_usuarios: number;
    ativos: number;
    inativos: number;
    ganhos_mes: number;
    ultimos_logins: Array<{
        nome_usuario: string;
        ip: string;
        data_login: Date;
        sucesso: boolean;
    }>;
    pendentes: Array<{
        id: number;
        nome_usuario: string;
        email: string;
    }>;
}
export declare class AppError extends Error {
    readonly status: number;
    readonly mensagem: string;
    constructor(mensagem: string, status?: number);
}
export interface RequestWithAdmin extends Request {
    admin?: {
        admin_id: number;
        nome: string;
        email: string;
        permissoes: string[];
    };
    token?: string;
}
//# sourceMappingURL=admin.d.ts.map