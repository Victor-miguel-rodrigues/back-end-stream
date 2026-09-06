// ============================================
// TIPOS DE USUÁRIO
// ============================================
export interface Usuario {
    id: number;
    nome: string;
    email: string;
    senha_hash: string;
    data_cadastro: Date;
    ativo: boolean;
    ultimo_login?: Date;
    ultimo_ip?: string;
}

export interface UsuarioPublico {
    id: number;
    nome: string;
    email: string;
    ativo: boolean;
}

// ============================================
// TIPOS DE PERFIL
// ============================================
export interface PerfilAcesso {
    id: number;
    nome: string;
    descricao?: string;
    limite_usuarios_logados: number;
    dias_validade: number;
    ativo: boolean;
}

export interface UsuarioPerfil {
    id: number;
    usuario_id: number;
    perfil_id: number;
    data_inicio: Date;
    data_validade?: Date;
    ativo: boolean;
}

// ============================================
// TIPOS DE SESSÃO
// ============================================
export interface Sessao {
    id: number;
    usuario_id: number;
    perfil_id: number;
    token: string;
    data_criacao: Date;
    data_expiracao: Date;
    ip?: string;
    user_agent?: string;
    ativo: boolean;
}

export interface SessaoComUsuario extends Sessao {
    nome: string;
    email: string;
    perfil_nome: string;
    usuario_ativo: boolean;
}

// ============================================
// TIPOS DE LOG
// ============================================
export interface LogSistema {
    id: number;
    usuario_id?: number;
    perfil_id?: number;
    acao: string;
    descricao?: string;
    ip?: string;
    data_log: Date;
}

export interface HistoricoLogin {
    id: number;
    usuario_id: number;
    perfil_id: number;
    data_login: Date;
    data_logout?: Date;
    ip?: string;
    user_agent?: string;
    duracao_minutos?: number;
}

// ============================================
// TIPOS DE REQUISIÇÃO/RESPOSTA
// ============================================
export interface LoginRequest {
    email: string;
    senha: string;
}

export interface LoginResponse {
    status: boolean;
    mensagem: string;
    dados?: {
        usuario: {
            id: number;
            nome: string;
            email: string;
        };
        perfil: string;
        token: string;
        expira_em: string;
    };
}

export interface LogoutRequest {
    token: string;
}

export interface ValidarTokenRequest {
    token: string;
}

export interface ValidarTokenResponse {
    valido: boolean;
    dados?: {
        usuario: {
            id: number;
            nome: string;
            email: string;
            perfil: string;
        };
        expira_em: Date;
    };
    mensagem?: string;
}

export interface PodeLogarRequest {
    email: string;
}

export interface PodeLogarResponse {
    pode: boolean;
    usuario?: {
        id: number;
        nome: string;
        email: string;
    };
    perfil?: string;
    limite?: number;
    logados?: number;
    vagas?: number;
    motivo?: string;
}

export interface StatusPerfilResponse {
    status: boolean;
    dados: Array<{
        id: number;
        perfil: string;
        limite_usuarios_logados: number;
        descricao: string;
        usuarios_logados: number;
        vagas_disponiveis: number;
        total_usuarios_com_perfil: number;
        status: 'Lotado' | 'Disponível';
    }>;
}

// ============================================
// TIPOS DE ERRO
// ============================================
export interface ApiError {
    mensagem: string;
    status?: number;
    stack?: string;
}

export class AppError extends Error {
    public readonly status: number;
    public readonly mensagem: string;

    constructor(mensagem: string, status: number = 400) {
        super(mensagem);
        this.mensagem = mensagem;
        this.status = status;
        Object.setPrototypeOf(this, AppError.prototype);
    }
}

// ============================================
// TIPOS DO REQUEST COM USUÁRIO
// ============================================
export interface RequestWithUser extends Express.Request {
    usuario?: {
        id: number;
        nome: string;
        email: string;
        perfil: string;
        perfil_id: number;
        sessao_id: number;
    };
    token?: string;
}