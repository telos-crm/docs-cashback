# Qual fluxo usar?

Uma integração completa combina o **fluxo de compra** (o principal) com o
**cancelamento** para os pedidos que o cliente desiste e a **consulta de
saldo** para os atendimentos fora do caixa.

| Fluxo | Quando usar | Endpoints principais |
| --- | --- | --- |
| [Fluxo de compra](./compra) | O caixa em si: identificar o cliente, usar (ou não) bônus como desconto, gerar o cashback da compra e registrar a venda | `/user/verify` → `/bonus/available` → `/bonus/submit` → `/sales/total` |
| [Cancelamento de venda](./cancelamento) | Cliente desistiu, devolução total, pedido cancelado no ERP | `/sales/cancel` |
| [Consulta de saldo](./consulta) | Balcão/gerência: quanto o cliente tem acumulado, fora do fluxo de venda | `/bonus/balance` |

## Regras que valem para todos os fluxos

1. **`request_pin` é a lei.** O que define se a venda precisa de PIN é a
   resposta do `/user/verify` — nunca presuma pelo histórico do cliente.
   `true` = resolva o PIN antes de qualquer bônus; `false` = pule o bloco.

2. **`bonus_ids` é "tudo ou nada".** Enviou `bonus_ids` não vazio no
   `/bonus/submit`? O cliente **quer usar** — mande **todos** os IDs recebidos
   no `/bonus/available`. Mande `[]` quando **não** quer usar. Subconjunto é
   bug: a regra de negócio é "usou 1, consumiu tudo" (não há saldo restante).

3. **`crm_discounts` = o valor pago com bônus.** Os `other_discounts` são os
   descontos negociados na hora (condição de pagamento, cupom, frete).
   Promoção de produto **cadastrada** não entra aí: ela vira
   `value_of ≠ value_per` no item.

4. **`/sales/total` nunca é pulado** — mesmo sem bônus. Sem ele a venda não
   existe na Telos e o cancelamento fica órfão.

5. **Identifique cada venda pelo `internal_order_id`** (o número do pedido no
   seu ERP). É por ele que a API reconhece a venda em repetições (409) e
   cancelamentos.

6. **Envie o header `Request-Hash`** recebido no `/user/verify` nas chamadas
   seguintes da mesma venda (hoje opcional, exigido no futuro — ver
   [Primeiros passos](../guia/primeiros-passos)).
