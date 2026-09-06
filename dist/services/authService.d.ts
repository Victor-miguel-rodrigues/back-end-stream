import { LoginResponse, PodeLogarResponse, SessaoComUsuario } from "../types";
export declare class AuthService {
    login(email: string, senha: string, ip: string, userAgent: string): Promise<LoginResponse["dados"]>;
    logout(token: string): Promise<{
        mensagem: string;
    }>;
    validarToken(token: string): Promise<SessaoComUsuario | null>;
    podeLogar(email: string): Promise<PodeLogarResponse>;
    statusPerfis(): Promise<any[]>;
    criarUsuario(nome_usuario: string, email: string, senha: string): Promise<{
        id: number;
        nome_usuario: string;
        email: string;
    }>;
}
declare const _default: AuthService;
export default _default;
//# sourceMappingURL=authService.d.ts.map