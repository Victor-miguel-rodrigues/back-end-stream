import { Request, Response, NextFunction } from "express";

// ============================================
// VALIDAR USUÁRIO (CADASTRO)
// ============================================
export function validarUsuario(
    req: Request,
    res: Response,
    next: NextFunction
) {
    const { nome_usuario, email, senha } = req.body;

    // Validar nome_usuario
    if (!nome_usuario || typeof nome_usuario !== "string" || nome_usuario.trim() === "") {
        return res.status(400).json({
            status: false,
            message: "Nome de usuário é obrigatório"
        });
    }

    if (nome_usuario.trim().length < 3) {
        return res.status(400).json({
            status: false,
            message: "Nome de usuário deve ter pelo menos 3 caracteres"
        });
    }

    if (nome_usuario.trim().length > 100) {
        return res.status(400).json({
            status: false,
            message: "Nome de usuário deve ter no máximo 100 caracteres"
        });
    }

    // Validar email
    if (!email || typeof email !== "string" || email.trim() === "") {
        return res.status(400).json({
            status: false,
            message: "Email é obrigatório"
        });
    }

    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailValido.test(email)) {
        return res.status(400).json({
            status: false,
            message: "Email inválido"
        });
    }

    // Validar senha
    if (!senha || typeof senha !== "string" || senha.trim() === "") {
        return res.status(400).json({
            status: false,
            message: "Senha é obrigatória"
        });
    }

    if (senha.length < 6) {
        return res.status(400).json({
            status: false,
            message: "Senha deve ter pelo menos 6 caracteres"
        });
    }

    // Sanitizar campos (remover espaços extras)
    req.body.nome_usuario = nome_usuario.trim();
    req.body.email = email.trim();
    req.body.senha = senha;

    next();
}

// ============================================
// VALIDAR LOGIN
// ============================================
export function validarLogin(
    req: Request,
    res: Response,
    next: NextFunction
) {
    const { email, senha } = req.body;

    // Validar email
    if (!email || typeof email !== "string") {
        return res.status(400).json({
            status: false,
            message: "Email é obrigatório"
        });
    }

    if (email.trim() === "") {
        return res.status(400).json({
            status: false,
            message: "Email não pode estar vazio"
        });
    }

    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailValido.test(email.trim())) {
        return res.status(400).json({
            status: false,
            message: "Email inválido"
        });
    }

    // Validar senha
    if (!senha || typeof senha !== "string") {
        return res.status(400).json({
            status: false,
            message: "Senha é obrigatória"
        });
    }

    if (senha.trim() === "") {
        return res.status(400).json({
            status: false,
            message: "Senha não pode estar vazia"
        });
    }

    if (senha.length < 6) {
        return res.status(400).json({
            status: false,
            message: "Senha deve ter pelo menos 6 caracteres"
        });
    }

    // Sanitizar
    req.body.email = email.trim();
    req.body.senha = senha;

    next();
}

// ============================================
// VALIDAR PERFIL (ASSOCIAR PERFIL AO USUÁRIO)
// ============================================
export function validarPerfilUsuario(
    req: Request,
    res: Response,
    next: NextFunction
) {
    const { usuario_id, perfil_id, dias_validade } = req.body;

    // Validar usuario_id
    if (!usuario_id) {
        return res.status(400).json({
            status: false,
            message: "ID do usuário é obrigatório"
        });
    }

    if (typeof usuario_id !== "number" || usuario_id <= 0) {
        return res.status(400).json({
            status: false,
            message: "ID do usuário inválido"
        });
    }

    // Validar perfil_id
    if (!perfil_id) {
        return res.status(400).json({
            status: false,
            message: "ID do perfil é obrigatório"
        });
    }

    if (typeof perfil_id !== "number" || perfil_id <= 0) {
        return res.status(400).json({
            status: false,
            message: "ID do perfil inválido"
        });
    }

    // Validar dias_validade (opcional)
    if (dias_validade !== undefined) {
        if (typeof dias_validade !== "number" || dias_validade <= 0) {
            return res.status(400).json({
                status: false,
                message: "Dias de validade deve ser um número positivo"
            });
        }
    }

    next();
}

// ============================================
// VALIDAR CRIAR PERFIL
// ============================================
export function validarCriarPerfil(
    req: Request,
    res: Response,
    next: NextFunction
) {
    const { nome, descricao, limite_usuarios_logados, dias_validade } = req.body;

    // Validar nome
    if (!nome || typeof nome !== "string" || nome.trim() === "") {
        return res.status(400).json({
            status: false,
            message: "Nome do perfil é obrigatório"
        });
    }

    if (nome.trim().length < 3) {
        return res.status(400).json({
            status: false,
            message: "Nome do perfil deve ter pelo menos 3 caracteres"
        });
    }

    if (nome.trim().length > 50) {
        return res.status(400).json({
            status: false,
            message: "Nome do perfil deve ter no máximo 50 caracteres"
        });
    }

    // Validar descricao (opcional)
    if (descricao !== undefined && typeof descricao !== "string") {
        return res.status(400).json({
            status: false,
            message: "Descrição deve ser um texto"
        });
    }

    // Validar limite_usuarios_logados
    if (!limite_usuarios_logados) {
        return res.status(400).json({
            status: false,
            message: "Limite de usuários logados é obrigatório"
        });
    }

    if (typeof limite_usuarios_logados !== "number" || limite_usuarios_logados < 1) {
        return res.status(400).json({
            status: false,
            message: "Limite de usuários logados deve ser pelo menos 1"
        });
    }

    // Validar dias_validade (opcional)
    if (dias_validade !== undefined) {
        if (typeof dias_validade !== "number" || dias_validade <= 0) {
            return res.status(400).json({
                status: false,
                message: "Dias de validade deve ser um número positivo"
            });
        }
    }

    // Sanitizar
    req.body.nome = nome.trim();
    if (descricao) req.body.descricao = descricao.trim();

    next();
}

