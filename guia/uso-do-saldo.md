# Regras de uso do saldo

Cada marca escolhe **como o saldo do cliente é usado** numa compra. A regra
vale por canal (loja física ou e-commerce) e chega ao PDV no campo
`bonus_usage_mode` do `/bonus/available`. O ERP não configura nada: lê o campo
e adapta a tela e o `totals.crm_discounts` do `/bonus/submit`.

| `bonus_usage_mode` | Regra | O que sobra do saldo |
| --- | --- | --- |
| `TOTAL_WITH_LOSS` | Usar o cashback consome **todos** os créditos usáveis. O que passa do limite da compra é perdido | Nada |
| `PARTIAL` | Usa até o limite da compra | O resto continua no saldo, com a mesma validade |
| `ALL_OR_NOTHING` | Um crédito só é usado se couber **inteiro** no limite da compra | Os créditos que não couberam continuam no saldo |

::: warning Valor desconhecido = `TOTAL_WITH_LOSS`
A lista pode ganhar modos novos. Trate qualquer valor que o seu ERP não
conhece como `TOTAL_WITH_LOSS`, a regra mais restritiva para o cliente.
:::

## Limite da compra

O limite é o `bonus_available` do `/bonus/available`: o quanto **esta
compra** pode pagar com cashback. Ele sai da configuração da marca (percentual
máximo da compra, valor mínimo para usar) e dos itens: quando a marca não
permite cashback em produtos em promoção (`value_of ≠ value_per`), a base é só
a soma dos itens com preço cheio.

O `/bonus/submit` usa **a mesma base** do `/bonus/available`. Se nenhum item
aceita cashback e o ERP envia `crm_discounts > 0`, a resposta é
`422 BONUS_NOT_ALLOWED_ON_PROMOTION`: refaça com `crm_discounts = 0`.

## Exemplo

Cliente com dois créditos, R$ 20,00 (mais antigo) e R$ 25,00, saldo de
R$ 45,00. Compra de R$ 100,00 numa marca com limite de 30%: a compra pode
usar até R$ 30,00.

| Modo | `bonus_available` | `crm_discounts` | Créditos depois da compra |
| --- | --- | --- | --- |
| `TOTAL_WITH_LOSS` | 30,00 | 30,00 | Os dois consumidos; R$ 15,00 perdidos |
| `PARTIAL` | 30,00 | 30,00 (ou menos) | O de R$ 20,00 consumido; R$ 15,00 continuam no de R$ 25,00 |
| `ALL_OR_NOTHING` | 20,00 | 20,00 | O de R$ 20,00 consumido; o de R$ 25,00 intacto (não cabia nos R$ 10,00 restantes) |

A pergunta pronta para o operador (`bonus_accumulate_question`) já acompanha o
modo: avisa a perda no `TOTAL_WITH_LOSS` e diz que o restante continua no
saldo nos outros dois.

## Como cada modo usa o `crm_discounts`

### `TOTAL_WITH_LOSS`

Qualquer `crm_discounts > 0` consome todos os créditos usáveis do cliente. O
débito é limitado ao `bonus_available`; o resto do saldo é perdido. Mande o
valor que o cliente efetivamente abateu na compra.

### `PARTIAL`

Só o `crm_discounts` sai do saldo. O cliente pode usar **menos** que o
`bonus_available` (ex.: abater R$ 10,00 de R$ 30,00 possíveis), e o resto
continua disponível para a próxima compra.

### `ALL_OR_NOTHING`

O `bonus_available` e os `bonus_ids` já trazem **só os créditos inteiros que
cabem** no limite. Envie em `crm_discounts` exatamente a soma deles (o próprio
`bonus_available`):

| `crm_discounts` | Resposta |
| --- | --- |
| Igual à soma dos créditos que cabem | Uso aplicado |
| Não fecha com créditos inteiros | `422 USO_PARCIAL_NAO_PERMITIDO`, com `valor_permitido` |
| Maior que zero, sem nenhum crédito que caiba | `422 USO_ACIMA_DO_PERMITIDO`, com `valor_maximo` |

Dependendo da configuração da marca, a regra vale **por crédito** (cada
crédito que couber) ou para o **saldo inteiro** (todos os créditos, se a soma
couber; senão nenhum). O ERP não precisa saber qual: o `/bonus/available` já
responde com o resultado.

## `crm_discounts` acima do permitido

Por padrão, um `crm_discounts` maior que o `bonus_available` é **limitado**
ao permitido. A marca pode preferir recusar: aí a resposta é
`422 USO_ACIMA_DO_PERMITIDO`, com `valor_informado` e `valor_maximo`, e nada é
gravado. Refaça com um valor até o `valor_maximo` ou com `crm_discounts = 0`.

```json
{
    "status": false,
    "message": "Não foi possível utilizar o bônus",
    "error": {
        "code": "USO_ACIMA_DO_PERMITIDO",
        "detail": "Uso de bônus acima do permitido nesta compra: R$ 20,00",
        "valor_informado": 36.00,
        "valor_maximo": 20.00
    }
}
```

## Ordem de consumo

Quando a compra usa só parte do saldo, a marca escolhe quais créditos saem
primeiro: os **mais antigos** (padrão) ou os que **vencem primeiro**. No
`ALL_OR_NOTHING` por crédito, a mesma ordem decide quais créditos inteiros
entram.

## Sobra pequena no crédito

Um uso parcial pode deixar centavos num crédito (arredondamento). A marca pode
manter essa sobra no saldo (padrão) ou zerá-la, até um limite em reais. Não
muda nada no contrato: o `crm_discounts` continua sendo o valor que o cliente
abateu, e um eventual estorno devolve a sobra zerada junto.
