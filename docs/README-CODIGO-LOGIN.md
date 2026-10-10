# Código de login: documentação do código gerado

Este documento explica **somente o código que foi gerado** para o recurso de *código de login* e as pequenas alterações que vieram junto. Para o restante do projeto, veja o [README principal](../README.md).

## Sumário

1. [O que foi pedido e como foi atendido](#1-o-que-foi-pedido-e-como-foi-atendido)
2. [Arquivos criados e alterados](#2-arquivos-criados-e-alterados)
3. [Banco de dados](#3-banco-de-dados)
4. [Service: `codigoLoginService.ts`](#4-service-codigologinservicets)
5. [Controller e rotas](#5-controller-e-rotas)
6. [Integração com o logout](#6-integração-com-o-logout)
7. [Fluxo completo](#7-fluxo-completo)
8. [Como ajustar](#8-como-ajustar)
9. [Como testar](#9-como-testar)
10. [Segurança e limitações](#10-segurança-e-limitações)
11. [Outras alterações geradas](#11-outras-alterações-geradas)

---

## 1. O que foi pedido e como foi atendido

| Requisito | Como foi implementado |
|---|---|
| Um usuário tem **um único código** | `UNIQUE (usuario_id)` na tabela. Cada usuário tem no máximo uma linha, reaproveitada quando o código vence ou é desativado |
| Um código pertence a **um único usuário** | `UNIQUE (codigo)` na tabela. Em caso de colisão, o service sorteia outro código e tenta de novo |
| Guardado no banco **com o status ativo** | Coluna `ativo` (boolean) na tabela `codigos_login` |
| Dura **12 horas** | Coluna `data_expiracao = NOW() + 12 horas`. O código só vale se `ativo = TRUE` e `data_expiracao > NOW()` |
| Código com **6 caracteres** | Gerado com `crypto.randomInt`, usando letras e números sem os confusos (`0`, `O`, `1`, `I`, `L`) |
| No **logout**, chamar `disableOfCodLogin` | O logout chama a função dentro da mesma transação que encerra a sessão |
| Receber o **token do usuário** por segurança | Todas as rotas usam o middleware `validarToken`. O `usuario_id` vem do token, nunca do corpo da requisição |

---

## 2. Arquivos criados e alterados

| Arquivo | Tipo | O que contém |
|---|---|---|
| `sql/codigos_login.sql` | novo | Cria a tabela, o índice e ativa o RLS |
| `src/services/codigoLoginService.ts` | novo | Regras de negócio: gerar, consultar e desativar |
| `src/controller/codigoLoginController.ts` | novo | Três handlers HTTP que usam o service |
| `src/routing/routing.ts` | alterado | 3 rotas novas e 1 `import` |
| `src/controller/UserCadastroController.ts` | alterado | O `logout` passou a chamar `disableOfCodLogin` |

---

## 3. Banco de dados

Arquivo: `sql/codigos_login.sql` (rode depois do `sql/schema.sql`).

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `SERIAL` | Chave primária |
| `usuario_id` | `INTEGER`, `UNIQUE`, FK para `usuarios(id)` | Dono do código. `ON DELETE CASCADE` apaga o código junto com o usuário |
| `codigo` | `VARCHAR(6)`, `UNIQUE` | O código em si |
| `ativo` | `BOOLEAN` | `TRUE` enquanto o código pode ser usado |
| `data_criacao` | `TIMESTAMPTZ` | Quando foi gerado |
| `data_expiracao` | `TIMESTAMPTZ` | Fim da validade (criação + 12 h) |

O arquivo também ativa o **RLS** na tabela. Com isso, a chave `anon` do Supabase não lê os códigos pela Data API, e só o backend (conexão direta pelo `DATABASE_URL`) consegue acessá-los.

---

## 4. Service: `codigoLoginService.ts`

Constantes no topo do arquivo:

```ts
const DURACAO_HORAS = 12;
const TAMANHO_CODIGO = 6;
const MAX_TENTATIVAS = 5;
```

### `gerarCodigoLogin(usuarioId)`

Retorna `{ criado: boolean, dados }`.

Faz **um único `INSERT ... ON CONFLICT (usuario_id) DO UPDATE`**, que resolve tudo de forma atômica:

- **Usuário sem código:** a linha é criada, e o resultado é `criado: true`.
- **Usuário com código vencido ou desativado:** a linha existente é sobrescrita com um código novo (a cláusula `WHERE ativo = FALSE OR data_expiracao <= NOW()` libera a troca), e o resultado é `criado: true`.
- **Usuário com código ainda válido:** o `WHERE` impede a troca, o `INSERT` não retorna linha e o service faz um `SELECT` para devolver o código atual, com `criado: false`.

Por ser uma única instrução SQL, dois cliques simultâneos não criam dois códigos.

Se o código sorteado já pertencer a outro usuário, o Postgres devolve o erro `23505` (violação de unicidade). O service captura esse erro, sorteia outro código e tenta de novo, até 5 vezes.

### `buscarCodigoLoginAtivo(usuarioId)`

Retorna o código do usuário **somente se estiver válido** (`ativo = TRUE` e `data_expiracao > NOW()`). Caso contrário, retorna `null`.

### `disableOfCodLogin(usuarioId, client?)`

Executa `UPDATE codigos_login SET ativo = FALSE WHERE usuario_id = $1 AND ativo = TRUE`. Retorna `true` se algum código foi desativado e `false` se não havia código ativo.

O parâmetro opcional `client` permite rodar a função **dentro de uma transação existente**, que é como o logout a usa.

---

## 5. Controller e rotas

Arquivo: `src/controller/codigoLoginController.ts`. Cada handler lê o usuário de `req.usuario` (preenchido pelo `validarToken`), chama o service e responde. Gerar e desativar também gravam em `logs_sistema` (a falha do log nunca derruba a resposta).

| Método | Rota | Handler | Resposta |
|---|---|---|---|
| `POST` | `/codigo-login` | `gerar` | `201` se criou, `200` se já havia um código válido |
| `GET` | `/codigo-login` | `consultar` | `200` com o código, ou `404` se não houver código ativo |
| `POST` | `/codigo-login/desativar` | `desativar` | `200` sempre que a chamada é válida |

Todas exigem `Authorization: Bearer <token>`. Sem token válido, o `validarToken` responde `401`.

**Exemplo de resposta (`POST /codigo-login`, `201`):**

```json
{
  "status": true,
  "message": "Codigo gerado com sucesso",
  "dados": {
    "codigo": "K7M2QX",
    "ativo": true,
    "criado_em": "2026-10-07T22:00:00.000Z",
    "expira_em": "2026-10-08T10:00:00.000Z"
  }
}
```

---

## 6. Integração com o logout

No `logout` de `UserCadastroController.ts`, foi acrescentada **uma linha** dentro da transação existente:

```ts
await client.query('UPDATE sessoes SET ativo = FALSE WHERE token = $1', [token]);
await disableOfCodLogin(sessao.usuario_id, client);   // linha adicionada
await client.query(`UPDATE historico_login ...`);
```

Como as três operações estão na mesma transação, **ou todas acontecem ou nenhuma**: não existe o caso de a sessão cair e o código continuar ativo por falha no meio do caminho.

> **Importante:** como o logout agora usa a tabela `codigos_login`, ela precisa existir antes do deploy. Sem ela, o logout retorna `500`.

---

## 7. Fluxo completo

![Ciclo de vida da sessão e do código de login](img/sessao.png)

1. O usuário faz login e recebe o token.
2. Com o token, chama `POST /codigo-login` e recebe o código (válido por 12 h).
3. Chamar de novo devolve o mesmo código, sem gerar outro.
4. O código deixa de valer quando: o usuário faz **logout**, chama `/codigo-login/desativar` ou passam as **12 horas**.
5. Depois disso, `POST /codigo-login` gera um código novo na mesma linha do usuário.

---

## 8. Como ajustar

| Quero mudar | Onde |
|---|---|
| Duração (12 h) | `DURACAO_HORAS` em `codigoLoginService.ts` |
| Tamanho do código | `TAMANHO_CODIGO` em `codigoLoginService.ts` **e** `VARCHAR(6)` em `sql/codigos_login.sql` |
| Caracteres usados | `ALFABETO` em `codigoLoginService.ts` |
| Tentativas em caso de colisão | `MAX_TENTATIVAS` em `codigoLoginService.ts` |

Se a tabela já existir com o tamanho antigo, altere a coluna: `ALTER TABLE codigos_login ALTER COLUMN codigo TYPE VARCHAR(8);`.

---

## 9. Como testar

Pré-requisitos: tabelas criadas, usuário com pagamento em dia e perfil Premium, servidor rodando (`npm run dev`). Troque `<token>` pelo token retornado no login.

```bash
# 1. Gerar o código  -> 201 com um código de 6 caracteres
curl -X POST http://localhost:3000/codigo-login -H "Authorization: Bearer <token>"

# 2. Gerar de novo   -> 200 com o MESMO código
curl -X POST http://localhost:3000/codigo-login -H "Authorization: Bearer <token>"

# 3. Consultar       -> 200 com o código e expira_em
curl http://localhost:3000/codigo-login -H "Authorization: Bearer <token>"

# 4. Desativar       -> 200 "Codigo desativado com sucesso"
curl -X POST http://localhost:3000/codigo-login/desativar -H "Authorization: Bearer <token>"

# 5. Consultar       -> 404 (nenhum código ativo)
curl http://localhost:3000/codigo-login -H "Authorization: Bearer <token>"

# 6. Sem token       -> 401
curl -X POST http://localhost:3000/codigo-login
```

**Teste do logout:** gere um código, faça `POST /logout` e confira no banco:

```sql
SELECT usuario_id, codigo, ativo FROM codigos_login;   -- ativo deve ser false
```

**Teste da unicidade:** `SELECT usuario_id, count(*) FROM codigos_login GROUP BY usuario_id HAVING count(*) > 1;` deve retornar zero linhas.

---

## 10. Segurança e limitações

**O que já protege:**

- Todas as rotas exigem token de usuário, e o dono do código é sempre o dono do token.
- O código é gerado com `crypto.randomInt` (aleatoriedade criptográfica).
- Unicidade garantida pelo banco, não só pelo código.
- RLS bloqueia a leitura pela Data API do Supabase.

**Limitações e cuidados:**

- **Não existe rota para *usar* o código.** Hoje a API gera, consulta e desativa. A rota que recebe o código e autentica quem o usa ainda precisa ser criada.
- **Quando criar essa rota, limite as tentativas com rigor.** Um código de 6 caracteres tem cerca de **887 milhões** de combinações, e isso só é seguro com um limite baixo de tentativas por IP.
- O código é guardado **em texto puro** (necessário para comparar na hora do uso). Por isso o RLS é importante.
- O logout desativa o código, mas a **inatividade** (cron) só o faz se o `sql/cron_limpeza.sql` estiver agendado. Sem ele, o código vale até vencer as 12 h.

---

## 11. Outras alterações geradas

Alterações pequenas feitas na mesma conversa, fora do recurso do código de login:

| Alteração | Arquivo | Motivo |
|---|---|---|
| Leitura do token voltou de `??` para `\|\|` | `UserCadastroController.ts` | O refactor trocou o operador e mudava o comportamento com header `Bearer` vazio |
| Mensagens com acento restauradas (`Sessão inválida ou expirada`, `Token inválido ou expirado`) | `UserCadastroController.ts`, `auth.ts` | O front pode comparar o texto da mensagem |
| `OPTIONS` (preflight) e `/heartbeat` fora do limite global | `rateLimit.ts` | Evitava `429` no heartbeat, que impedia o front de detectar o logout |
| Helper `ipKeyGenerator` no limite de login | `rateLimit.ts` | Corrige o aviso de IPv6 e impede burlar as 5 tentativas trocando de endereço |
| Servidor local com `app.listen` | `src/server.ts`, `package.json` | O projeto não tinha `listen`, e `npm run dev` não subia o servidor |
| Variáveis de ambiente atualizadas | `.env.exemple` | Agora lista só o que o código realmente lê |
| Schema, seed e job de limpeza | `sql/schema.sql`, `sql/seed.sql`, `sql/cron_limpeza.sql` | Permitem montar o banco do zero |
| Gerador de hash | `scripts/gerar-hash.js` | Cria a senha do primeiro administrador |
