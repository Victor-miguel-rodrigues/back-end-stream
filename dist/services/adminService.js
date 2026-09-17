"use strict";
// ============================================
// ADMIN SERVICE - 1FN, 2FN, 3FN
// ============================================
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const connection_1 = require("../database/connection");
const crypto_1 = require("../utils/crypto");
const admin_1 = require("../types/admin");
class AdminService {
    // ============================================
    // LOGIN - PASSO 1: VERIFICAR EMAIL + SENHA
    // ============================================
    async verificarCredenciais(email, senha) {
        const result = await (0, connection_1.query)(`SELECT id, nome, email, senha_hash, ativo 
             FROM administradores 
             WHERE email = $1`, [email]);
        if (result.rows.length === 0) {
            throw new admin_1.AppError("Email ou senha incorretos", 401);
        }
        const admin = result.rows[0];
        if (!admin.ativo) {
            throw new admin_1.AppError("Administrador desativado", 403);
        }
        if (!(0, crypto_1.compararSenha)(senha, admin.senha_hash)) {
            throw new admin_1.AppError("Email ou senha incorretos", 401);
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
    async verificarPalavraSecreta(admin_id, palavra_secreta) {
        const result = await (0, connection_1.query)(`SELECT palavra_secreta_hash FROM administradores WHERE id = $1`, [admin_id]);
        if (result.rows.length === 0) {
            throw new admin_1.AppError("Administrador nao encontrado", 404);
        }
        if (!(0, crypto_1.compararSenha)(palavra_secreta, result.rows[0].palavra_secreta_hash)) {
            throw new admin_1.AppError("Palavra secreta incorreta", 401);
        }
        const token = (0, crypto_1.gerarToken)();
        const expira_em = new Date(Date.now() + 24 * 60 * 60 * 1000);
        return { token, expira_em };
    }
    // ============================================
    // CRIAR SESSÃO ADMIN
    // ============================================
    async criarSessaoAdmin(admin_id, token, expira_em, ip, userAgent) {
        await (0, connection_1.transaction)(async (client) => {
            // Desativar sessões antigas
            await client.query(`UPDATE sessoes_admin 
                 SET ativo = FALSE 
                 WHERE admin_id = $1 AND ativo = TRUE`, [admin_id]);
            // Criar nova sessão
            await client.query(`INSERT INTO sessoes_admin (admin_id, token, data_expiracao, ip, user_agent)
                 VALUES ($1, $2, $3, $4, $5)`, [admin_id, token, expira_em, ip, userAgent]);
            // Atualizar último login
            await client.query(`UPDATE administradores 
                 SET ultimo_login = NOW(), ultimo_ip = $1 
                 WHERE id = $2`, [ip, admin_id]);
            // Registrar log
            await client.query(`INSERT INTO logs_admin (admin_id, acao, descricao, ip)
                 VALUES ($1, $2, $3, $4)`, [admin_id, "login", "Login administrativo realizado", ip]);
        });
    }
    // ============================================
    // VALIDAR TOKEN ADMIN
    // ============================================
    async validarTokenAdmin(token) {
        const result = await (0, connection_1.query)(`SELECT 
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
             GROUP BY s.admin_id, a.nome, a.email, s.ativo, s.data_expiracao`, [token]);
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
    async logoutAdmin(token) {
        await (0, connection_1.query)(`UPDATE sessoes_admin 
             SET ativo = FALSE 
             WHERE token = $1`, [token]);
    }
    // ============================================
    // DASHBOARD - DADOS
    // ============================================
    async getDashboardData() {
        const [total, ativos, inativos, ganhos, logins, pendentes] = await Promise.all([
            (0, connection_1.query)(`SELECT COUNT(*) as total FROM usuarios WHERE ativo = TRUE`),
            (0, connection_1.query)(`SELECT COUNT(*) as total FROM usuarios WHERE ativo = TRUE AND pago = TRUE`),
            (0, connection_1.query)(`SELECT COUNT(*) as total FROM usuarios WHERE ativo = TRUE AND pago = FALSE`),
            (0, connection_1.query)(`SELECT COALESCE(SUM(preco), 0) as total FROM pagamentos WHERE data_pagamento > NOW() - INTERVAL '30 days'`),
            (0, connection_1.query)(`
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
            (0, connection_1.query)(`
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
    async listarUsuarios(page = 1, limit = 20, search, pago, ativo) {
        const offset = (page - 1) * limit;
        let conditions = [];
        let params = [];
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
        const result = await (0, connection_1.query)(`SELECT 
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
             LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`, [...params, limit, offset]);
        const totalResult = await (0, connection_1.query)(`SELECT COUNT(*) as total FROM usuarios u ${whereClause}`, params);
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
    async marcarUsuarioPago(usuario_id, admin_id, ip) {
        await (0, connection_1.transaction)(async (client) => {
            const userResult = await client.query(`SELECT id, nome_usuario, email FROM usuarios WHERE id = $1`, [usuario_id]);
            if (userResult.rows.length === 0) {
                throw new admin_1.AppError("Usuario nao encontrado", 404);
            }
            const usuario = userResult.rows[0];
            await client.query(`UPDATE usuarios SET pago = TRUE WHERE id = $1`, [usuario_id]);
            await client.query(`INSERT INTO logs_admin (admin_id, acao, descricao, dados_acao, ip)
                 VALUES ($1, $2, $3, $4, $5)`, [
                admin_id,
                "marcar_pago",
                `Usuario ${usuario.nome_usuario} (${usuario.email}) marcado como pago`,
                JSON.stringify({ usuario_id, nome: usuario.nome_usuario, email: usuario.email }),
                ip
            ]);
        });
    }
    // ============================================
    // DESMARCAR USUARIO COMO PAGO
    // ============================================
    async desmarcarUsuarioPago(usuario_id, admin_id, ip) {
        await (0, connection_1.transaction)(async (client) => {
            const userResult = await client.query(`SELECT id, nome_usuario, email FROM usuarios WHERE id = $1`, [usuario_id]);
            if (userResult.rows.length === 0) {
                throw new admin_1.AppError("Usuario nao encontrado", 404);
            }
            const usuario = userResult.rows[0];
            await client.query(`UPDATE usuarios SET pago = FALSE WHERE id = $1`, [usuario_id]);
            await client.query(`INSERT INTO logs_admin (admin_id, acao, descricao, dados_acao, ip)
                 VALUES ($1, $2, $3, $4, $5)`, [
                admin_id,
                "desmarcar_pago",
                `Usuario ${usuario.nome_usuario} (${usuario.email}) desmarcado como pago`,
                JSON.stringify({ usuario_id, nome: usuario.nome_usuario, email: usuario.email }),
                ip
            ]);
        });
    }
    // ============================================
    // VERIFICAR PERMISSAO
    // ============================================
    async verificarPermissao(admin_id, permissao) {
        const result = await (0, connection_1.query)(`SELECT 1 FROM admin_permissoes ap
             JOIN permissoes_admin p ON ap.permissao_id = p.id
             WHERE ap.admin_id = $1 AND p.nome = $2 AND ap.ativo = TRUE AND p.ativo = TRUE`, [admin_id, permissao]);
        return result.rows.length > 0;
    }
    // ============================================
    // LOG DE ACAO ADMIN
    // ============================================
    async logAdminAction(admin_id, acao, descricao, ip, dados_acao) {
        await (0, connection_1.query)(`INSERT INTO logs_admin (admin_id, acao, descricao, dados_acao, ip)
             VALUES ($1, $2, $3, $4, $5)`, [admin_id, acao, descricao, dados_acao ? JSON.stringify(dados_acao) : null, ip]);
    }
    // ============================================
    // 🆕 REGISTRAR LOG (usado pelo adminController)
    // ============================================
    async registrarLog(dados) {
        await (0, connection_1.query)(`INSERT INTO logs_admin (admin_id, acao, descricao, dados_acao, ip, user_agent)
             VALUES ($1, $2, $3, $4, $5, $6)`, [
            dados.admin_id ?? null,
            dados.acao,
            dados.descricao ?? null,
            dados.dados ? JSON.stringify(dados.dados) : null,
            dados.ip ?? null,
            dados.user_agent ?? null
        ]);
    }
    // ============================================
    // EXCLUIR USUÁRIO
    // ============================================
    async excluirUsuario(usuario_id, admin_id, ip) {
        await (0, connection_1.transaction)(async (client) => {
            const userResult = await client.query(`SELECT id, nome_usuario, email FROM usuarios WHERE id = $1`, [usuario_id]);
            if (userResult.rows.length === 0) {
                throw new admin_1.AppError("Usuario nao encontrado", 404);
            }
            const usuario = userResult.rows[0];
            await client.query(`INSERT INTO logs_admin (admin_id, acao, descricao, dados_acao, ip)
                 VALUES ($1, $2, $3, $4, $5)`, [
                admin_id,
                "excluir_usuario",
                `Usuario ${usuario.nome_usuario} (${usuario.email}) excluido`,
                JSON.stringify({
                    usuario_id,
                    nome: usuario.nome_usuario,
                    email: usuario.email
                }),
                ip
            ]);
            await client.query(`DELETE FROM usuarios WHERE id = $1`, [usuario_id]);
            console.log(`✅ Usuario ${usuario.nome_usuario} (ID: ${usuario_id}) excluido`);
        });
    }
    // ============================================
    // 🆕 PERMISSOES - LISTAR DISPONIVEIS
    // ============================================
    async listarPermissoes() {
        const result = await (0, connection_1.query)(`SELECT id, nome, descricao 
             FROM permissoes_admin 
             WHERE ativo = TRUE 
             ORDER BY id`);
        return result.rows;
    }
    // ============================================
    // 🆕 BUSCAR PERMISSOES DE UM ADMIN
    // ============================================
    async getPermissoesAdmin(admin_id) {
        const result = await (0, connection_1.query)(`SELECT p.nome 
             FROM admin_permissoes ap
             JOIN permissoes_admin p ON p.id = ap.permissao_id
             WHERE ap.admin_id = $1 AND ap.ativo = TRUE AND p.ativo = TRUE`, [admin_id]);
        return result.rows.map((r) => r.nome);
    }
    // ============================================
    // 🆕 DEFINIR PERMISSOES DE UM ADMIN
    // ============================================
    async setPermissoesAdmin(admin_id, permissoes) {
        await (0, connection_1.transaction)(async (client) => {
            await client.query(`UPDATE admin_permissoes 
                 SET ativo = FALSE 
                 WHERE admin_id = $1`, [admin_id]);
            if (!permissoes || permissoes.length === 0)
                return;
            for (const nomePermissao of permissoes) {
                await client.query(`INSERT INTO admin_permissoes (admin_id, permissao_id, ativo)
                     VALUES ($1, (SELECT id FROM permissoes_admin WHERE nome = $2), TRUE)
                     ON CONFLICT (admin_id, permissao_id) 
                     DO UPDATE SET ativo = TRUE`, [admin_id, nomePermissao]);
            }
        });
    }
    // ============================================
    // 🆕 ADMINS - LISTAR (AJUSTADO: data_criacao)
    // ============================================
    async listarAdmins() {
        const result = await (0, connection_1.query)(`SELECT 
                id AS admin_id,
                nome,
                email,
                ativo,
                data_criacao,
                ultimo_login,
                ultimo_ip
             FROM administradores
             ORDER BY id`);
        const admins = await Promise.all(result.rows.map(async (admin) => ({
            ...admin,
            permissoes: await this.getPermissoesAdmin(admin.admin_id)
        })));
        return admins;
    }
    // ============================================
    // 🆕 ADMINS - BUSCAR POR ID (AJUSTADO: data_criacao)
    // ============================================
    async buscarAdmin(admin_id) {
        const result = await (0, connection_1.query)(`SELECT 
                id AS admin_id,
                nome,
                email,
                ativo,
                data_criacao,
                ultimo_login,
                ultimo_ip
             FROM administradores 
             WHERE id = $1`, [admin_id]);
        if (result.rows.length === 0)
            return null;
        const admin = result.rows[0];
        admin.permissoes = await this.getPermissoesAdmin(admin_id);
        return admin;
    }
    // ============================================
    // 🆕 ADMINS - CRIAR
    // ============================================
    async criarAdmin(dados) {
        const { nome, email, senha, permissoes } = dados;
        const existe = await (0, connection_1.query)(`SELECT id FROM administradores WHERE email = $1`, [email]);
        if (existe.rows.length > 0) {
            throw new admin_1.AppError("Email ja cadastrado", 400);
        }
        const { hashSenha } = await Promise.resolve().then(() => __importStar(require("../utils/crypto")));
        const senha_hash = hashSenha(senha);
        const result = await (0, connection_1.query)(`INSERT INTO administradores (nome, email, senha_hash, ativo)
             VALUES ($1, $2, $3, TRUE)
             RETURNING id AS admin_id, nome, email, ativo`, [nome, email, senha_hash]);
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
    async atualizarAdmin(admin_id, dados) {
        const { nome, email, senha, permissoes, ativo } = dados;
        const campos = [];
        const valores = [];
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
            const { hashSenha } = await Promise.resolve().then(() => __importStar(require("../utils/crypto")));
            campos.push(`senha_hash = $${idx++}`);
            valores.push(hashSenha(senha));
        }
        if (campos.length > 0) {
            valores.push(admin_id);
            await (0, connection_1.query)(`UPDATE administradores SET ${campos.join(', ')} WHERE id = $${idx}`, valores);
        }
        if (permissoes !== undefined) {
            await this.setPermissoesAdmin(admin_id, permissoes);
        }
        return this.buscarAdmin(admin_id);
    }
    // ============================================
    // 🆕 ADMINS - EXCLUIR
    // ============================================
    async excluirAdmin(admin_id) {
        const result = await (0, connection_1.query)(`DELETE FROM administradores WHERE id = $1 RETURNING id`, [admin_id]);
        return (result.rowCount ?? 0) > 0;
    }
    // ============================================
    // 🆕 LOGS DO SISTEMA - LISTAR (AJUSTADO: data_log)
    // ============================================
    async listarLogs(opts) {
        const page = opts.page || 1;
        const limit = Math.min(opts.limit || 50, 200);
        const offset = (page - 1) * limit;
        const where = [];
        const params = [];
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
        const countResult = await (0, connection_1.query)(`SELECT COUNT(*) FROM logs_admin l ${whereSql}`, params);
        const total = parseInt(countResult.rows[0].count, 10);
        params.push(limit, offset);
        const result = await (0, connection_1.query)(`SELECT 
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
             LIMIT $${idx++} OFFSET $${idx++}`, params);
        return {
            dados: result.rows,
            total,
            total_paginas: Math.ceil(total / limit)
        };
    }
    // ============================================
    // 🆕 HISTORICO DE LOGINS DOS USUARIOS
    // ============================================
    async listarLogins(opts) {
        const page = opts.page || 1;
        const limit = Math.min(opts.limit || 50, 200);
        const offset = (page - 1) * limit;
        const where = [];
        const params = [];
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
        const countResult = await (0, connection_1.query)(`SELECT COUNT(*) FROM historico_login h
             JOIN usuarios u ON u.id = h.usuario_id
             ${whereSql}`, params);
        const total = parseInt(countResult.rows[0].count, 10);
        params.push(limit, offset);
        const result = await (0, connection_1.query)(`SELECT 
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
             LIMIT $${idx++} OFFSET $${idx++}`, params);
        return {
            dados: result.rows,
            total,
            total_paginas: Math.ceil(total / limit)
        };
    }
    // ============================================
    // 🆕 SESSOES ADMIN - LISTAR
    // ============================================
    async listarSessoesAdmin(opts = {}) {
        const page = opts.page || 1;
        const limit = Math.min(opts.limit || 50, 200);
        const offset = (page - 1) * limit;
        const where = opts.apenas_ativas
            ? `WHERE s.ativo = TRUE AND s.data_expiracao > NOW()`
            : '';
        const countResult = await (0, connection_1.query)(`SELECT COUNT(*) FROM sessoes_admin s ${where}`, []);
        const total = parseInt(countResult.rows[0].count, 10);
        const result = await (0, connection_1.query)(`SELECT 
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
             LIMIT $1 OFFSET $2`, [limit, offset]);
        return {
            dados: result.rows,
            total,
            total_paginas: Math.ceil(total / limit)
        };
    }
    // ============================================
    // 🆕 SESSOES ADMIN - REVOGAR UMA
    // ============================================
    async revogarSessaoAdmin(sessao_id) {
        const result = await (0, connection_1.query)(`UPDATE sessoes_admin 
             SET ativo = FALSE 
             WHERE id = $1 
             RETURNING id`, [sessao_id]);
        return (result.rowCount ?? 0) > 0;
    }
    // ============================================
    // 🆕 SESSOES ADMIN - REVOGAR TODAS DE UM ADMIN
    // ============================================
    async revogarSessoesAdmin(admin_id) {
        const result = await (0, connection_1.query)(`UPDATE sessoes_admin 
             SET ativo = FALSE 
             WHERE admin_id = $1 AND ativo = TRUE 
             RETURNING id`, [admin_id]);
        return result.rowCount ?? 0;
    }
    // ============================================
    // 🆕 LIMPAR SESSOES INATIVAS (admin)
    // ============================================
    async limparSessoesInativasAdmin() {
        const result = await (0, connection_1.query)(`UPDATE sessoes_admin 
             SET ativo = FALSE 
             WHERE ativo = TRUE AND data_expiracao < NOW()
             RETURNING id`);
        return result.rowCount ?? 0;
    }
}
exports.AdminService = AdminService;
exports.default = new AdminService();
//# sourceMappingURL=adminService.js.map