import { defineConfig } from 'vitepress';

// Documentação pública da API Cashback (modelo baseado no docs do Telos Link).
//
// Mermaid NÃO usa o plugin withMermaid: ele importa o mermaid inteiro de forma
// estática e faz TODA página pré-carregar ~30 chunks de diagramas (modulepreload).
// A renderização sob demanda vive em .vitepress/theme/index.ts — os blocos
// ```mermaid viram <pre><code class="language-mermaid"> e o tema carrega o
// mermaid só quando a página tem diagrama.
//
// BASE configurável: no GitHub Pages o site vive em /docs-cashback/ (default).
// No corte para o domínio próprio (ex.: docs-cashback.telosdigital.app.br),
// setar DOCS_BASE=/ no workflow e a raiz volta a ser /.
const BASE = process.env.DOCS_BASE ?? '/docs-cashback/';

export default defineConfig({
  base: BASE,
  lang: 'pt-BR',
  title: 'Cashback API',
  description: 'Guia, fluxos e referência da API de cashback e fidelidade da Telos para ERPs e PDVs.',
  // GitHub Pages não faz rewrite de /caminho → /caminho.html. Quando servirmos
  // por Worker/nginx (como o telos-link), vale religar o cleanUrls.
  cleanUrls: false,
  lastUpdated: false,
  head: [
    ['meta', { name: 'theme-color', content: '#1a1a2e' }],
    ['link', { rel: 'icon', href: 'https://teloscrm.com.br/favicon.ico' }],
  ],

  themeConfig: {
    nav: [
      { text: 'Guia', link: '/guia/introducao', activeMatch: '/guia/' },
      { text: 'Fluxos', link: '/fluxos/', activeMatch: '/fluxos/' },
      { text: 'Referência da API', link: '/reference', activeMatch: '/reference' },
    ],

    sidebar: [
      {
        text: 'Guia',
        items: [
          { text: 'Introdução e conceitos', link: '/guia/introducao' },
          { text: 'Primeiros passos', link: '/guia/primeiros-passos' },
          { text: 'Erros e novas tentativas', link: '/guia/erros' },
        ],
      },
      {
        text: 'Fluxos',
        items: [
          { text: 'Qual fluxo usar?', link: '/fluxos/' },
          { text: 'Fluxo de compra', link: '/fluxos/compra' },
          { text: 'Cancelamento de venda', link: '/fluxos/cancelamento' },
          { text: 'Consulta de saldo', link: '/fluxos/consulta' },
        ],
      },
      {
        text: 'Referência',
        items: [{ text: 'Todos os endpoints', link: '/reference' }],
      },
    ],

    outline: { level: [2, 3], label: 'Nesta página' },
    docFooter: { prev: 'Anterior', next: 'Próxima' },
    darkModeSwitchLabel: 'Tema',
    lightModeSwitchTitle: 'Tema claro',
    darkModeSwitchTitle: 'Tema escuro',
    sidebarMenuLabel: 'Menu',
    returnToTopLabel: 'Voltar ao topo',
    notFound: {
      title: 'Página não encontrada',
      quote: 'Confira o endereço ou volte para o início da documentação.',
      linkText: 'Ir para o início',
    },
    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: 'Buscar', buttonAriaLabel: 'Buscar' },
          modal: {
            noResultsText: 'Nenhum resultado para',
            resetButtonTitle: 'Limpar busca',
            footer: { selectText: 'abrir', navigateText: 'navegar', closeText: 'fechar' },
          },
        },
      },
    },
  },
});
