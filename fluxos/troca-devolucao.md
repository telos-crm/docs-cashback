# Troca e devolução parcial

O cliente trocou um produto ou devolveu parte do pedido: o cashback que a
compra gerou precisa acompanhar o novo valor. Para isso existe o ajuste do
pedido.

**Endpoint principal:** `POST /sales/adjust`, identificado pelo
`internal_order_id` do pedido **original** — o mesmo enviado no
`/bonus/submit`.

::: info Devolução de todos os itens não é ajuste
Se o cliente devolveu o pedido inteiro, use o
[Cancelamento de venda](./cancelamento).
:::

## Como funciona

O ERP **não** envia "o que mudou". Envia **como o pedido ficou** depois da
troca ou devolução: todos os itens e os totais, no mesmo formato do
`/bonus/submit`. A Telos recalcula o cashback desse estado com as regras do
pedido original (mesma campanha e mesmo percentual, mesmo que a campanha já
tenha terminado) e aplica a diferença:

- **Cashback maior** (troca por um produto mais caro): a Telos gera um
  **crédito complementar** com a diferença, com prazos contados a partir do
  dia do ajuste. Não sai SMS de confirmação; o valor aparece no saldo do
  cliente.
- **Cashback menor** (troca por um produto mais barato ou devolução parcial):
  a Telos reduz o que ainda está disponível nos créditos do pedido. O que o
  cliente **já usou ou já venceu** não é cobrado dele: a loja assume, e o
  valor volta em `bonus_absorbed`.
- **Mesmo valor:** nada muda no saldo; o pedido fica registrado com os itens
  novos.

