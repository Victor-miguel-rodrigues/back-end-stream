// ============================================
// ADMIN SERVICE - 1FN, 2FN, 3FN
// ============================================

import { query, transaction } from "../database/connection";
import { gerarToken, compararSenha } from "../utils/crypto";
import { AppError } from "../types/admin";
import { PoolClient } from "pg";
import { disableOfCodLogin } from "./codigoLoginService";

// Valor que o painel ja usava por pagamento (R$ 20 a cada 30 dias)
const VALOR_PADRAO_PAGAMENTO = 20;
// Fuso usado para fechar "mes" e "fim do dia" nos relatorios e na data de validade
const FUSO_PAINEL = "America/Campo_Grande";

const valorValido = (v: unknown): number | null => {
    const n = typeof v === "string" ? parseFloat(v.replace(",", ".")) : typeof v === "number" ? v : NaN;
    return Number.isFinite(n) && n >= 0 && n <= 100000 ? Math.round(n * 100) / 100 : null;
};

const dataIsoValida = (v: string): boolean => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
    if (!m) return false;
    const [a, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const d = new Date(Date.UTC(a, mes - 1, dia));
    return d.getUTCFullYear() === a && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia;
};

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
                up.data_validade,
                (SELECT COUNT(*)::int FROM pagamentos pg WHERE pg.usuario_id = u.id) AS renovacoes,
                (SELECT MAX(pg.data_pagamento) FROM pagamentos pg WHERE pg.usuario_id = u.id) AS ultimo_pagamento
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
    async marcarUsuarioPago(usuario_id: number, admin_id: number, ip: string, valor?: unknown): Promise<void> {
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

            // Historico: toda vez que marcar como pago, grava um pagamento
            const preco = valorValido(valor) ?? VALOR_PADRAO_PAGAMENTO;
            await client.query(
                `INSERT INTO pagamentos (usuario_id, usuario_nome, usuario_email, admin_id, preco, tipo)
                 VALUES ($1, $2, $3, $4, $5, 'pago')`,
                [usuario_id, usuario.nome_usuario, usuario.email, admin_id, preco]
            );

            await client.query(
                `INSERT INTO logs_admin (admin_id, acao, descricao, dados_acao, ip)
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                    admin_id,
                    "marcar_pago",
                    `Usuario ${usuario.nome_usuario} (${usuario.email}) marcado como pago`,
                    JSON.stringify({ usuario_id, nome: usuario.nome_usuario, email: usuario.email, valor: preco }),
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

    // ============================================
    // 🆕 REGISTRAR LOG (usado pelo adminController)
    // ============================================
    async registrarLog(dados: {
        admin_id?: number;
        usuario_id?: number;
        acao: string;
        descricao?: string;
        ip?: string;
        user_agent?: string;
        dados?: any;
    }): Promise<void> {
        await query(
            `INSERT INTO logs_admin (admin_id, acao, descricao, dados_acao, ip, user_agent)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                dados.admin_id ?? null,
                dados.acao,
                dados.descricao ?? null,
                dados.dados ? JSON.stringify(dados.dados) : null,
                dados.ip ?? null,
                dados.user_agent ?? null
            ]
        );
    }

    // ============================================
    // EXCLUIR USUÁRIO
    // ============================================
    async excluirUsuario(usuario_id: number, admin_id: number, ip: string): Promise<void> {
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
                `INSERT INTO logs_admin (admin_id, acao, descricao, dados_acao, ip)
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                    admin_id,
                    "excluir_usuario",
                    `Usuario ${usuario.nome_usuario} (${usuario.email}) excluido`,
                    JSON.stringify({
                        usuario_id,
                        nome: usuario.nome_usuario,
                        email: usuario.email
                    }),
                    ip
                ]
            );

            await client.query(
                `DELETE FROM usuarios WHERE id = $1`,
                [usuario_id]
            );

            console.log(`✅ Usuario ${usuario.nome_usuario} (ID: ${usuario_id}) excluido`);
        });
    }

    // ============================================
    // 🆕 PERMISSOES - LISTAR DISPONIVEIS
    // ============================================
    async listarPermissoes(): Promise<any[]> {
        const result = await query(
            `SELECT id, nome, descricao 
             FROM permissoes_admin 
             WHERE ativo = TRUE 
             ORDER BY id`
        );
        return result.rows;
    }

    // ============================================
    // 🆕 BUSCAR PERMISSOES DE UM ADMIN
    // ============================================
    async getPermissoesAdmin(admin_id: number): Promise<string[]> {
        const result = await query(
            `SELECT p.nome 
             FROM admin_permissoes ap
             JOIN permissoes_admin p ON p.id = ap.permissao_id
             WHERE ap.admin_id = $1 AND ap.ativo = TRUE AND p.ativo = TRUE`,
            [admin_id]
        );
        return result.rows.map((r: any) => r.nome);
    }

    // ============================================
    // 🆕 DEFINIR PERMISSOES DE UM ADMIN
    // ============================================
    async setPermissoesAdmin(admin_id: number, permissoes: string[]): Promise<void> {
        await transaction(async (client: PoolClient) => {
            await client.query(
                `UPDATE admin_permissoes 
                 SET ativo = FALSE 
                 WHERE admin_id = $1`,
                [admin_id]
            );

            if (!permissoes || permissoes.length === 0) return;

            for (const nomePermissao of permissoes) {
                await client.query(
                    `INSERT INTO admin_permissoes (admin_id, permissao_id, ativo)
                     VALUES ($1, (SELECT id FROM permissoes_admin WHERE nome = $2), TRUE)
                     ON CONFLICT (admin_id, permissao_id) 
                     DO UPDATE SET ativo = TRUE`,
                    [admin_id, nomePermissao]
                );
            }
        });
    }

    // ============================================
    // 🆕 ADMINS - LISTAR (AJUSTADO: data_criacao)
    // ============================================
    async listarAdmins(): Promise<any[]> {
        const result = await query(
            `SELECT 
                id AS admin_id,
                nome,
                email,
                ativo,
                data_criacao,
                ultimo_login,
                ultimo_ip
             FROM administradores
             ORDER BY id`
        );

        const admins = await Promise.all(
            result.rows.map(async (admin: any) => ({
                ...admin,
                permissoes: await this.getPermissoesAdmin(admin.admin_id)
            }))
        );

        return admins;
    }

    // ============================================
    // 🆕 ADMINS - BUSCAR POR ID (AJUSTADO: data_criacao)
    // ============================================
    async buscarAdmin(admin_id: number): Promise<any | null> {
        const result = await query(
            `SELECT 
                id AS admin_id,
                nome,
                email,
                ativo,
                data_criacao,
                ultimo_login,
                ultimo_ip
             FROM administradores 
             WHERE id = $1`,
            [admin_id]
        );

        if (result.rows.length === 0) return null;

        const admin = result.rows[0];
        admin.permissoes = await this.getPermissoesAdmin(admin_id);
        return admin;
    }

    // ============================================
    // 🆕 ADMINS - CRIAR
    // ============================================
    async criarAdmin(dados: {
        nome: string;
        email: string;
        senha: string;
        permissoes?: string[];
    }): Promise<any> {
        const { nome, email, senha, permissoes } = dados;

        const existe = await query(
            `SELECT id FROM administradores WHERE email = $1`,
            [email]
        );

        if (existe.rows.length > 0) {
            throw new AppError("Email ja cadastrado", 400);
        }

        const { hashSenha } = await import("../utils/crypto");
        const senha_hash = hashSenha(senha);

        const result = await query(
            `INSERT INTO administradores (nome, email, senha_hash, ativo)
             VALUES ($1, $2, $3, TRUE)
             RETURNING id AS admin_id, nome, email, ativo`,
            [nome, email, senha_hash]
        );

        const admin = result.rows[0];

        if (permissoes && permissoes.length > 0) {
            await this.setPermissoesAdmin(admin.admin_id, permissoes);
        }

        admin.permissoes = permissoes || [];
        return admin;
    }

    // ============================================
    // 🆕 ADMINS - ATUALIZAR
    // ============================================
    async atualizarAdmin(
        admin_id: number,
        dados: {
            nome?: string;
            email?: string;
            senha?: string;
            permissoes?: string[];
            ativo?: boolean;
        }
    ): Promise<any> {
        const { nome, email, senha, permissoes, ativo } = dados;

        const campos: string[] = [];
        const valores: any[] = [];
        let idx = 1;

        if (nome !== undefined) {
            campos.push(`nome = $${idx++}`);
            valores.push(nome);
        }
        if (email !== undefined) {
            campos.push(`email = $${idx++}`);
            valores.push(email);
        }
        if (ativo !== undefined) {
            campos.push(`ativo = $${idx++}`);
            valores.push(ativo);
        }
        if (senha) {
            const { hashSenha } = await import("../utils/crypto");
            campos.push(`senha_hash = $${idx++}`);
            valores.push(hashSenha(senha));
        }

        if (campos.length > 0) {
            valores.push(admin_id);
            await query(
                `UPDATE administradores SET ${campos.join(', ')} WHERE id = $${idx}`,
                valores
            );
        }

        if (permissoes !== undefined) {
            await this.setPermissoesAdmin(admin_id, permissoes);
        }

        return this.buscarAdmin(admin_id);
    }

    // ============================================
    // 🆕 ADMINS - EXCLUIR
    // ============================================
    async excluirAdmin(admin_id: number): Promise<boolean> {
        const result = await query(
            `DELETE FROM administradores WHERE id = $1 RETURNING id`,
            [admin_id]
        );
        return (result.rowCount ?? 0) > 0;
    }

    // ============================================
    // 🆕 LOGS DO SISTEMA - LISTAR (AJUSTADO: data_log)
    // ============================================
    async listarLogs(opts: {
        page?: number;
        limit?: number;
        admin_id?: number;
        acao?: string;
        desde?: string;
        ate?: string;
    }): Promise<{ dados: any[]; total: number; total_paginas: number }> {
        const page = opts.page || 1;
        const limit = Math.min(opts.limit || 50, 200);
        const offset = (page - 1) * limit;

        const where: string[] = [];
        const params: any[] = [];
        let idx = 1;

        if (opts.admin_id) {
            where.push(`l.admin_id = $${idx++}`);
            params.push(opts.admin_id);
        }
        if (opts.acao) {
            where.push(`l.acao = $${idx++}`);
            params.push(opts.acao);
        }
        if (opts.desde) {
            where.push(`l.data_log >= $${idx++}`);
            params.push(opts.desde);
        }
        if (opts.ate) {
            where.push(`l.data_log <= $${idx++}`);
            params.push(opts.ate);
        }

        const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

        const countResult = await query(
            `SELECT COUNT(*) FROM logs_admin l ${whereSql}`,
            params
        );
        const total = parseInt(countResult.rows[0].count, 10);

        params.push(limit, offset);
        const result = await query(
            `SELECT 
                l.id,
                l.admin_id,
                a.nome AS admin_nome,
                a.email AS admin_email,
                l.acao,
                l.descricao,
                l.dados_acao,
                l.ip,
                l.data_log
             FROM logs_admin l
             LEFT JOIN administradores a ON a.id = l.admin_id
             ${whereSql}
             ORDER BY l.data_log DESC
             LIMIT $${idx++} OFFSET $${idx++}`,
            params
        );

        return {
            dados: result.rows,
            total,
            total_paginas: Math.ceil(total / limit)
        };
    }

    // ============================================
    // 🆕 HISTORICO DE LOGINS DOS USUARIOS
    // ============================================
    async listarLogins(opts: {
        page?: number;
        limit?: number;
        usuario_id?: number;
        busca?: string;
    }): Promise<{ dados: any[]; total: number; total_paginas: number }> {
        const page = opts.page || 1;
        const limit = Math.min(opts.limit || 50, 200);
        const offset = (page - 1) * limit;

        const where: string[] = [];
        const params: any[] = [];
        let idx = 1;

        if (opts.usuario_id) {
            where.push(`h.usuario_id = $${idx++}`);
            params.push(opts.usuario_id);
        }
        if (opts.busca) {
            where.push(`(u.nome_usuario ILIKE $${idx} OR u.email ILIKE $${idx} OR h.ip ILIKE $${idx})`);
            params.push(`%${opts.busca}%`);
            idx++;
        }

        const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

        const countResult = await query(
            `SELECT COUNT(*) FROM historico_login h
             JOIN usuarios u ON u.id = h.usuario_id
             ${whereSql}`,
            params
        );
        const total = parseInt(countResult.rows[0].count, 10);

        params.push(limit, offset);
        const result = await query(
            `SELECT 
                h.id,
                h.usuario_id,
                u.nome_usuario,
                u.email,
                h.ip,
                h.user_agent,
                h.sucesso,
                h.data_login
             FROM historico_login h
             JOIN usuarios u ON u.id = h.usuario_id
             ${whereSql}
             ORDER BY h.data_login DESC
             LIMIT $${idx++} OFFSET $${idx++}`,
            params
        );

        return {
            dados: result.rows,
            total,
            total_paginas: Math.ceil(total / limit)
        };
    }

    // ============================================
    // 🆕 SESSOES ADMIN - LISTAR
    // ============================================
    async listarSessoesAdmin(opts: {
        page?: number;
        limit?: number;
        apenas_ativas?: boolean;
    } = {}): Promise<{ dados: any[]; total: number; total_paginas: number }> {
        const page = opts.page || 1;
        const limit = Math.min(opts.limit || 50, 200);
        const offset = (page - 1) * limit;

        const where = opts.apenas_ativas
            ? `WHERE s.ativo = TRUE AND s.data_expiracao > NOW()`
            : '';

        const countResult = await query(
            `SELECT COUNT(*) FROM sessoes_admin s ${where}`,
            []
        );
        const total = parseInt(countResult.rows[0].count, 10);

        const result = await query(
            `SELECT 
                s.id,
                s.admin_id,
                a.nome AS admin_nome,
                a.email AS admin_email,
                s.ip,
                s.user_agent,
                s.ativo,
                s.data_criacao AS criado_em,
                s.data_expiracao AS expira_em,
                (s.data_expiracao < NOW()) AS expirada
             FROM sessoes_admin s
             JOIN administradores a ON a.id = s.admin_id
             ${where}
             ORDER BY s.data_criacao DESC
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        return {
            dados: result.rows,
            total,
            total_paginas: Math.ceil(total / limit)
        };
    }

    // ============================================
    // 🆕 SESSOES ADMIN - REVOGAR UMA
    // ============================================
    async revogarSessaoAdmin(sessao_id: number): Promise<boolean> {
        const result = await query(
            `UPDATE sessoes_admin 
             SET ativo = FALSE 
             WHERE id = $1 
             RETURNING id`,
            [sessao_id]
        );
        return (result.rowCount ?? 0) > 0;
    }

    // ============================================
    // 🆕 SESSOES ADMIN - REVOGAR TODAS DE UM ADMIN
    // ============================================
    async revogarSessoesAdmin(admin_id: number): Promise<number> {
        const result = await query(
            `UPDATE sessoes_admin 
             SET ativo = FALSE 
             WHERE admin_id = $1 AND ativo = TRUE 
             RETURNING id`,
            [admin_id]
        );
        return result.rowCount ?? 0;
    }

    // ============================================
    // 🆕 LIMPAR SESSOES INATIVAS (admin)
    // ============================================
    async limparSessoesInativasAdmin(): Promise<number> {
        const result = await query(
            `UPDATE sessoes_admin 
             SET ativo = FALSE 
             WHERE ativo = TRUE AND data_expiracao < NOW()
             RETURNING id`
        );
        return result.rowCount ?? 0;
    }

    // ============================================
    // RENOVAR CONTA (+dias ou data personalizada)
    // ============================================
    // Valida os dados da renovacao (dias OU data) e calcula o valor
    private validarRenovacao(
        opcoes: { dias?: unknown; data_validade?: unknown; valor?: unknown },
        diasPadrao: number | null = null
    ): { dias: number | null; dataCustom: string | null; valor: number } {
        const semDias = opcoes.dias === undefined || opcoes.dias === null || opcoes.dias === "";
        let dias = semDias ? null : Number(opcoes.dias);
        const dataCustom =
            typeof opcoes.data_validade === "string" && opcoes.data_validade.trim()
                ? opcoes.data_validade.trim()
                : null;

        if (dias === null && dataCustom === null && diasPadrao !== null) {
            dias = diasPadrao;
        }
        if (dias === null && dataCustom === null) {
            throw new AppError("Informe os dias ou uma data de validade", 400);
        }
        if (dias !== null && dataCustom !== null) {
            throw new AppError("Informe os dias OU a data de validade, nao os dois", 400);
        }
        if (dias !== null && (!Number.isInteger(dias) || dias < 1 || dias > 3650)) {
            throw new AppError("Dias deve ser um numero inteiro entre 1 e 3650", 400);
        }
        if (dataCustom !== null && !dataIsoValida(dataCustom)) {
            throw new AppError("Data de validade invalida (use AAAA-MM-DD)", 400);
        }

        const valor =
            valorValido(opcoes.valor) ??
            (dias !== null ? Math.round(((VALOR_PADRAO_PAGAMENTO * dias) / 30) * 100) / 100 : VALOR_PADRAO_PAGAMENTO);

        return { dias, dataCustom, valor };
    }

    // Aplica a renovacao dentro de uma transacao ja aberta (usada pela renovacao manual e pelo comprovante)
    private async aplicarRenovacao(
        client: PoolClient,
        usuario_id: number,
        admin_id: number,
        ip: string,
        plano: { dias: number | null; dataCustom: string | null; valor: number },
        origem: string = "manual"
    ): Promise<{ validade_anterior: Date | null; validade_nova: Date; valor: number; dias: number | null }> {
        const { dias, dataCustom, valor } = plano;

        const userResult = await client.query(
            `SELECT id, nome_usuario, email FROM usuarios WHERE id = $1`,
            [usuario_id]
        );

        if (userResult.rows.length === 0) {
            throw new AppError("Usuario nao encontrado", 404);
        }

        const usuario = userResult.rows[0];

        const perfilResult = await client.query(
            `SELECT id, data_validade
             FROM usuario_perfil
             WHERE usuario_id = $1
             ORDER BY ativo DESC, data_inicio DESC
             LIMIT 1
             FOR UPDATE`,
            [usuario_id]
        );

        if (perfilResult.rows.length === 0) {
            throw new AppError("Usuario sem perfil de acesso para renovar", 400);
        }

        const perfil = perfilResult.rows[0];
        let atualizado;

        if (dias !== null) {
            // Em dia: soma a partir do vencimento. Expirada: soma a partir de agora.
            atualizado = await client.query(
                `UPDATE usuario_perfil
                 SET data_validade = GREATEST(COALESCE(data_validade, NOW()), NOW()) + make_interval(days => $2),
                     ativo = TRUE
                 WHERE id = $1
                 RETURNING data_validade`,
                [perfil.id, dias]
            );
        } else {
            // Data personalizada: vale ate o fim do dia (horario de Campo Grande)
            atualizado = await client.query(
                `UPDATE usuario_perfil
                 SET data_validade = (($2::date + TIME '23:59:59') AT TIME ZONE '${FUSO_PAINEL}'),
                     ativo = TRUE
                 WHERE id = $1
                   AND (($2::date + TIME '23:59:59') AT TIME ZONE '${FUSO_PAINEL}') > NOW()
                 RETURNING data_validade`,
                [perfil.id, dataCustom]
            );

            if (atualizado.rowCount === 0) {
                throw new AppError("A data de validade precisa ser futura", 400);
            }
        }

        const validade_nova: Date = atualizado.rows[0].data_validade;
        const validade_anterior: Date | null = perfil.data_validade ?? null;

        await client.query(
            `UPDATE usuarios SET pago = TRUE WHERE id = $1`,
            [usuario_id]
        );

        await client.query(
            `INSERT INTO pagamentos
                (usuario_id, usuario_nome, usuario_email, admin_id, preco, tipo, dias, validade_anterior, validade_nova)
             VALUES ($1, $2, $3, $4, $5, 'renovacao', $6, $7, $8)`,
            [usuario_id, usuario.nome_usuario, usuario.email, admin_id, valor, dias, validade_anterior, validade_nova]
        );

        await client.query(
            `INSERT INTO logs_admin (admin_id, acao, descricao, dados_acao, ip)
             VALUES ($1, $2, $3, $4, $5)`,
            [
                admin_id,
                "renovar_usuario",
                `Usuario ${usuario.nome_usuario} (${usuario.email}) renovado`,
                JSON.stringify({ usuario_id, dias, data_validade: dataCustom, valor, validade_nova, origem }),
                ip
            ]
        );

        return { validade_anterior, validade_nova, valor, dias };
    }

    async renovarUsuario(
        usuario_id: number,
        admin_id: number,
        ip: string,
        opcoes: { dias?: unknown; data_validade?: unknown; valor?: unknown }
    ): Promise<{ validade_anterior: Date | null; validade_nova: Date; valor: number; dias: number | null }> {
        const plano = this.validarRenovacao(opcoes);
        return await transaction((client: PoolClient) =>
            this.aplicarRenovacao(client, usuario_id, admin_id, ip, plano)
        );
    }

    // ============================================
    // PAGAMENTOS - HISTORICO
    // ============================================
    async listarPagamentos(opts: {
        page?: number;
        limit?: number;
        usuario_id?: number;
        busca?: string;
    } = {}): Promise<{ dados: any[]; total: number; total_paginas: number; soma: number }> {
        const page = opts.page && opts.page > 0 ? opts.page : 1;
        const limit = Math.min(opts.limit || 30, 200);
        const offset = (page - 1) * limit;

        const where: string[] = [];
        const params: any[] = [];
        let idx = 1;

        if (opts.usuario_id) {
            where.push(`p.usuario_id = $${idx++}`);
            params.push(opts.usuario_id);
        }
        if (opts.busca) {
            where.push(`(COALESCE(u.nome_usuario, p.usuario_nome) ILIKE $${idx} OR COALESCE(u.email, p.usuario_email) ILIKE $${idx})`);
            params.push(`%${opts.busca}%`);
            idx++;
        }

        const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

        const totalResult = await query(
            `SELECT COUNT(*) AS total, COALESCE(SUM(p.preco), 0) AS soma
             FROM pagamentos p
             LEFT JOIN usuarios u ON u.id = p.usuario_id
             ${whereSql}`,
            params
        );

        const total = parseInt(totalResult.rows[0].total, 10);

        const result = await query(
            `SELECT
                p.id,
                p.usuario_id,
                COALESCE(u.nome_usuario, p.usuario_nome) AS nome_usuario,
                COALESCE(u.email, p.usuario_email) AS email,
                p.preco,
                p.tipo,
                p.dias,
                p.validade_anterior,
                p.validade_nova,
                p.data_pagamento,
                p.admin_id,
                a.nome AS admin_nome
             FROM pagamentos p
             LEFT JOIN usuarios u ON u.id = p.usuario_id
             LEFT JOIN administradores a ON a.id = p.admin_id
             ${whereSql}
             ORDER BY p.data_pagamento DESC, p.id DESC
             LIMIT $${idx++} OFFSET $${idx++}`,
            [...params, limit, offset]
        );

        return {
            dados: result.rows.map((r: any) => ({ ...r, preco: parseFloat(r.preco) || 0 })),
            total,
            total_paginas: Math.ceil(total / limit),
            soma: parseFloat(totalResult.rows[0].soma) || 0
        };
    }

    // ============================================
    // PAGAMENTOS - RESUMO (total, mes atual e ganhos por mes)
    // ============================================
    async resumoPagamentos(): Promise<{
        total_geral: number;
        total_pagamentos: number;
        mes_atual: number;
        pagamentos_mes_atual: number;
        por_mes: Array<{ mes: string; total: number; quantidade: number }>;
    }> {
        const [geral, mesAtual, porMes] = await Promise.all([
            query(`SELECT COALESCE(SUM(preco), 0) AS total, COUNT(*) AS quantidade FROM pagamentos`),
            query(
                `SELECT COALESCE(SUM(preco), 0) AS total, COUNT(*) AS quantidade
                 FROM pagamentos
                 WHERE date_trunc('month', data_pagamento::timestamptz AT TIME ZONE '${FUSO_PAINEL}')
                     = date_trunc('month', NOW() AT TIME ZONE '${FUSO_PAINEL}')`
            ),
            query(
                `SELECT
                    to_char(date_trunc('month', data_pagamento::timestamptz AT TIME ZONE '${FUSO_PAINEL}'), 'YYYY-MM') AS mes,
                    COALESCE(SUM(preco), 0) AS total,
                    COUNT(*) AS quantidade
                 FROM pagamentos
                 WHERE data_pagamento::timestamptz >=
                       (date_trunc('month', NOW() AT TIME ZONE '${FUSO_PAINEL}') - INTERVAL '11 months') AT TIME ZONE '${FUSO_PAINEL}'
                 GROUP BY 1
                 ORDER BY 1`
            )
        ]);

        return {
            total_geral: parseFloat(geral.rows[0].total) || 0,
            total_pagamentos: parseInt(geral.rows[0].quantidade, 10) || 0,
            mes_atual: parseFloat(mesAtual.rows[0].total) || 0,
            pagamentos_mes_atual: parseInt(mesAtual.rows[0].quantidade, 10) || 0,
            por_mes: porMes.rows.map((r: any) => ({
                mes: r.mes,
                total: parseFloat(r.total) || 0,
                quantidade: parseInt(r.quantidade, 10) || 0
            }))
        };
    }

    // ============================================
    // ENCERRAR SESSOES DE UM USUARIO (uso interno, dentro de transacao)
    // ============================================
    private async encerrarSessoesUsuario(client: PoolClient, usuario_id: number): Promise<number> {
        const sessoes = await client.query(
            `UPDATE sessoes
             SET ativo = FALSE
             WHERE usuario_id = $1 AND ativo = TRUE
             RETURNING id`,
            [usuario_id]
        );

        if ((sessoes.rowCount ?? 0) > 0) {
            // Fecha so o ultimo login em aberto (os antigos ja foram encerrados por inatividade)
            await client.query(
                `UPDATE historico_login
                 SET data_logout = NOW(),
                     duracao_minutos = EXTRACT(EPOCH FROM (NOW() - data_login)) / 60
                 WHERE id IN (
                     SELECT id FROM historico_login
                     WHERE usuario_id = $1 AND data_logout IS NULL
                     ORDER BY data_login DESC
                     LIMIT 1
                 )`,
                [usuario_id]
            );
        }

        // Regra do back-end: ao deslogar, o codigo de login do usuario e desativado
        await disableOfCodLogin(usuario_id, client);

        return sessoes.rowCount ?? 0;
    }

    // ============================================
    // BLOQUEAR / DESBLOQUEAR USUARIO
    // ============================================
    async alterarBloqueioUsuario(
        usuario_id: number,
        admin_id: number,
        ip: string,
        bloquear: boolean,
        motivo?: unknown
    ): Promise<{ sessoes_encerradas: number }> {
        const motivoLimpo = typeof motivo === "string" ? motivo.trim().slice(0, 200) : "";

        return await transaction(async (client: PoolClient) => {
            const userResult = await client.query(
                `SELECT id, nome_usuario, email FROM usuarios WHERE id = $1`,
                [usuario_id]
            );

            if (userResult.rows.length === 0) {
                throw new AppError("Usuario nao encontrado", 404);
            }

            const usuario = userResult.rows[0];

            await client.query(
                `UPDATE usuarios SET ativo = $2 WHERE id = $1`,
                [usuario_id, !bloquear]
            );

            let sessoes_encerradas = 0;
            if (bloquear) {
                sessoes_encerradas = await this.encerrarSessoesUsuario(client, usuario_id);
            }

            await client.query(
                `INSERT INTO logs_sistema (usuario_id, acao, descricao, ip)
                 VALUES ($1, $2, $3, $4)`,
                [
                    usuario_id,
                    bloquear ? "bloqueio_admin" : "desbloqueio_admin",
                    bloquear ? "Usuario bloqueado pelo administrador" : "Usuario desbloqueado pelo administrador",
                    ip
                ]
            );

            await client.query(
                `INSERT INTO logs_admin (admin_id, acao, descricao, dados_acao, ip)
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                    admin_id,
                    bloquear ? "bloquear_usuario" : "desbloquear_usuario",
                    `Usuario ${usuario.nome_usuario} (${usuario.email}) ${bloquear ? "bloqueado" : "desbloqueado"}`,
                    JSON.stringify({ usuario_id, motivo: motivoLimpo || null, sessoes_encerradas }),
                    ip
                ]
            );

            return { sessoes_encerradas };
        });
    }

    // ============================================
    // SESSOES, IPS E LOGINS DE UM USUARIO
    // ============================================
    async listarSessoesUsuario(usuario_id: number): Promise<{
        usuario: any;
        sessoes: any[];
        ips: any[];
        logins: any[];
    }> {
        const userResult = await query(
            `SELECT id, nome_usuario, email, ativo, pago FROM usuarios WHERE id = $1`,
            [usuario_id]
        );

        if (userResult.rows.length === 0) {
            throw new AppError("Usuario nao encontrado", 404);
        }

        const [sessoes, ips, logins] = await Promise.all([
            query(
                `SELECT
                    s.id,
                    s.ip,
                    s.user_agent,
                    s.reproduzindo,
                    s.ultima_atividade,
                    s.data_expiracao,
                    (s.ativo = TRUE AND s.data_expiracao > NOW()) AS ativa
                 FROM sessoes s
                 WHERE s.usuario_id = $1
                 ORDER BY s.id DESC
                 LIMIT 10`,
                [usuario_id]
            ),
            query(
                `SELECT
                    h.ip::text AS ip,
                    COUNT(*)::int AS logins,
                    MAX(h.data_login) AS ultimo_login
                 FROM historico_login h
                 WHERE h.usuario_id = $1
                   AND h.data_login > NOW() - INTERVAL '30 days'
                 GROUP BY h.ip::text
                 ORDER BY MAX(h.data_login) DESC
                 LIMIT 20`,
                [usuario_id]
            ),
            query(
                `SELECT h.id, h.ip, h.user_agent, h.data_login, h.data_logout
                 FROM historico_login h
                 WHERE h.usuario_id = $1
                 ORDER BY h.data_login DESC
                 LIMIT 15`,
                [usuario_id]
            )
        ]);

        return {
            usuario: userResult.rows[0],
            sessoes: sessoes.rows,
            ips: ips.rows,
            logins: logins.rows
        };
    }

    // ============================================
    // DESLOGAR USUARIO (encerra as sessoes e desativa o codigo de login)
    // ============================================
    async deslogarUsuario(usuario_id: number, admin_id: number, ip: string): Promise<{ sessoes_encerradas: number }> {
        return await transaction(async (client: PoolClient) => {
            const userResult = await client.query(
                `SELECT id, nome_usuario, email FROM usuarios WHERE id = $1`,
                [usuario_id]
            );

            if (userResult.rows.length === 0) {
                throw new AppError("Usuario nao encontrado", 404);
            }

            const usuario = userResult.rows[0];
            const sessoes_encerradas = await this.encerrarSessoesUsuario(client, usuario_id);

            await client.query(
                `INSERT INTO logs_sistema (usuario_id, acao, descricao, ip)
                 VALUES ($1, $2, $3, $4)`,
                [usuario_id, "logout_admin", "Sessao encerrada pelo administrador", ip]
            );

            await client.query(
                `INSERT INTO logs_admin (admin_id, acao, descricao, dados_acao, ip)
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                    admin_id,
                    "deslogar_usuario",
                    `Usuario ${usuario.nome_usuario} (${usuario.email}) deslogado`,
                    JSON.stringify({ usuario_id, sessoes_encerradas }),
                    ip
                ]
            );

            return { sessoes_encerradas };
        });
    }

    // ============================================
    // USUARIOS COM MUITOS IPS DIFERENTES
    // ============================================
    async listarIpsSuspeitos(dias: number = 7, minimo: number = 3): Promise<any[]> {
        const result = await query(
            `SELECT
                u.id AS usuario_id,
                u.nome_usuario,
                u.email,
                u.ativo,
                COUNT(DISTINCT h.ip::text)::int AS ips_distintos,
                COUNT(*)::int AS logins,
                MAX(h.data_login) AS ultimo_login,
                (array_agg(DISTINCT h.ip::text))[1:6] AS ips
             FROM historico_login h
             JOIN usuarios u ON u.id = h.usuario_id
             WHERE h.data_login > NOW() - make_interval(days => $1)
             GROUP BY u.id, u.nome_usuario, u.email, u.ativo
             HAVING COUNT(DISTINCT h.ip::text) >= $2
             ORDER BY ips_distintos DESC, logins DESC
             LIMIT 100`,
            [dias, minimo]
        );

        return result.rows;
    }

    // ============================================
    // COMPROVANTES (imagem enviada pelo usuario para confirmacao manual)
    // ============================================
    async salvarComprovante(dados: {
        email: string;
        imagem: Buffer;
        mime: string;
        ip: string;
        userAgent: string;
    }): Promise<number> {
        const pendentes = await query(
            `SELECT COUNT(*)::int AS total FROM comprovantes WHERE LOWER(email) = $1 AND status = 'pendente'`,
            [dados.email]
        );

        if (pendentes.rows[0].total >= 5) {
            throw new AppError("Voce ja tem comprovantes em analise. Aguarde a confirmacao.", 429);
        }

        const user = await query(
            `SELECT id FROM usuarios WHERE LOWER(email) = $1 LIMIT 1`,
            [dados.email]
        );

        const result = await query(
            `INSERT INTO comprovantes (email, usuario_id, mime, tamanho, imagem, ip, user_agent)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id`,
            [dados.email, user.rows[0]?.id ?? null, dados.mime, dados.imagem.length, dados.imagem, dados.ip, dados.userAgent]
        );

        return result.rows[0].id;
    }

    async listarComprovantes(opts: {
        status?: string;
        page?: number;
        limit?: number;
        busca?: string;
    } = {}): Promise<{ dados: any[]; total: number; total_paginas: number; pendentes: number }> {
        const page = opts.page && opts.page > 0 ? opts.page : 1;
        const limit = Math.min(opts.limit || 30, 100);
        const offset = (page - 1) * limit;

        const where: string[] = [];
        const params: any[] = [];
        let idx = 1;

        if (opts.status && ["pendente", "confirmado", "recusado"].includes(opts.status)) {
            where.push(`c.status = $${idx++}`);
            params.push(opts.status);
        }
        if (opts.busca) {
            where.push(`c.email ILIKE $${idx++}`);
            params.push(`%${opts.busca}%`);
        }

        const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

        const [totalResult, pendentesResult] = await Promise.all([
            query(`SELECT COUNT(*) AS total FROM comprovantes c ${whereSql}`, params),
            query(`SELECT COUNT(*)::int AS total FROM comprovantes WHERE status = 'pendente'`)
        ]);

        const total = parseInt(totalResult.rows[0].total, 10);

        // A imagem (bytea) nao vem na lista: ela e carregada so ao abrir o comprovante
        const result = await query(
            `SELECT
                c.id,
                c.email,
                c.usuario_id,
                u.nome_usuario,
                c.mime,
                c.tamanho,
                c.status,
                c.data_envio,
                c.data_analise,
                c.motivo_recusa,
                a.nome AS admin_nome
             FROM comprovantes c
             LEFT JOIN usuarios u ON u.id = c.usuario_id
             LEFT JOIN administradores a ON a.id = c.analisado_por
             ${whereSql}
             ORDER BY (c.status = 'pendente') DESC, c.data_envio DESC
             LIMIT $${idx++} OFFSET $${idx++}`,
            [...params, limit, offset]
        );

        return {
            dados: result.rows,
            total,
            total_paginas: Math.ceil(total / limit),
            pendentes: pendentesResult.rows[0].total
        };
    }

    async buscarImagemComprovante(id: number): Promise<{ mime: string; imagem: Buffer }> {
        const result = await query(`SELECT mime, imagem FROM comprovantes WHERE id = $1`, [id]);

        if (result.rows.length === 0) {
            throw new AppError("Comprovante nao encontrado", 404);
        }

        return result.rows[0];
    }

    // Confirma o comprovante: renova a conta (padrao +30 dias) e marca como pago
    async confirmarComprovante(
        id: number,
        admin_id: number,
        ip: string,
        opcoes: { dias?: unknown; data_validade?: unknown; valor?: unknown }
    ): Promise<{ validade_anterior: Date | null; validade_nova: Date; valor: number; dias: number | null }> {
        const plano = this.validarRenovacao(opcoes, 30);

        return await transaction(async (client: PoolClient) => {
            const cp = await client.query(
                `SELECT id, email, usuario_id, status FROM comprovantes WHERE id = $1 FOR UPDATE`,
                [id]
            );

            if (cp.rows.length === 0) {
                throw new AppError("Comprovante nao encontrado", 404);
            }
            if (cp.rows[0].status !== "pendente") {
                throw new AppError("Este comprovante ja foi analisado", 409);
            }

            let usuario_id: number | null = cp.rows[0].usuario_id;
            if (!usuario_id) {
                // A pessoa pode ter criado a conta depois de enviar o comprovante
                const u = await client.query(
                    `SELECT id FROM usuarios WHERE LOWER(email) = LOWER($1) LIMIT 1`,
                    [cp.rows[0].email]
                );
                usuario_id = u.rows[0]?.id ?? null;
            }
            if (!usuario_id) {
                throw new AppError("Nenhuma conta encontrada com o e-mail deste comprovante", 400);
            }

            const resultado = await this.aplicarRenovacao(client, usuario_id, admin_id, ip, plano, "comprovante");

            await client.query(
                `UPDATE comprovantes
                 SET status = 'confirmado', usuario_id = $2, analisado_por = $3, data_analise = NOW()
                 WHERE id = $1`,
                [id, usuario_id, admin_id]
            );

            await client.query(
                `INSERT INTO logs_admin (admin_id, acao, descricao, dados_acao, ip)
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                    admin_id,
                    "confirmar_comprovante",
                    `Comprovante ${id} confirmado (${cp.rows[0].email})`,
                    JSON.stringify({ comprovante_id: id, usuario_id, valor: resultado.valor }),
                    ip
                ]
            );

            return resultado;
        });
    }

    async recusarComprovante(id: number, admin_id: number, ip: string, motivo?: unknown): Promise<void> {
        const motivoLimpo = typeof motivo === "string" ? motivo.trim().slice(0, 200) : "";

        await transaction(async (client: PoolClient) => {
            const cp = await client.query(
                `SELECT id, email, status FROM comprovantes WHERE id = $1 FOR UPDATE`,
                [id]
            );

            if (cp.rows.length === 0) {
                throw new AppError("Comprovante nao encontrado", 404);
            }
            if (cp.rows[0].status !== "pendente") {
                throw new AppError("Este comprovante ja foi analisado", 409);
            }

            await client.query(
                `UPDATE comprovantes
                 SET status = 'recusado', analisado_por = $2, data_analise = NOW(), motivo_recusa = $3
                 WHERE id = $1`,
                [id, admin_id, motivoLimpo || null]
            );

            await client.query(
                `INSERT INTO logs_admin (admin_id, acao, descricao, dados_acao, ip)
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                    admin_id,
                    "recusar_comprovante",
                    `Comprovante ${id} recusado (${cp.rows[0].email})`,
                    JSON.stringify({ comprovante_id: id, motivo: motivoLimpo || null }),
                    ip
                ]
            );
        });
    }
}

export default new AdminService();