# Changelog

Mudanças **visíveis ao integrador**: campos, comportamento e erros. A versão
é a mesma da [Referência da API](../reference). Mudanças que exigem ajuste
no ERP são anunciadas aqui com antecedência.

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
- `/bonus/available` informando a regra de uso de saldo da marca (uso total
  ou uso parcial com saldo remanescente).
- `/sales/adjust` em devolução (`RETURN`) devolvendo ao saldo o cashback
  usado nos itens devolvidos (`bonus_refunded`).
