# Primeiros passos

## Credenciais

A Telos fornece, para cada loja que vai operar:

| Campo | Onde usar | Exemplo |
| --- | --- | --- |
| `client_id` | Campo `username` do `/auth` | CNPJ da loja **sem máscara** → `12345678000190` |
| `client_secret` | Campo `password` do `/auth` | API Key da loja → `as214d1237155b6b31f1690c1b59132132` |

::: warning Guarde o segredo em cofre
O `client_secret` assina também o Request-Hash (ver abaixo). Quem tiver ele
opera a loja: guarde em cofre de segredos ou variáveis de ambiente, nunca no
código.
:::

## Autenticação

```bash
curl -X POST https://giftback.teloscrm.com.br/api/v1/auth \
  -H "Content-Type: application/json" \
  -d '{"username": "12345678000190", "password": "SUA_API_KEY"}'
```

```json
{
    "access_token": "eyJ0eXAiOiJKV1Qi...",
    "access_token_expires_in": 3600,
    "refresh_token": "eyJ0eXAiOiJKV1Qi...",
    "refresh_token_expires_in": 604800
}
```

::: info O /auth não usa o envelope
O `/auth` é o único endpoint que responde **sem** o envelope
`{"status": ..., "message": ..., "data": ...}` — o corpo é o próprio payload
de tokens. Erros seguem o envelope padrão (ver [Erros](./erros)).
:::

Todas as demais rotas exigem o header `Authorization: Bearer {access_token}`.

## Ciclo de vida do token

- **Access token**: válido por **1 hora**.
- **Refresh token**: válido por **7 dias** e é **single-use** — cada `/refresh`
  emite um novo par e invalida o refresh anterior.

Estratégia recomendada:

1. Autentique no início da sessão do operador.
2. Renove preventivamente quando faltarem ~60s para o access token expirar.
3. Recebeu **401** em qualquer rota? Tente `/refresh` **uma vez** e repita a
   chamada. Falhou o refresh? Refaça o `/auth`.

```bash
curl -X POST https://giftback.teloscrm.com.br/api/v1/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "eyJ0eXAiOiJKV1Qi..."}'
```

::: warning Não agende reautenticação compartilhada
Refresh token é single-use: dois processos disputando o mesmo refresh podem
invalidar o token um do outro. Renove sob demanda, na hora do 401 ou da
expiração próxima.
:::

## Request-Hash (header de sessão)

O `/user/verify` devolve, além do corpo, o **header de resposta**
`Request-Hash` — um SHA-256 derivado do CPF + `client_secret` da loja. Ele
**identifica a sessão de venda daquele cliente naquela loja**.

- **Estado atual:** o servidor hoje **não recusa** requisições sem o header —
  o envio é opcional e o valor não é validado.
- **Recomendação:** desde já, guarde o header do `/user/verify` e envie-o nas
  chamadas seguintes da mesma venda. O envio passa a ser exigido em uma futura
  versão e quem já envia não precisa mudar nada.

## Convenções da API

- **Tudo é `POST`**, corpo e resposta em JSON, `Content-Type: application/json`.
- **Envelope padrão:** `{"status": true, "message": "Success", "data": { ... }}`;
  em erro, `"status": false` com `"message"` (ver [Erros](./erros)).
- **IDs são opacos e criptografados** (`user_id`, `bonus_id`, `order_id`,
  `sale_id`): recebeu, guardou, ecoou — nunca monte ou valide formato.
- **CPF e telefone:** apenas números, sem máscara (`"12345678901"`,
  `"11999998888"`).
- **Valores monetários:** números com ponto decimal, sem separador de milhar
  (`106.20`).

## Checklist

- [ ] Credenciais da loja em mãos (homologação e produção separadas)
- [ ] `/auth` testado na homologação
- [ ] Onde o ERP guarda `access_token`, `refresh_token` e `Request-Hash` da venda em curso definido
- [ ] Momento de cada chamada no telão do caixa alinhado com o time do PDV (ver [Fluxo de compra](../fluxos/compra))