Na **devolução** (`RETURN`), além de recalcular o cashback gerado, a Telos
devolve ao saldo do cliente o cashback que ele **usou** nos itens devolvidos
(ver [Cashback usado na devolução](#cashback-usado-na-devolucao)).

O valor mínimo de acúmulo da loja é reavaliado: se uma devolução deixa o
pedido abaixo do mínimo, o cashback dele vai a zero. A marca pode desligar
essa reavaliação.

::: info Regras que a marca escolhe
Algumas regras da troca e da devolução são configuradas por marca na Telos. O
ERP não muda nada no envio; a resposta já reflete a escolha:

- redução maior que o disponível nos créditos do pedido: a loja assume
  (padrão, em `bonus_absorbed`) ou a diferença sai dos outros créditos do
  cliente (entra no `bonus_delta`);
- validade do crédito complementar: contada do dia do ajuste (padrão) ou a
  mesma do crédito original;
- cashback usado na devolução: volta ao saldo (padrão) ou não volta.
:::

Por que o estado final: o ERP já sabe montar esse JSON (é o mesmo do
`/bonus/submit`), duas trocas no mesmo pedido não acumulam erro e reenviar é
seguro.

```mermaid
sequenceDiagram
  autonumber
  participant ERP as ERP / PDV
  participant API as Cashback API

  Note over ERP: troca ou devolução de parte do pedido
  ERP->>API: POST /sales/adjust (internal_order_id + adjustment_id + type + items + totals)
  alt ajuste aplicado
    API-->>ERP: 200 · bonus_before · bonus_after · bonus_delta · bonus_absorbed
  else mesmo adjustment_id, mesmo conteúdo
    API-->>ERP: 200 · a mesma resposta da primeira vez
  else pedido não existe na Telos (404)
    API-->>ERP: 404 · ORDER_NOT_FOUND
  else pedido cancelado ou adjustment_id reusado com outro conteúdo (409)
    API-->>ERP: 409 · ORDER_CANCELLED / ADJUSTMENT_CONFLICT
  end
```

## Passo a passo

Exemplo: pedido `PED-9002` com blusa de R$ 100,00 e calça de R$ 200,00,
R$ 60,00 pagos com cashback, R$ 240,00 pagos e R$ 24,00 de cashback gerado
(campanha de 10%). O cliente troca a blusa por um vestido de R$ 150,00 e paga
a diferença de R$ 50,00.

::: code-group

```bash [curl]
curl -s -X POST "$BASE_URL/sales/adjust" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "internal_order_id": "PED-9002",
    "adjustment_id": "TROCA-7781",
    "type": "EXCHANGE",
    "reason": "Troca de tamanho",
    "items": [
      {"sku":"VESTIDO-M","value_of":150.00,"value_per":150.00,"quantity":1},
      {"sku":"CALCA-40","value_of":200.00,"value_per":200.00,"quantity":1}
    ],
    "totals": {"subtotal":350.00,"fee":0,"taxes":0,
               "crm_discounts":60.00,"other_discounts":0,"total":290.00}
  }'
```

```php [Laravel]
$response = Http::withToken($token)->post("$baseUrl/sales/adjust", [
    'internal_order_id' => 'PED-9002',
    'adjustment_id' => 'TROCA-7781',   // número da troca no ERP
    'type' => 'EXCHANGE',
    'reason' => 'Troca de tamanho',
    'items' => [
        ['sku' => 'VESTIDO-M', 'value_of' => 150.00, 'value_per' => 150.00, 'quantity' => 1],
        ['sku' => 'CALCA-40', 'value_of' => 200.00, 'value_per' => 200.00, 'quantity' => 1],
    ],
    'totals' => ['subtotal' => 350.00, 'fee' => 0, 'taxes' => 0,
                 'crm_discounts' => 60.00, 'other_discounts' => 0, 'total' => 290.00],
]);
```

:::

```json
{
    "status": true,
    "message": "Order adjusted",
    "data": {
        "internal_order_id": "PED-9002",
        "adjustment_id": "TROCA-7781",
        "type": "EXCHANGE",
        "bonus_before": 24.00,
        "bonus_after": 29.00,
        "bonus_delta": 5.00,
        "bonus_absorbed": 0.00,
        "bonus_refunded": 0.00,
        "generated_bonus_id": "6m6AU/VuGMZablszkpr8/w==",
        "adjusted_at": "2026-11-13T14:30:00-03:00",
        "warnings": []
    }
}
```

### Campos da requisição

| Campo | Obrigatório | Regra |
| --- | --- | --- |
| `internal_order_id` | sim | Pedido **original**, o mesmo do `/bonus/submit` |
| `adjustment_id` | sim | Identificador único da troca ou devolução no ERP (o número da venda de troca serve). Até 100 caracteres |
| `type` | sim | `EXCHANGE` (troca) ou `RETURN` (devolução sem troca) |
| `reason` | não | Texto livre, até 500 caracteres |
| `items` | sim | **Todos** os itens do pedido depois do ajuste, no formato do `/bonus/submit` |
| `totals.total` | sim | Valor efetivamente pago pelo pedido depois do ajuste. Na troca a maior, soma a diferença paga; na troca a menor e na devolução, desconta o que voltou ao cliente |
| `totals.crm_discounts` | sim | Cashback usado que continua no pedido. Na troca, o mesmo do pedido original |
| demais `totals` | não | Mesmo significado do `/bonus/submit` |

### Campos da resposta

| Campo | Significado |
| --- | --- |
| `bonus_before` | Cashback ativo do pedido antes do ajuste |
| `bonus_after` | Cashback que o pedido tem depois do ajuste |
| `bonus_delta` | Quanto mudou nos créditos do cliente: positivo = crédito complementar; negativo = redução |
| `bonus_absorbed` | Quanto a loja assume no pedido: a redução que não pôde ser aplicada porque o cashback já foi usado ou venceu. **Acumulado do pedido**, somando os ajustes anteriores |
| `bonus_refunded` | Cashback usado que voltou ao saldo do cliente **neste ajuste**. Só na devolução (`RETURN`); `0` na troca |
| `generated_bonus_id` | Crédito complementar, quando houver |
| `warnings` | Avisos com `code` e `detail` que não impedem o ajuste. A lista pode ganhar códigos novos: ignore os que não conhece |

Sempre vale `bonus_after = bonus_before + bonus_delta − bonus_absorbed`.

### Avisos

| `code` | Quando |
| --- | --- |
| `ORDER_WITHOUT_BONUS` | O pedido original não gerou cashback (ex.: abaixo do mínimo). O ajuste não gera cashback para ele |
| `PAYLOAD_INCONSISTENT` | `totals` não fecham com `items`, como no `/bonus/submit` |
| `CRM_DISCOUNTS_CHANGED` | Troca com `crm_discounts` diferente do original. O valor enviado é ignorado |
| `CRM_DISCOUNTS_ABOVE_USED` | Devolução com `crm_discounts` maior que o cashback usado no pedido. Nada volta ao saldo |
| `REFUND_DISCARDED` | Parte do cashback usado não voltou ao saldo porque o crédito de origem foi cancelado ou venceu. O `detail` diz quanto |
| `BONUS_RULE_NOT_FOUND` | A campanha do pedido original não existe mais. O cashback não muda |
| `MODE_NOT_SUPPORTED` | O programa da loja é de pontos. O ajuste não altera nada |

## Exemplos

Mesmo pedido de partida: blusa R$ 100,00 + calça R$ 200,00, R$ 60,00 pagos
com cashback, R$ 240,00 pagos, R$ 24,00 gerados (10%, mínimo de acúmulo de
R$ 100,00).

| Caso | `items` | `totals.total` | Resultado |
| --- | --- | --- | --- |
| Troca pelo mesmo valor | blusa nova + calça | 240 | `bonus_delta` 0 |
| Troca a maior | vestido 150 + calça | 290 | `bonus_delta` +5,00, crédito complementar |
| Troca a menor (calça por 120) | blusa + calça 120 | 160 | `bonus_delta` −8,00 |
| Troca a menor, com os R$ 24,00 já usados | blusa + calça 120 | 160 | `bonus_delta` 0, `bonus_absorbed` 8,00 |
| Devolução da calça (`RETURN`) | blusa | 80 (`crm_discounts` 20) | 80 abaixo do mínimo → `bonus_delta` −24,00; `bonus_refunded` 40,00 |

## Cashback usado na devolução

Na devolução (`RETURN`), `totals.crm_discounts` é o cashback usado que
**continua** no pedido: a parte dos itens que o cliente ficou. A diferença
para o que o pedido usou volta ao saldo do cliente e vem em
`bonus_refunded`.

No exemplo acima, o pedido usou R$ 60,00 de cashback em R$ 300,00 de
produtos. O cliente devolve a calça (R$ 200,00) e fica com a blusa: o ERP
envia `crm_discounts` 20 (a parte da blusa) e R$ 40,00 voltam ao saldo.

```json
{
    "status": true,
    "message": "Order adjusted",
    "data": {
        "internal_order_id": "PED-9002",
        "adjustment_id": "DEV-3310",
        "type": "RETURN",
        "bonus_before": 24.00,
        "bonus_after": 0.00,
        "bonus_delta": -24.00,
        "bonus_absorbed": 0.00,
        "bonus_refunded": 40.00,
        "generated_bonus_id": null,
        "adjusted_at": "2026-11-13T15:10:00-03:00",
        "warnings": []
    }
}
```

- O cashback devolvido volta para os créditos de onde saiu, com a validade
  deles.
- Duas devoluções do mesmo pedido acumulam: em cada uma, envie o
  `crm_discounts` que continua no pedido depois dela.
- Crédito de origem **cancelado**: o valor não volta, e o aviso
  `REFUND_DISCARDED` diz quanto.
- Crédito de origem **vencido**: depende da marca. Por padrão continua
  vencido (o valor não volta, com `REFUND_DISCARDED`); a marca pode preferir
  devolver como crédito novo, com um prazo mínimo de uso, e aí o valor entra
  no `bonus_refunded`.
- Marcas no modo `TOTAL_WITH_LOSS` podem devolver também a parte perdida na
  compra, na mesma proporção. Nesse caso `bonus_refunded` vem maior que a
  diferença do `crm_discounts`.
- `crm_discounts` maior que o usado no pedido: nada volta, com o aviso
  `CRM_DISCOUNTS_ABOVE_USED`.

## Repetição e erros

O mesmo `adjustment_id` com o mesmo conteúdo devolve **200 com a mesma
resposta** e não altera nada: depois de um timeout, reenvie igual. É
diferente do `/bonus/submit` e do `/sales/cancel`, que devolvem 409 na
repetição.

| Resposta | `error.code` | O que fazer |
| --- | --- | --- |
| `200` | — | Pronto. Guarde a resposta junto da troca no ERP |
| `400` | `INVALID_DATA` | Corrigir o payload |
| `404` | `ORDER_NOT_FOUND` | O pedido não tem registro na Telos (não gerou nem usou cashback e não passou pelo `/sales/total`). Não há o que ajustar |
| `409` | `ORDER_CANCELLED` | O pedido foi cancelado. Não há o que ajustar |
| `409` | `ADJUSTMENT_CONFLICT` | O `adjustment_id` já foi usado com outro conteúdo. **Não é sucesso**: cada troca precisa do próprio `adjustment_id` |

## Checklist

- [ ] Ajuste disparado pelo fluxo de troca e de devolução parcial do ERP
- [ ] `internal_order_id` do pedido **original**
- [ ] `adjustment_id` único por troca ou devolução, estável nos reenvios
- [ ] `items` e `totals` com o pedido **inteiro** depois do ajuste
- [ ] `crm_discounts` da troca igual ao do pedido original
- [ ] `crm_discounts` da devolução com o cashback que **continua** no pedido (o resto volta ao saldo)
- [ ] `bonus_refunded` exibido ao operador na devolução
- [ ] Devolução de todos os itens vai para o `/sales/cancel`
- [ ] `ADJUSTMENT_CONFLICT` tratado como erro, não como sucesso
