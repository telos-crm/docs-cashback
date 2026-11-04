# Erros e novas tentativas

## Envelope de erro padrão

Toda resposta de erro segue o mesmo formato (o `/auth` no sucesso é a única
exceção — corpo sem envelope):

```json
{
    "status": false,
    "message": "CPF inválido",
    "data": null
}
```

Alguns erros trazem um objeto `error` com código máquina e detalhes —
principalmente o `/bonus/submit`:

```json
{
    "status": false,
    "message": "Não foi possível utilizar o bônus",
    "error": {
        "code": "BONUS_VALUE_MINIMUM_NOT_MET",
        "detail": "Valor mínimo de compra para usar bônus: R$ 50,00",
        "valor_compra": 40.00,
        "valor_minimo": 50.00
    }
}
```

::: tip Código é contrato, mensagem é texto
Para o PDV, decida pelo **HTTP status + `error.code`** — a `message` é texto
humano sujeito a ajuste; o código é contrato.
:::

## Tabela global

| HTTP | Quando acontece | O que o ERP deve fazer |
| --- | --- | --- |
| **400** | Payload inválido (`Dados inválidos`, `CPF inválido`, campo obrigatório faltando) | **Não repetir**: é bug do integrador. Corrigir payload/cadastro |
| **401** | Token ausente, expirado ou inválido (`Invalid Token`) | Rodar `/refresh`; se falhar, refazer `/auth` e repetir a chamada **uma vez** |
| **404** | Recurso não existe (`Usuário não encontrado`, venda inexistente) | Verificar o `user_id`/`internal_order_id` usado — chamada fora de ordem ou sessão trocada. **Não dar retry cego** |
| **409** | Conflito de estado (`Transação já processada`, venda já cancelada) | **Tratar como sucesso**: a operação já foi feita antes. Seguir o fluxo |
| **422** | Regra de negócio impede a operação (ex.: mínimo de compra para usar bônus) | Ação de negócio: refazer o submit sem bônus (`bonus_ids: []`) e seguir a venda |
| **429** | Rate limit (600/min por credencial) ou janela de 60s do PIN/resend | Backoff exponencial (rate limit) ou aguardar a janela (PIN). Nunca loop apertado |
| **500** | Erro interno | Retry com backoff (2 tentativas). Persistindo em rota de escrita, resolver com o suporte antes de reenviar |

## O clique repetido no /pin/send não é erro

Um `/pin/send` repetido em menos de 60s (mesmo telefone, PIN ainda ativo)
responde **200** com o **mesmo PIN** no `text_pin` — **nenhum SMS novo é
disparado**. Se o SMS anterior **falhou**, a janela já foi liberada e o novo
envio dispara de verdade.

O **429** (`Aguarde 60 segundos antes de solicitar um novo PIN.`) só ocorre
quando o telefone **mudou** dentro da janela ou o PIN **já foi validado**.

## Política de retry

| Situação | Retry? | Como |
| --- | --- | --- |
| 429 rate limit | Sim | Backoff exponencial (1s, 2s, 4s…), máx. 3 |
| 429 PIN/resend (janela de 60s) | Sim, após a janela | Desabilitar o botão 60s na UI |
| 500 | Sim (máx. 2) | Backoff. Em `/sales/total` o retry é seguro — a chave é o `internal_order_id` |
| 401 | Sim (1x) | `/refresh` → repetir chamada; falhou → `/auth` |
| 400/404 | **Não** | Erro de integração/payload — corrigir antes |
| 409 | Não é erro | Seguir fluxo como sucesso |
| Timeout de rede em escrita | **Cuidado** | Reenviar `/bonus/submit` e tratar `409` como sucesso (a chave é o `internal_order_id`) |

::: warning Nunca reenvie o submit às cegas
Depois de um timeout no `/bonus/submit`, reenvie com o **mesmo**
`internal_order_id`. Se a primeira chamada tinha processado, a resposta é
`409 Transação já processada` — trate como sucesso e siga para o
`/sales/total`. Chave diferente cria venda duplicada.
:::

## Erros por rota

### `/auth`

| HTTP | Mensagem | Causa |
| --- | --- | --- |
| 400 | `Dados inválidos` | Faltou `username` ou `password` |
| 401 | `Invalid credentials` | CNPJ/API Key errados ou credencial desativada |

### `/user/verify`

| HTTP | Mensagem | Causa |
| --- | --- | --- |
| 400 | `CPF inválido` | CPF mal formado, ≠ 11 dígitos ou dígito verificador falha |
| 401 | `Invalid Token` | Access token expirado |

### `/pin/send` · `/pin/validate` · `/pin/resend`

| HTTP | Mensagem | Causa |
| --- | --- | --- |
| 400 | `Dados inválidos` | `customer`/`gross_value`/`items` ausentes; `pin` ≠ 4 dígitos; `user_id` ausente |
| 404 | `Usuário não encontrado` | `user_id` inválido/outra sessão |
| 429 | `Aguarde 60 segundos antes de solicitar um novo PIN.` / `...antes de reenviar o PIN.` | Janela de 60s (ver acima quando cada um ocorre) |

### `/bonus/available` · `/bonus/campaigns` · `/bonus/balance`

| HTTP | Mensagem | Causa |
| --- | --- | --- |
| 400 | `Dados inválidos: …` | `items`, `value` ou `totals.total` ausentes |
| 404 | `Usuário não encontrado` / `Cliente não encontrado` | `user_id`/`cpf` não resolve |

### `/bonus/submit`

| HTTP | `error.code` / mensagem | Causa e ação |
| --- | --- | --- |
| 400 | `Dados inválidos: …` | Payload (itens, totals, `internal_order_id`) |
| 404 | `Usuário não encontrado` | `user_id` não resolve |
| 409 | `Transação já processada` | Mesmo pedido processado antes → **tratar como sucesso** |
| 422 | `BONUS_VALUE_MINIMUM_NOT_MET` | Compra abaixo do mínimo para usar bônus → refazer com `bonus_ids: []` |

### `/sales/total`

| HTTP | Mensagem | Causa |
| --- | --- | --- |
| 400 | `Dados inválidos: …` | `internal_order_id`, `customer` ou `totals` |
| 500 | `Erro interno…` | Retry com backoff |

### `/sales/cancel`

| HTTP | Mensagem | Causa |
| --- | --- | --- |
| 400 | `internal_order_id é obrigatório` | Payload |
| 404 | (mensagem da exceção) | Venda não existe na Telos → gap de sincronização; reportar ao suporte |
| 409 | (mensagem da exceção) | Venda **já cancelada** → tratar como OK (idempotente para o usuário) |
