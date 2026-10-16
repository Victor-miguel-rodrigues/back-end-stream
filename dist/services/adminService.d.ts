export declare class AdminService {
    verificarCredenciais(email: string, senha: string): Promise<{
        admin_id: number;
        nome: string;
        email: string;
    }>;
    verificarPalavraSecreta(admin_id: number, palavra_secreta: string): Promise<{
        token: string;
        expira_em: Date;
    }>;
    criarSessaoAdmin(admin_id: number, token: string, expira_em: Date, ip: string, userAgent: string): Promise<void>;
    validarTokenAdmin(token: string): Promise<{
        admin_id: number;
        nome: string;
        email: string;
        permissoes: string[];
    } | null>;
    logoutAdmin(token: string): Promise<void>;
    getDashboardData(): Promise<{
        total_usuarios: number;
        ativos: number;
        inativos: number;
        ganhos_mes: number;
        ultimos_logins: any[];
        pendentes: any[];
    }>;
    listarUsuarios(page?: number, limit?: number, search?: string, pago?: boolean, ativo?: boolean): Promise<{
        dados: any[];
        total: number;
        total_paginas: number;
    }>;
    marcarUsuarioPago(usuario_id: number, admin_id: number, ip: string, valor?: unknown): Promise<void>;
    desmarcarUsuarioPago(usuario_id: number, admin_id: number, ip: string): Promise<void>;
    verificarPermissao(admin_id: number, permissao: string): Promise<boolean>;
    logAdminAction(admin_id: number, acao: string, descricao: string, ip: string, dados_acao?: any): Promise<void>;
    registrarLog(dados: {
        admin_id?: number;
        usuario_id?: number;
        acao: string;
        descricao?: string;
        ip?: string;
        user_agent?: string;
        dados?: any;
    }): Promise<void>;
    excluirUsuario(usuario_id: number, admin_id: number, ip: string): Promise<void>;
    listarPermissoes(): Promise<any[]>;
    getPermissoesAdmin(admin_id: number): Promise<string[]>;
    setPermissoesAdmin(admin_id: number, permissoes: string[]): Promise<void>;
    listarAdmins(): Promise<any[]>;
    buscarAdmin(admin_id: number): Promise<any | null>;
    criarAdmin(dados: {
        nome: string;
        email: string;
        senha: string;
        permissoes?: string[];
    }): Promise<any>;
    atualizarAdmin(admin_id: number, dados: {
        nome?: string;
        email?: string;
        senha?: string;
        permissoes?: string[];
        ativo?: boolean;
    }): Promise<any>;
    excluirAdmin(admin_id: number): Promise<boolean>;
    listarLogs(opts: {
        page?: number;
        limit?: number;
        admin_id?: number;
        acao?: string;
        desde?: string;
        ate?: string;
    }): Promise<{
        dados: any[];
        total: number;
        total_paginas: number;
    }>;
    listarLogins(opts: {
        page?: number;
        limit?: number;
        usuario_id?: number;
        busca?: string;
    }): Promise<{
        dados: any[];
        total: number;
        total_paginas: number;
    }>;
    listarSessoesAdmin(opts?: {
        page?: number;
        limit?: number;
        apenas_ativas?: boolean;
    }): Promise<{
        dados: any[];
        total: number;
        total_paginas: number;
    }>;
    revogarSessaoAdmin(sessao_id: number): Promise<boolean>;
    revogarSessoesAdmin(admin_id: number): Promise<number>;
    limparSessoesInativasAdmin(): Promise<number>;
    private validarRenovacao;
    private aplicarRenovacao;
    renovarUsuario(usuario_id: number, admin_id: number, ip: string, opcoes: {
        dias?: unknown;
        data_validade?: unknown;
        valor?: unknown;
    }): Promise<{
        validade_anterior: Date | null;
        validade_nova: Date;
        valor: number;
        dias: number | null;
    }>;
    listarPagamentos(opts?: {
        page?: number;
        limit?: number;
        usuario_id?: number;
        busca?: string;
    }): Promise<{
        dados: any[];
        total: number;
        total_paginas: number;
        soma: number;
    }>;
    resumoPagamentos(): Promise<{
        total_geral: number;
        total_pagamentos: number;
        mes_atual: number;
        pagamentos_mes_atual: number;
        por_mes: Array<{
            mes: string;
            total: number;
            quantidade: number;
        }>;
    }>;
    private encerrarSessoesUsuario;
    alterarBloqueioUsuario(usuario_id: number, admin_id: number, ip: string, bloquear: boolean, motivo?: unknown): Promise<{
        sessoes_encerradas: number;
    }>;
    listarSessoesUsuario(usuario_id: number): Promise<{
        usuario: any;
        sessoes: any[];
        ips: any[];
        logins: any[];
    }>;
    deslogarUsuario(usuario_id: number, admin_id: number, ip: string): Promise<{
        sessoes_encerradas: number;
    }>;
    listarIpsSuspeitos(dias?: number, minimo?: number): Promise<any[]>;
    salvarComprovante(dados: {
        email: string;
        imagem: Buffer;
        mime: string;
        ip: string;
        userAgent: string;
    }): Promise<number>;
    listarComprovantes(opts?: {
        status?: string;
        page?: number;
        limit?: number;
        busca?: string;
    }): Promise<{
        dados: any[];
        total: number;
        total_paginas: number;
        pendentes: number;
    }>;
    buscarImagemComprovante(id: number): Promise<{
        mime: string;
        imagem: Buffer;
    }>;
    confirmarComprovante(id: number, admin_id: number, ip: string, opcoes: {
        dias?: unknown;
        data_validade?: unknown;
        valor?: unknown;
    }): Promise<{
        validade_anterior: Date | null;
        validade_nova: Date;
        valor: number;
        dias: number | null;
    }>;
    recusarComprovante(id: number, admin_id: number, ip: string, motivo?: unknown): Promise<void>;
}
declare const _default: AdminService;
export default _default;
//# sourceMappingURL=adminService.d.ts.map