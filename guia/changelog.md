# Changelog

Mudanças **visíveis ao integrador**: campos, comportamento e erros. A versão
é a mesma da [Referência da API](../reference). Mudanças que exigem ajuste
no ERP são anunciadas aqui com antecedência.

## 1.3.0 — novembro/2026

- `POST /bonus/available`: novo campo `bonus_usage_mode` com a regra de uso
  do saldo da marca no canal da loja: `TOTAL_WITH_LOSS`, `PARTIAL` ou
  `ALL_OR_NOTHING`. Trate valores desconhecidos como `TOTAL_WITH_LOSS`. Ver
  [Regras de uso do saldo](./uso-do-saldo).
- `POST /bonus/submit` com `PARTIAL`: só o valor usado sai do saldo; o resto
  fica para a próxima compra, com a mesma validade.
- `POST /bonus/submit` com `ALL_OR_NOTHING`: só créditos inteiros que cabem
  no limite. `crm_discounts` que não fecha com eles recebe
  `422 USO_PARCIAL_NAO_PERMITIDO` (com `valor_permitido`). No
  `/bonus/available`, `bonus_ids` traz só esses créditos.
- `POST /bonus/submit`: o limite de uso passa a ser calculado sobre a mesma
  base do `/bonus/available` (sem os itens em promoção, quando a marca não
  permite cashback neles). Antes o submit usava o subtotal inteiro. Se nenhum
  item aceita cashback e `crm_discounts > 0`, a resposta é
  `422 BONUS_NOT_ALLOWED_ON_PROMOTION`.
- `POST /bonus/submit`: a marca pode recusar `crm_discounts` acima do
  permitido em vez de limitar: `422 USO_ACIMA_DO_PERMITIDO` (com
  `valor_maximo`). O padrão continua sendo limitar.
- `POST /sales/adjust` com `RETURN`: o cashback usado nos itens devolvidos
  volta ao saldo do cliente em `bonus_refunded`. Avisos novos
  `CRM_DISCOUNTS_ABOVE_USED` e `REFUND_DISCARDED`. Ver
  [Troca e devolução parcial](../fluxos/troca-devolucao).
- `POST /sales/cancel` e `/sales/adjust`: cashback usado que volta para um
  crédito já vencido segue a regra da marca: continua vencido (padrão) ou
  volta como crédito novo, com prazo mínimo de uso, e entra no
  `bonus_refunded`.

## 1.2.0 — novembro/2026

- Novo `POST /sales/adjust`: ajusta o cashback de um pedido já enviado
  depois de uma troca (`EXCHANGE`) ou devolução parcial (`RETURN`). O ERP
  envia o estado final do pedido (`items` e `totals`, no formato do
  `/bonus/submit`) e um `adjustment_id` único; repetir o mesmo ajuste devolve
  a mesma resposta. Ver [Troca e devolução parcial](../fluxos/troca-devolucao).
- `POST /sales/cancel`: `bonus_refunded` é o cashback usado no pedido que
  voltou ao saldo do cliente. Passa a ser `0` quando nada volta: o crédito
  usado era de outro pedido já cancelado, ou venceu.

## 1.1.0 — novembro/2026

- `POST /bonus/submit`: quem decide o uso de bônus é `totals.crm_discounts`.
  Com valor maior que zero, a Telos debita os bônus disponíveis do cliente
  mesmo com `bonus_ids` vazio ou ausente (antes, `bonus_ids: []` significava
  "não usar bônus"). Para não usar bônus, envie `crm_discounts = 0`. Descontos
  que não são cashback vão em `totals.other_discounts`.

## 1.0.0

- Endpoints em operação: `/auth`, `/refresh`, `/user/verify`, `/pin/send`,
  `/pin/validate`, `/pin/resend`, `/bonus/balance`, `/bonus/available`,
  `/bonus/campaigns`, `/bonus/submit`, `/sales/total`, `/sales/cancel`.

## Planejado

Sujeito a alteração; cada item entra aqui com data antes de valer.

- Validação do header `Request-Hash` nas rotas de escrita, com anúncio prévio
  e ativação gradual por credencial.