// ============================================
// VALIDAR ATUALIZAR PERFIL
// ============================================
export function validarAtualizarPerfil(
    req: Request,
    res: Response,
    next: NextFunction
) {
    const { id, nome, descricao, limite_usuarios_logados, dias_validade, ativo } = req.body;

    // Validar id
    if (!id) {
        return res.status(400).json({
            status: false,
            message: "ID do perfil é obrigatório"
        });
    }

    if (typeof id !== "number" || id <= 0) {
        return res.status(400).json({
            status: false,
            message: "ID do perfil inválido"
        });
    }

    // Validar nome (opcional)
    if (nome !== undefined) {
        if (typeof nome !== "string" || nome.trim() === "") {
            return res.status(400).json({
                status: false,
                message: "Nome do perfil não pode estar vazio"
            });
        }
        if (nome.trim().length < 3) {
            return res.status(400).json({
                status: false,
                message: "Nome do perfil deve ter pelo menos 3 caracteres"
            });
        }
        if (nome.trim().length > 50) {
            return res.status(400).json({
                status: false,
                message: "Nome do perfil deve ter no máximo 50 caracteres"
            });
        }
        req.body.nome = nome.trim();
    }

    // Validar descricao (opcional)
    if (descricao !== undefined && typeof descricao !== "string") {
        return res.status(400).json({
            status: false,
            message: "Descrição deve ser um texto"
        });
    }
    if (descricao) req.body.descricao = descricao.trim();

    // Validar limite_usuarios_logados (opcional)
    if (limite_usuarios_logados !== undefined) {
        if (typeof limite_usuarios_logados !== "number" || limite_usuarios_logados < 1) {
            return res.status(400).json({
                status: false,
                message: "Limite de usuários logados deve ser pelo menos 1"
            });
        }
    }

    // Validar dias_validade (opcional)
    if (dias_validade !== undefined) {
        if (typeof dias_validade !== "number" || dias_validade <= 0) {
            return res.status(400).json({
                status: false,
                message: "Dias de validade deve ser um número positivo"
            });
        }
    }

    // Validar ativo (opcional)
    if (ativo !== undefined && typeof ativo !== "boolean") {
        return res.status(400).json({
            status: false,
            message: "Ativo deve ser true ou false"
        });
    }

    next();
}

// ============================================
// VALIDAR TOKEN
// ============================================
export function validarToken(
    req: Request,
    res: Response,
    next: NextFunction
) {
    const token = req.headers.authorization?.split(' ')[1] || req.body.token || req.query.token;

    if (!token) {
        return res.status(401).json({
            status: false,
            message: "Token não fornecido"
        });
    }

    if (typeof token !== "string" || token.trim() === "") {
        return res.status(401).json({
            status: false,
            message: "Token inválido"
        });
    }

    if (token.length < 32) {
        return res.status(401).json({
            status: false,
            message: "Token inválido"
        });
    }

    req.body.token = token.trim();
    next();
}

// ============================================
// VALIDAR ID (para parâmetros de URL) - CORRIGIDO
// ============================================
export function validarId(
    req: Request,
    res: Response,
    next: NextFunction
) {
    const { id } = req.params;

    // ✅ CORRIGIDO: tratar quando id é array
    const idStr = Array.isArray(id) ? id[0] : id;

    if (!idStr || idStr.trim() === "") {
        return res.status(400).json({
            status: false,
            message: "ID é obrigatório"
        });
    }

    const idNumero = parseInt(idStr, 10);
    if (isNaN(idNumero) || idNumero <= 0) {
        return res.status(400).json({
            status: false,
            message: "ID inválido"
        });
    }

    req.params.id = idNumero.toString();
    next();
}

// ============================================
// VALIDAR EMAIL (PARÂMETRO) - CORRIGIDO
// ============================================
export function validarEmailParam(
    req: Request,
    res: Response,
    next: NextFunction
) {
    const { email } = req.params;

    // ✅ CORRIGIDO: tratar quando email é array
    const emailStr = Array.isArray(email) ? email[0] : email;

    if (!emailStr || emailStr.trim() === "") {
        return res.status(400).json({
            status: false,
            message: "Email é obrigatório"
        });
    }

    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailValido.test(emailStr)) {
        return res.status(400).json({
            status: false,
            message: "Email inválido"
        });
    }

    req.params.email = emailStr;
    next();
}

// ============================================
// VALIDAR PAGINAÇÃO - CORRIGIDO
// ============================================
export function validarPaginacao(
    req: Request,
    res: Response,
    next: NextFunction
) {
    const { page = 1, limit = 10 } = req.query;

    // ✅ CORRIGIDO: tratar quando são arrays
    const pageStr = Array.isArray(page) ? page[0] : page;
    const limitStr = Array.isArray(limit) ? limit[0] : limit;

    const pageNum = parseInt(pageStr as string, 10);
    const limitNum = parseInt(limitStr as string, 10);

    if (isNaN(pageNum) || pageNum < 1) {
        return res.status(400).json({
            status: false,
            message: "Página deve ser um número maior que 0"
        });
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        return res.status(400).json({
            status: false,
            message: "Limite deve ser um número entre 1 e 100"
        });
    }

    req.query.page = pageNum.toString();
    req.query.limit = limitNum.toString();

    next();
}

// ============================================
// EXPORTAR TUDO
// ============================================
export default {
    validarUsuario,
    validarLogin,
    validarPerfilUsuario,
    validarCriarPerfil,
    validarAtualizarPerfil,
    validarToken,
    validarId,
    validarEmailParam,
    validarPaginacao
};