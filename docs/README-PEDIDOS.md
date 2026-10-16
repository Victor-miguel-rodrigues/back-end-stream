# Pedidos de conta ("Criar conta") — plano VIP R$ 25/mês

## 1) Criar a tabela (uma vez)
Supabase → SQL Editor → rode o arquivo `sql/pedidos.sql`.

## 2) Rotas
| Método | Rota | Quem | Descrição |
|---|---|---|---|
| POST | `/pedidos` | público (3 por hora por IP) | Recebe `{ usuario, email, origem }` do site/app. Valida (lista de caracteres permitidos), grava com consulta parametrizada. Responde igual se o e-mail já tem pedido pendente. |
| GET | `/admin/pedidos?status=pendente&pagina=1&limite=50` | admin (Bearer token) | Lista os pedidos para o dashboard. |
| PUT | `/admin/pedidos/:id/status` | admin | Corpo `{ "status": "pagamento_enviado" }`. Status: `pendente`, `pagamento_enviado`, `pago`, `login_enviado`, `cancelado`. |
| DELETE | `/admin/pedidos/:id` | admin | Apaga um pedido. |

Fluxo manual: pedido chega como `pendente` → você envia o pagamento pelo Gmail anônimo → muda para
`pagamento_enviado` → quando pagar, cria o login e envia → `login_enviado`.

## 3) O que foi corrigido neste projeto
- Havia **marcadores de conflito de merge** (`<<<<<<<`) em `routing.ts`, `codigoLoginController.ts`,
  `rateLimit.ts` e `codigoLoginService.ts` (o código-fonte não compilava). Resolvi mantendo a versão
  "release", a mesma que já estava compilada na pasta `dist`. `codigoAppLimiter` foi restaurado em `rateLimit.ts`.
- `dist/` foi recompilado (`npx tsc`).

## 4) Segurança (SQL injection)
Todas as consultas novas usam parâmetros (`$1, $2...`) e os campos passam por lista de caracteres permitidos.
Revise estes pontos antigos, que montam SQL com texto (hoje só com partes fixas, mas exigem cuidado ao editar):
`adminService.ts` (`whereClause`, `whereSql`, `campos.join` no UPDATE de administradores).
