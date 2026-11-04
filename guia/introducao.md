# Introdução e conceitos

A **Cashback API** é a interface que permite a um ERP ou PDV usar o programa de
fidelidade/cashback da Telos direto no momento da venda: consultar o saldo do
cliente, usar bônus como desconto, gerar o bônus da compra e cancelar tudo
quando a venda é estornada.

Tudo isso acontece **em tempo real, no caixa** — a integração é síncrona: o PDV
pergunta, a API responde, a venda fecha. Todos os endpoints são `POST`, com
corpo e resposta em JSON.

## Como as peças se relacionam

| Conceito | O que é |
| --- | --- |
| **Loja (credencial)** | A unidade de integração. Cada loja tem a própria `client_id` + `client_secret`; o token JWT emitido já carrega a loja/empresa — não há seleção de loja nas chamadas. |
| **Bônus** | Crédito em reais que o cliente acumulou e pode usar como desconto. Identificado por `bonus_id` opaco. |
| **Campanha** | Regra que define quanto a venda gera de bônus (ex.: "Fidelidade 3%"). Tem `campaign_id`, vigência e valor. |
| **PIN** | Código de 4 dígitos enviado por SMS ao cliente para autorizar o uso do bônus. |
| **PIN master** | PIN operacional usado quando o cliente não tem celular/SMS — informado no `/bonus/submit` pelo campo `pin_master`. |
| **`user_id`** | Identificador **criptografado e opaco** do cliente. O ERP nunca interpreta: recebeu, guardou, ecoou. |
| **`internal_order_id`** | O número do pedido **no seu ERP**. É a chave de correlação entre a venda sua e a nossa — use em cancelamentos e repetições. |
| **Request-Hash** | Header de sessão devolvido pelo `/user/verify` (ver [Primeiros passos](./primeiros-passos)). |

::: info Uma loja enxerga só os clientes dela
O isolamento é por loja/empresa (multi-tenant): o saldo e os bônus de um CPF
consultados pela loja A não misturam com os da loja B.
:::

## Ambientes

| | Homologação | Produção |
| --- | --- | --- |
| Uso | Desenvolver e testar a integração | Operação real no caixa |
| Base URL | `https://giftback.hom.teloscrm.com.br/api/v1` | `https://giftback.teloscrm.com.br/api/v1` |

Desenvolva e teste **sempre primeiro na homologação** — mesmos endpoints e
comportamentos, com SMS de teste.

## Limites

| O quê | Limite |
| --- | --- |
| Requisições por credencial | 600/min |
| Clique repetido no `/pin/send` (mesmo telefone + PIN ativo) | Responde 200 com o mesmo PIN, sem novo SMS |
| `/pin/send` e `/pin/resend` (novo disparo de SMS) | 1 a cada 60s |
| Access token | 1 hora |
| Refresh token | 7 dias |

Próximo passo: [Primeiros passos](./primeiros-passos).
