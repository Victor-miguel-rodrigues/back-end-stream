// ============================================
// ADMIN SERVICE - 1FN, 2FN, 3FN
// ============================================

import { query, transaction } from "../database/connection";
import { gerarToken, compararSenha } from "../utils/crypto";
import { AppError } from "../types/admin";
import { PoolClient } from "pg";

export class AdminService {
    // ============================================
    // LOGIN - PASSO 1: VERIFICAR EMAIL + SENHA
    // ============================================
    async verificarCredenciais(email: string, senha: string): Promise<{ admin_id: number; nome: string; email: string }> {
        const result = await query(
            `SELECT id, nome, email, senha_hash, ativo 
             FROM administradores 
             WHERE email = $1`,
            [email]
        );

        if (result.rows.length === 0) {
            throw new AppError("Email ou senha incorretos", 401);
        }

        const admin = result.rows[0];

        if (!admin.ativo) {
            throw new AppError("Administrador desativado", 403);
        }

        if (!compararSenha(senha, admin.senha_hash)) {
            throw new AppError("Email ou senha incorretos", 401);
        }

        return {
            admin_id: admin.id,
            nome: admin.nome,
            email: admin.email
        };
    }

    // ============================================
    // LOGIN - PASSO 2: VERIFICAR PALAVRA SECRETA
    // ============================================
    async verificarPalavraSecreta(admin_id: number, palavra_secreta: string): Promise<{ token: string; expira_em: Date }> {
        const result = await query(
            `SELECT palavra_secreta_hash FROM administradores WHERE id = $1`,
            [admin_id]
        );

        if (result.rows.length === 0) {
            throw new AppError("Administrador nao encontrado", 404);
        }

        if (!compararSenha(palavra_secreta, result.rows[0].palavra_secreta_hash)) {
            throw new AppError("Palavra secreta incorreta", 401);
        }

        const token = gerarToken();
        const expira_em = new Date(Date.now() + 24 * 60 * 60 * 1000);

        return { token, expira_em };
    }

    // ============================================
    // CRIAR SESSÃO ADMIN
    // ============================================
    async criarSessaoAdmin(
        admin_id: number,
        token: string,
        expira_em: Date,
        ip: string,
        userAgent: string
    ): Promise<void> {
        await transaction(async (client: PoolClient) => {
            // Desativar sessões antigas
            await client.query(
                `UPDATE sessoes_admin 
                 SET ativo = FALSE 
                 WHERE admin_id = $1 AND ativo = TRUE`,
                [admin_id]
            );

            // Criar nova sessão
            await client.query(
                `INSERT INTO sessoes_admin (admin_id, token, data_expiracao, ip, user_agent)
                 VALUES ($1, $2, $3, $4, $5)`,
                [admin_id, token, expira_em, ip, userAgent]
            );

            // Atualizar último login
            await client.query(
                `UPDATE administradores 
                 SET ultimo_login = NOW(), ultimo_ip = $1 
                 WHERE id = $2`,
                [ip, admin_id]
            );

            // Registrar log
            await client.query(
                `INSERT INTO logs_admin (admin_id, acao, descricao, ip)
                 VALUES ($1, $2, $3, $4)`,
                [admin_id, "login", "Login administrativo realizado", ip]
            );
        });
    }

    // ============================================
    // VALIDAR TOKEN ADMIN
    // ============================================
    async validarTokenAdmin(token: string): Promise<{ admin_id: number; nome: string; email: string; permissoes: string[] } | null> {
        const result = await query(
            `SELECT 
                s.admin_id,
                a.nome,
                a.email,
                s.ativo,
                s.data_expiracao,
                array_agg(p.nome) as permissoes
             FROM sessoes_admin s
             JOIN administradores a ON s.admin_id = a.id
             LEFT JOIN admin_permissoes ap ON a.id = ap.admin_id AND ap.ativo = TRUE
             LEFT JOIN permissoes_admin p ON ap.permissao_id = p.id AND p.ativo = TRUE
             WHERE s.token = $1 
             AND s.ativo = TRUE 
             AND s.data_expiracao > NOW()
             AND a.ativo = TRUE
             GROUP BY s.admin_id, a.nome, a.email, s.ativo, s.data_expiracao`,
            [token]
        );

        if (result.rows.length === 0) {
            return null;
        }

        const sessao = result.rows[0];

        return {
            admin_id: sessao.admin_id,
            nome: sessao.nome,
            email: sessao.email,
            permissoes: sessao.permissoes || []
        };
    }

    // ============================================
    // LOGOUT ADMIN
    // ============================================
    async logoutAdmin(token: string): Promise<void> {
        await query(
            `UPDATE sessoes_admin 
             SET ativo = FALSE 
             WHERE token = $1`,
            [token]
        );
    }

    // ============================================
    // DASHBOARD - DADOS
    // ============================================
    async getDashboardData(): Promise<{
        total_usuarios: number;
        ativos: number;
        inativos: number;
        ganhos_mes: number;
        ultimos_logins: any[];
        pendentes: any[];
    }> {
        const [total, ativos, inativos, ganhos, logins, pendentes] = await Promise.all([
            query(`SELECT COUNT(*) as total FROM usuarios WHERE ativo = TRUE`),
            query(`SELECT COUNT(*) as total FROM usuarios WHERE ativo = TRUE AND pago = TRUE`),
            query(`SELECT COUNT(*) as total FROM usuarios WHERE ativo = TRUE AND pago = FALSE`),
            query(`SELECT COALESCE(SUM(preco), 0) as total FROM pagamentos WHERE data_pagamento > NOW() - INTERVAL '30 days'`),
            query(`
                SELECT 
                    u.nome_usuario,
                    h.ip,
                    h.data_login,
                    h.sucesso
                FROM historico_login h
                JOIN usuarios u ON h.usuario_id = u.id
                ORDER BY h.data_login DESC
                LIMIT 20
            `),
            query(`
                SELECT 
                    u.id,
                    u.nome_usuario,
                    u.email
                FROM usuarios u
                WHERE u.pago = FALSE AND u.ativo = TRUE
                LIMIT 20
            `)
        ]);

        return {
            total_usuarios: parseInt(total.rows[0].total),
            ativos: parseInt(ativos.rows[0].total),
            inativos: parseInt(inativos.rows[0].total),
            ganhos_mes: parseFloat(ganhos.rows[0].total) || 0,
            ultimos_logins: logins.rows,
            pendentes: pendentes.rows
        };
    }

