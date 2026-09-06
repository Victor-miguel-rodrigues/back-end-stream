"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validarUsuario = validarUsuario;
exports.validarLogin = validarLogin;
exports.validarPerfilUsuario = validarPerfilUsuario;
exports.validarCriarPerfil = validarCriarPerfil;
exports.validarAtualizarPerfil = validarAtualizarPerfil;
exports.validarToken = validarToken;
exports.validarId = validarId;
exports.validarEmailParam = validarEmailParam;
exports.validarPaginacao = validarPaginacao;
// ============================================
// VALIDAR USUÁRIO (CADASTRO)
// ============================================
function validarUsuario(req, res, next) {
    const { nome_usuario, email, senha } = req.body;
    if (!nome_usuario || typeof nome_usuario !== "string" || nome_usuario.trim() === "") {
        res.status(400).json({
            status: false,
            message: "Nome de usuário é obrigatório"
        });
        return;
    }
    if (nome_usuario.trim().length < 3) {
        res.status(400).json({
            status: false,
            message: "Nome de usuário deve ter pelo menos 3 caracteres"
        });
        return;
    }
    if (nome_usuario.trim().length > 100) {
        res.status(400).json({
            status: false,
            message: "Nome de usuário deve ter no máximo 100 caracteres"
        });
        return;
    }
    if (!email || typeof email !== "string" || email.trim() === "") {
        res.status(400).json({
            status: false,
            message: "Email é obrigatório"
        });
        return;
    }
    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailValido.test(email)) {
        res.status(400).json({
            status: false,
            message: "Email inválido"
        });
        return;
    }
    if (!senha || typeof senha !== "string" || senha.trim() === "") {
        res.status(400).json({
            status: false,
            message: "Senha é obrigatória"
        });
        return;
    }
    if (senha.length < 6) {
        res.status(400).json({
            status: false,
            message: "Senha deve ter pelo menos 6 caracteres"
        });
        return;
    }
    req.body.nome_usuario = nome_usuario.trim();
    req.body.email = email.trim();
    req.body.senha = senha;
    next();
}
// ============================================
// VALIDAR LOGIN
// ============================================
function validarLogin(req, res, next) {
    const { email, senha } = req.body;
    if (!email || typeof email !== "string") {
        res.status(400).json({
            status: false,
            message: "Email é obrigatório"
        });
        return;
    }
    if (email.trim() === "") {
        res.status(400).json({
            status: false,
            message: "Email não pode estar vazio"
        });
        return;
    }
    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailValido.test(email.trim())) {
        res.status(400).json({
            status: false,
            message: "Email inválido"
        });
        return;
    }
    if (!senha || typeof senha !== "string") {
        res.status(400).json({
            status: false,
            message: "Senha é obrigatória"
        });
        return;
    }
    if (senha.trim() === "") {
        res.status(400).json({
            status: false,
            message: "Senha não pode estar vazia"
        });
        return;
    }
    if (senha.length < 6) {
        res.status(400).json({
            status: false,
            message: "Senha deve ter pelo menos 6 caracteres"
        });
        return;
    }
    req.body.email = email.trim();
    req.body.senha = senha;
    next();
}
// ============================================
// VALIDAR PERFIL (ASSOCIAR PERFIL AO USUÁRIO)
// ============================================
function validarPerfilUsuario(req, res, next) {
    const { usuario_id, perfil_id, dias_validade } = req.body;
    if (!usuario_id) {
        res.status(400).json({
            status: false,
            message: "ID do usuário é obrigatório"
        });
        return;
    }
    if (typeof usuario_id !== "number" || usuario_id <= 0) {
        res.status(400).json({
            status: false,
            message: "ID do usuário inválido"
        });
        return;
    }
    if (!perfil_id) {
        res.status(400).json({
            status: false,
            message: "ID do perfil é obrigatório"
        });
        return;
    }
    if (typeof perfil_id !== "number" || perfil_id <= 0) {
        res.status(400).json({
            status: false,
            message: "ID do perfil inválido"
        });
        return;
    }
    if (dias_validade !== undefined) {
        if (typeof dias_validade !== "number" || dias_validade <= 0) {
            res.status(400).json({
                status: false,
                message: "Dias de validade deve ser um número positivo"
            });
            return;
        }
    }
    next();
}
// ============================================
// VALIDAR CRIAR PERFIL
// ============================================
function validarCriarPerfil(req, res, next) {
    const { nome, descricao, limite_usuarios_logados, dias_validade } = req.body;
    if (!nome || typeof nome !== "string" || nome.trim() === "") {
        res.status(400).json({
            status: false,
            message: "Nome do perfil é obrigatório"
        });
        return;
    }
    if (nome.trim().length < 3) {
        res.status(400).json({
            status: false,
            message: "Nome do perfil deve ter pelo menos 3 caracteres"
        });
        return;
    }
    if (nome.trim().length > 50) {
        res.status(400).json({
            status: false,
            message: "Nome do perfil deve ter no máximo 50 caracteres"
        });
        return;
    }
    if (descricao !== undefined && typeof descricao !== "string") {
        res.status(400).json({
            status: false,
            message: "Descrição deve ser um texto"
        });
        return;
    }
    if (!limite_usuarios_logados) {
        res.status(400).json({
            status: false,
            message: "Limite de usuários logados é obrigatório"
        });
        return;
    }
    if (typeof limite_usuarios_logados !== "number" || limite_usuarios_logados < 1) {
        res.status(400).json({
            status: false,
            message: "Limite de usuários logados deve ser pelo menos 1"
        });
        return;
    }
    if (dias_validade !== undefined) {
        if (typeof dias_validade !== "number" || dias_validade <= 0) {
            res.status(400).json({
                status: false,
                message: "Dias de validade deve ser um número positivo"
            });
            return;
        }
    }
    req.body.nome = nome.trim();
    if (descricao)
        req.body.descricao = descricao.trim();
    next();
}
// ============================================
// VALIDAR ATUALIZAR PERFIL
// ============================================
function validarAtualizarPerfil(req, res, next) {
    const { id, nome, descricao, limite_usuarios_logados, dias_validade, ativo } = req.body;
    if (!id) {
        res.status(400).json({
            status: false,
            message: "ID do perfil é obrigatório"
        });
        return;
    }
    if (typeof id !== "number" || id <= 0) {
        res.status(400).json({
            status: false,
            message: "ID do perfil inválido"
        });
        return;
    }
    if (nome !== undefined) {
        if (typeof nome !== "string" || nome.trim() === "") {
            res.status(400).json({
                status: false,
                message: "Nome do perfil não pode estar vazio"
            });
            return;
        }
        if (nome.trim().length < 3) {
            res.status(400).json({
                status: false,
                message: "Nome do perfil deve ter pelo menos 3 caracteres"
            });
            return;
        }
        if (nome.trim().length > 50) {
            res.status(400).json({
                status: false,
                message: "Nome do perfil deve ter no máximo 50 caracteres"
            });
            return;
        }
        req.body.nome = nome.trim();
    }
    if (descricao !== undefined && typeof descricao !== "string") {
        res.status(400).json({
            status: false,
            message: "Descrição deve ser um texto"
        });
        return;
    }
    if (descricao)
        req.body.descricao = descricao.trim();
    if (limite_usuarios_logados !== undefined) {
        if (typeof limite_usuarios_logados !== "number" || limite_usuarios_logados < 1) {
            res.status(400).json({
                status: false,
                message: "Limite de usuários logados deve ser pelo menos 1"
            });
            return;
        }
    }
    if (dias_validade !== undefined) {
        if (typeof dias_validade !== "number" || dias_validade <= 0) {
            res.status(400).json({
                status: false,
                message: "Dias de validade deve ser um número positivo"
            });
            return;
        }
    }
    if (ativo !== undefined && typeof ativo !== "boolean") {
        res.status(400).json({
            status: false,
            message: "Ativo deve ser true ou false"
        });
        return;
    }
    next();
}
// ============================================
// VALIDAR TOKEN
// ============================================
function validarToken(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1] || req.body.token || req.query.token;
    if (!token) {
        res.status(401).json({
            status: false,
            message: "Token não fornecido"
        });
        return;
    }
    if (typeof token !== "string" || token.trim() === "") {
        res.status(401).json({
            status: false,
            message: "Token inválido"
        });
        return;
    }
    if (token.length < 32) {
        res.status(401).json({
            status: false,
            message: "Token inválido"
        });
        return;
    }
    req.body.token = token.trim();
    next();
}
// ============================================
// VALIDAR ID (para parâmetros de URL)
// ============================================
function validarId(req, res, next) {
    const { id } = req.params;
    const idStr = Array.isArray(id) ? id[0] : id;
    if (!idStr || idStr.trim() === "") {
        res.status(400).json({
            status: false,
            message: "ID é obrigatório"
        });
        return;
    }
    const idNumero = parseInt(idStr, 10);
    if (isNaN(idNumero) || idNumero <= 0) {
        res.status(400).json({
            status: false,
            message: "ID inválido"
        });
        return;
    }
    req.params.id = idNumero.toString();
    next();
}
// ============================================
// VALIDAR EMAIL (PARÂMETRO)
// ============================================
function validarEmailParam(req, res, next) {
    const { email } = req.params;
    const emailStr = Array.isArray(email) ? email[0] : email;
    if (!emailStr || emailStr.trim() === "") {
        res.status(400).json({
            status: false,
            message: "Email é obrigatório"
        });
        return;
    }
    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailValido.test(emailStr)) {
        res.status(400).json({
            status: false,
            message: "Email inválido"
        });
        return;
    }
    req.params.email = emailStr;
    next();
}
// ============================================
// VALIDAR PAGINAÇÃO
// ============================================
function validarPaginacao(req, res, next) {
    const { page = 1, limit = 10 } = req.query;
    const pageStr = Array.isArray(page) ? page[0] : page;
    const limitStr = Array.isArray(limit) ? limit[0] : limit;
    const pageNum = parseInt(pageStr, 10);
    const limitNum = parseInt(limitStr, 10);
    if (isNaN(pageNum) || pageNum < 1) {
        res.status(400).json({
            status: false,
            message: "Página deve ser um número maior que 0"
        });
        return;
    }
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        res.status(400).json({
            status: false,
            message: "Limite deve ser um número entre 1 e 100"
        });
        return;
    }
    req.query.page = pageNum.toString();
    req.query.limit = limitNum.toString();
    next();
}
// ============================================
// EXPORTAR TUDO
// ============================================
exports.default = {
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
//# sourceMappingURL=userValidator.js.map