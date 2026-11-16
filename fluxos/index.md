# Qual fluxo usar?

Uma integração completa combina o **fluxo de compra** (o principal) com a
**troca e devolução parcial**, o **cancelamento** para os pedidos que o
cliente desiste e a **consulta de saldo** para os atendimentos fora do caixa.

| Fluxo | Quando usar | Endpoints principais |
| --- | --- | --- |
| [Fluxo de compra](./compra) | O caixa em si: identificar o cliente, usar (ou não) bônus como desconto, gerar o cashback da compra e registrar a venda | `/user/verify` → `/bonus/available` → `/bonus/submit` → `/sales/total` |
| [Troca e devolução parcial](./troca-devolucao) | Cliente trocou um produto ou devolveu parte do pedido | `/sales/adjust` |
| [Cancelamento de venda](./cancelamento) | Cliente desistiu, devolução total, pedido cancelado no ERP | `/sales/cancel` |
| [Consulta de saldo](./consulta) | Balcão/gerência: quanto o cliente tem acumulado, fora do fluxo de venda | `/bonus/balance` |

## Regras que valem para todos os fluxos

1. **`request_pin` é a lei.** O que define se a venda precisa de PIN é a
   resposta do `/user/verify` — nunca presuma pelo histórico do cliente.
   `true` = resolva o PIN antes de qualquer bônus; `false` = pule o bloco.

2. **`crm_discounts` decide o uso do bônus.** É o valor pago com bônus no
   `/bonus/submit`: maior que zero, a Telos debita os bônus do cliente; zero,
   não usa nada. Os `other_discounts` são os descontos negociados na hora
   (condição de pagamento, cupom, frete). Promoção de produto **cadastrada**
   não entra aí: ela vira `value_of ≠ value_per` no item.

3. **`bonus_usage_mode` diz o que acontece com o resto do saldo.** Cada
   marca escolhe: usar consome tudo e o excedente é perdido
   (`TOTAL_WITH_LOSS`), o resto fica no saldo (`PARTIAL`) ou só créditos
   inteiros (`ALL_OR_NOTHING`). Ver [Regras de uso do saldo](../guia/uso-do-saldo).
   Os `bonus_ids` são opcionais; se enviar, mande **todos** os recebidos no
   `/bonus/available`.

4. **`/sales/total` nunca é pulado** — mesmo sem bônus. Sem ele a venda não
   existe na Telos e o cancelamento fica órfão.

5. **Identifique cada venda pelo `internal_order_id`** (o número do pedido no
   seu ERP). É por ele que a API reconhece a venda em repetições (409),
   trocas e cancelamentos.

6. **Envie o header `Request-Hash`** recebido no `/user/verify` nas chamadas
   seguintes da mesma venda (hoje opcional, exigido no futuro — ver
   [Primeiros passos](../guia/primeiros-passos)).