    // ============================================
    // LISTAR USUARIOS COM FILTROS
    // ============================================
    async listarUsuarios(
        page: number = 1,
        limit: number = 20,
        search?: string,
        pago?: boolean,
        ativo?: boolean
    ): Promise<{ dados: any[]; total: number; total_paginas: number }> {
        const offset = (page - 1) * limit;
        let conditions: string[] = [];
        let params: any[] = [];
        let paramIndex = 1;

        if (search) {
            conditions.push(`(u.nome_usuario ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`);
            params.push(`%${search}%`);
            paramIndex++;
        }

        if (pago !== undefined) {
            conditions.push(`u.pago = $${paramIndex}`);
            params.push(pago);
            paramIndex++;
        }

        if (ativo !== undefined) {
            conditions.push(`u.ativo = $${paramIndex}`);
            params.push(ativo);
            paramIndex++;
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const result = await query(
            `SELECT 
                u.id,
                u.nome_usuario,
                u.email,
                u.ativo,
                u.pago,
                u.data_cadastro,
                p.nome AS perfil,
                up.data_validade
             FROM usuarios u
             LEFT JOIN usuario_perfil up ON u.id = up.usuario_id AND up.ativo = TRUE
             LEFT JOIN perfis_acesso p ON up.perfil_id = p.id
             ${whereClause}
             ORDER BY u.id DESC
             LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            [...params, limit, offset]
        );

        const totalResult = await query(
            `SELECT COUNT(*) as total FROM usuarios u ${whereClause}`,
            params
        );

        const total = parseInt(totalResult.rows[0].total);
        const total_paginas = Math.ceil(total / limit);

        return {
            dados: result.rows,
            total,
            total_paginas
        };
    }

    // ============================================
    // MARCAR USUARIO COMO PAGO
    // ============================================
    async marcarUsuarioPago(usuario_id: number, admin_id: number, ip: string): Promise<void> {
        await transaction(async (client: PoolClient) => {
            const userResult = await client.query(
                `SELECT id, nome_usuario, email FROM usuarios WHERE id = $1`,
                [usuario_id]
            );

            if (userResult.rows.length === 0) {
                throw new AppError("Usuario nao encontrado", 404);
            }

            const usuario = userResult.rows[0];

            await client.query(
                `UPDATE usuarios SET pago = TRUE WHERE id = $1`,
                [usuario_id]
            );

            await client.query(
                `INSERT INTO logs_admin (admin_id, acao, descricao, dados_acao, ip)
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                    admin_id,
                    "marcar_pago",
                    `Usuario ${usuario.nome_usuario} (${usuario.email}) marcado como pago`,
                    JSON.stringify({ usuario_id, nome: usuario.nome_usuario, email: usuario.email }),
                    ip
                ]
            );
        });
    }

    // ============================================
    // DESMARCAR USUARIO COMO PAGO
    // ============================================
    async desmarcarUsuarioPago(usuario_id: number, admin_id: number, ip: string): Promise<void> {
        await transaction(async (client: PoolClient) => {
            const userResult = await client.query(
                `SELECT id, nome_usuario, email FROM usuarios WHERE id = $1`,
                [usuario_id]
            );

            if (userResult.rows.length === 0) {
                throw new AppError("Usuario nao encontrado", 404);
            }

            const usuario = userResult.rows[0];

            await client.query(
                `UPDATE usuarios SET pago = FALSE WHERE id = $1`,
                [usuario_id]
            );

            await client.query(
                `INSERT INTO logs_admin (admin_id, acao, descricao, dados_acao, ip)
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                    admin_id,
                    "desmarcar_pago",
                    `Usuario ${usuario.nome_usuario} (${usuario.email}) desmarcado como pago`,
                    JSON.stringify({ usuario_id, nome: usuario.nome_usuario, email: usuario.email }),
                    ip
                ]
            );
        });
    }

    // ============================================
    // VERIFICAR PERMISSAO
    // ============================================
    async verificarPermissao(admin_id: number, permissao: string): Promise<boolean> {
        const result = await query(
            `SELECT 1 FROM admin_permissoes ap
             JOIN permissoes_admin p ON ap.permissao_id = p.id
             WHERE ap.admin_id = $1 AND p.nome = $2 AND ap.ativo = TRUE AND p.ativo = TRUE`,
            [admin_id, permissao]
        );

        return result.rows.length > 0;
    }

    // ============================================
    // LOG DE ACAO ADMIN
    // ============================================
    async logAdminAction(
        admin_id: number,
        acao: string,
        descricao: string,
        ip: string,
        dados_acao?: any
    ): Promise<void> {
        await query(
            `INSERT INTO logs_admin (admin_id, acao, descricao, dados_acao, ip)
             VALUES ($1, $2, $3, $4, $5)`,
            [admin_id, acao, descricao, dados_acao ? JSON.stringify(dados_acao) : null, ip]
        );
    }
}

export default new AdminService();