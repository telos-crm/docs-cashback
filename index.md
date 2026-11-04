---
layout: home

hero:
  name: Cashback API
  text: Cashback e fidelidade direto no caixa do seu ERP
  tagline: Consulte o saldo do cliente, use bônus como desconto na venda e gere o cashback da compra — em tempo real, no caixa.
  actions:
    - theme: brand
      text: Primeiros passos
      link: /guia/primeiros-passos
    - theme: alt
      text: Qual fluxo usar?
      link: /fluxos/
    - theme: alt
      text: Referência da API
      link: /reference

features:
  - title: Fluxo de compra passo a passo
    details: "Da identificação do cliente pelo CPF ao registro da venda, com diagramas da ordem certa das chamadas — inclusive o PIN por SMS."
    link: /fluxos/compra
  - title: Seguro para repetir
    details: "Identifique cada venda pelo internal_order_id do seu ERP: repetir após um timeout não duplica bônus — a API responde 409 e você segue."
    link: /guia/erros
  - title: Campanhas e estornos
    details: "Veja quanto a compra acumula em cada campanha antes de fechar, e cancele a venda com estorno automático quando o cliente desistir."
    link: /fluxos/cancelamento
---
