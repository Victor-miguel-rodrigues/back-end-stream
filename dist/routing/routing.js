"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const UserCadastroController_1 = require("../controller/UserCadastroController");
const userValidator_1 = require("../validators/userValidator");
const userValidator_2 = require("../validators/userValidator");
const router = (0, express_1.Router)();
const controller = new UserCadastroController_1.userCadastroController();
router.get('/', controller.listar);
router.post('/cadastrar', userValidator_1.validarUsuario, controller.receber);
router.post('/', userValidator_2.validarLogin, controller.logar);
exports.default = router;
//# sourceMappingURL=routing.js.map