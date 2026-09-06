import { PoolClient } from "pg";
import { query, transaction } from "../database/connection";
import { sha256, gerarToken, compararSenha } from "../utils/crypto";
import { AppError, LoginResponse, PodeLogarResponse, SessaoComUsuario } from "../types";

// ============================================
// FUNÇÕES DE VALIDAÇÃO
// ============================================
const validarEmail = (email: string): boolean => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
};

const validarSenha = (senha: string): boolean => {
    return typeof senha === 'string' && senha.length >= 6;
};

export class AuthService {
    // ============================================
    // LOGIN
    // ============================================
    async login(
        email: string,
        senha: string,
        ip: string,
        userAgent: string
    ): Promise<LoginResponse["dados"]> {
        if (!email || !senha) {
            throw new AppError("Email e senha são obrigatórios", 400);
        }
        if (!validarEmail(email)) {
            throw new AppError("Email inválido", 400);
        }
        if (!validarSenha(senha)) {
            throw new AppError("Senha deve ter pelo menos 6 caracteres", 400);
        }

        return await transaction(async (client: PoolClient) => {
            // 1. Buscar usuário
            const usuarioResult = await client.query(
                `SELECT id, nome_usuario, email, senha_hash, ativo 
                 FROM usuarios 
                 WHERE email = $1`,
                [email]
            );

            if (usuarioResult.rows.length === 0) {
                throw new AppError("Usuário não encontrado", 401);
            }

            const usuario = usuarioResult.rows[0];

            if (!usuario.ativo) {
                throw new AppError("Usuário desativado", 403);
            }

            // 2. Verificar senha
            if (!compararSenha(senha, usuario.senha_hash)) {
                await client.query(
                    `INSERT INTO logs_sistema (usuario_id, acao, descricao, ip) 
                     VALUES ($1, $2, $3, $4)`,
                    [usuario.id, "login_falha", "Tentativa de login com senha incorreta", ip]
                );
                throw new AppError("Senha incorreta", 401);
            }

            // 3. Buscar perfil do usuário
            const perfilResult = await client.query(
                `SELECT up.perfil_id, p.nome, p.limite_usuarios_logados, up.data_validade
                 FROM usuario_perfil up
                 JOIN perfis_acesso p ON up.perfil_id = p.id
                 WHERE up.usuario_id = $1 
                 AND up.ativo = TRUE 
                 AND (up.data_validade IS NULL OR up.data_validade > NOW())
                 ORDER BY up.data_inicio DESC
                 LIMIT 1`,
                [usuario.id]
            );

            if (perfilResult.rows.length === 0) {
                throw new AppError("Usuário não possui perfil ativo", 403);
            }

            const perfil = perfilResult.rows[0];

            // 4. Verificar se perfil tem vaga
            const vagasResult = await client.query(
                `SELECT COUNT(DISTINCT s.usuario_id) as logados
                 FROM sessoes s
                 WHERE s.perfil_id = $1 
                 AND s.ativo = TRUE 
                 AND s.data_expiracao > NOW()`,
                [perfil.perfil_id]
            );

            const logados = parseInt(vagasResult.rows[0].logados);
            if (logados >= perfil.limite_usuarios_logados) {
                throw new AppError(
                    `Perfil "${perfil.nome}" está lotado. Limite: ${perfil.limite_usuarios_logados} usuário(s) logado(s) simultaneamente.`,
                    429
                );
            }

            // 5. Gerar token
            const token = gerarToken();
            const expiracao = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

            // 6. Desativar sessões antigas do usuário
            await client.query(
                `UPDATE sessoes 
                 SET ativo = FALSE 
                 WHERE usuario_id = $1 AND ativo = TRUE`,
                [usuario.id]
            );

            // 7. Criar nova sessão
            await client.query(
                `INSERT INTO sessoes (usuario_id, perfil_id, token, data_expiracao, ip, user_agent)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [usuario.id, perfil.perfil_id, token, expiracao, ip, userAgent]
            );

            // 8. Registrar histórico de login
            await client.query(
                `INSERT INTO historico_login (usuario_id, perfil_id, ip, user_agent)
                 VALUES ($1, $2, $3, $4)`,
                [usuario.id, perfil.perfil_id, ip, userAgent]
            );

            // 9. ✅ CORRIGIDO: Atualizar apenas ultimo_login
            await client.query(
                `UPDATE usuarios 
                 SET ultimo_login = NOW()
                 WHERE id = $1`,
                [usuario.id]
            );

            // 10. Registrar log de sucesso
            await client.query(
                `INSERT INTO logs_sistema (usuario_id, perfil_id, acao, descricao, ip)
                 VALUES ($1, $2, $3, $4, $5)`,
                [usuario.id, perfil.perfil_id, "login", "Login realizado com sucesso", ip]
            );

            return {
                usuario: {
                    id: usuario.id,
                    nome: usuario.nome_usuario,
                    email: usuario.email
                },
                perfil: perfil.nome,
                token: token,
                expira_em: "7 dias"
            };
        });
    }

    // ============================================
    // LOGOUT
    // ============================================
    async logout(token: string): Promise<{ mensagem: string }> {
        return await transaction(async (client: PoolClient) => {
            const sessaoResult = await client.query(
                `SELECT usuario_id, perfil_id, ip 
                 FROM sessoes 
                 WHERE token = $1 AND ativo = TRUE`,
                [token]
            );

            if (sessaoResult.rows.length === 0) {
                throw new AppError("Sessão não encontrada", 404);
            }

            const sessao = sessaoResult.rows[0];

            await client.query(
                `UPDATE sessoes 
                 SET ativo = FALSE 
                 WHERE token = $1`,
                [token]
            );

            await client.query(
                `UPDATE historico_login 
                 SET data_logout = NOW(),
                     duracao_minutos = EXTRACT(EPOCH FROM (NOW() - data_login)) / 60
                 WHERE usuario_id = $1 
                 AND perfil_id = $2 
                 AND data_logout IS NULL 
                 ORDER BY data_login DESC 
                 LIMIT 1`,
                [sessao.usuario_id, sessao.perfil_id]
            );

            await client.query(
                `INSERT INTO logs_sistema (usuario_id, perfil_id, acao, descricao, ip)
                 VALUES ($1, $2, $3, $4, $5)`,
                [sessao.usuario_id, sessao.perfil_id, "logout", "Logout realizado", sessao.ip]
            );

            return { mensagem: "Logout realizado com sucesso" };
        });
    }

    // ============================================
    // VALIDAR TOKEN
    // ============================================
    async validarToken(token: string): Promise<SessaoComUsuario | null> {
        const result = await query<SessaoComUsuario>(
            `SELECT 
                s.*,
                u.nome_usuario as nome,
                u.email,
                u.ativo AS usuario_ativo,
                p.nome AS perfil_nome
             FROM sessoes s
             JOIN usuarios u ON s.usuario_id = u.id
             JOIN perfis_acesso p ON s.perfil_id = p.id
             WHERE s.token = $1 
             AND s.ativo = TRUE 
             AND s.data_expiracao > NOW()
             AND u.ativo = TRUE`,
            [token]
        );

        return result.rows.length > 0 ? result.rows[0] : null;
    }

    // ============================================
    // VERIFICAR SE PODE LOGAR
    // ============================================
    async podeLogar(email: string): Promise<PodeLogarResponse> {
        const result = await query(
            `SELECT u.id, u.nome_usuario, u.email, p.nome AS perfil, p.limite_usuarios_logados
             FROM usuarios u
             LEFT JOIN usuario_perfil up ON u.id = up.usuario_id AND up.ativo = TRUE
             LEFT JOIN perfis_acesso p ON up.perfil_id = p.id
             WHERE u.email = $1 AND u.ativo = TRUE`,
            [email]
        );

        if (result.rows.length === 0) {
            return { pode: false, motivo: "Usuário não encontrado" };
        }

        const usuario = result.rows[0];

        if (!usuario.perfil) {
            return { pode: false, motivo: "Usuário não possui perfil ativo" };
        }

        const vagasResult = await query(
            `SELECT COUNT(DISTINCT s.usuario_id) as logados
             FROM sessoes s
             WHERE s.perfil_id = (
                 SELECT perfil_id 
                 FROM usuario_perfil 
                 WHERE usuario_id = $1 AND ativo = TRUE 
                 LIMIT 1
             )
             AND s.ativo = TRUE 
             AND s.data_expiracao > NOW()`,
            [usuario.id]
        );

        const logados = parseInt(vagasResult.rows[0].logados);
        const pode = logados < usuario.limite_usuarios_logados;

        return {
            pode,
            usuario: {
                id: usuario.id,
                nome: usuario.nome_usuario,
                email: usuario.email
            },
            perfil: usuario.perfil,
            limite: usuario.limite_usuarios_logados,
            logados: logados,
            vagas: usuario.limite_usuarios_logados - logados,
            motivo: pode ? "Pode logar" : "Perfil lotado"
        };
    }

    // ============================================
    // STATUS DOS PERFIS
    // ============================================
    async statusPerfis(): Promise<any[]> {
        const result = await query(
            `SELECT 
                p.id,
                p.nome AS perfil,
                p.limite_usuarios_logados,
                p.descricao,
                COUNT(DISTINCT s.usuario_id) AS usuarios_logados,
                p.limite_usuarios_logados - COUNT(DISTINCT s.usuario_id) AS vagas_disponiveis,
                COUNT(DISTINCT up.usuario_id) AS total_usuarios_com_perfil,
                CASE 
                    WHEN COUNT(DISTINCT s.usuario_id) >= p.limite_usuarios_logados THEN 'Lotado'
                    ELSE 'Disponível'
                END AS status
            FROM perfis_acesso p
            LEFT JOIN usuario_perfil up ON p.id = up.perfil_id AND up.ativo = TRUE
            LEFT JOIN sessoes s ON p.id = s.perfil_id AND s.ativo = TRUE AND s.data_expiracao > NOW()
            WHERE p.ativo = TRUE
            GROUP BY p.id, p.nome, p.limite_usuarios_logados, p.descricao
            ORDER BY p.id`
        );

        return result.rows;
    }

    // ============================================
    // CRIAR USUÁRIO
    // ============================================
    async criarUsuario(
        nome_usuario: string,
        email: string,
        senha: string
    ): Promise<{ id: number; nome_usuario: string; email: string }> {
        if (!nome_usuario || !email || !senha) {
            throw new AppError("Nome, email e senha são obrigatórios", 400);
        }
        if (!validarEmail(email)) {
            throw new AppError("Email inválido", 400);
        }
        if (!validarSenha(senha)) {
            throw new AppError("Senha deve ter pelo menos 6 caracteres", 400);
        }

        return await transaction(async (client: PoolClient) => {
            const existeResult = await client.query(
                "SELECT id FROM usuarios WHERE email = $1",
                [email]
            );

            if (existeResult.rows.length > 0) {
                throw new AppError("Email já cadastrado", 409);
            }

            const senhaHash = sha256(senha);

            const result = await client.query(
                `INSERT INTO usuarios (nome_usuario, email, senha_hash) 
                 VALUES ($1, $2, $3) 
                 RETURNING id, nome_usuario, email`,
                [nome_usuario.trim(), email.trim(), senhaHash]
            );

            const usuario = result.rows[0];

            await client.query(
                `INSERT INTO logs_sistema (usuario_id, acao, descricao, ip)
                 VALUES ($1, $2, $3, $4)`,
                [usuario.id, "cadastro", "Novo usuário cadastrado", "0.0.0.0"]
            );

            return usuario;
        });
    }
}

export default new AuthService();