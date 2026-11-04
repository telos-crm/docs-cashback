import { createHead } from '@unhead/vue/server';
import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import { nextTick, watch } from 'vue';
import { onContentUpdated, useData } from 'vitepress';
import ApiReferencePage from './ApiReferencePage.vue';
import './custom.css';

/*
 * Mermaid sob demanda + tema que acompanha o site:
 *
 * - Em vez do plugin withMermaid (que importa o mermaid inteiro de forma
 *   estática e faz TODA página pré-carregar os ~30 chunks de diagramas), os
 *   blocos ```mermaid chegam aqui como <pre><code> comuns e o mermaid é
 *   importado dinamicamente só quando a página tem diagrama.
 * - O tema do diagrama segue o modo do site: 'neutral' no claro, 'dark' no
 *   noturno (o neutral desenhado pra fundo claro desaparece no escuro).
 *   Na troca de tema os diagramas são re-renderizados — a fonte do diagrama
 *   fica guardada no dataset do container.
 */
let mermaidInicializadoCom = '';
let fila: Promise<void> = Promise.resolve();

async function renderizarDiagramas(): Promise<void> {
  await nextTick();

  // Tema lido do DOM (esta função roda fora do contexto de componente —
  // useData()/inject aqui lançaria "vitepress data not properly injected").
  const tema = document.documentElement.classList.contains('dark') ? 'dark' : 'neutral';

  const mermaid = (await import('mermaid')).default;
  if (mermaidInicializadoCom !== tema) {
    mermaid.initialize({ startOnLoad: false, theme: tema, securityLevel: 'loose' });
    mermaidInicializadoCom = tema;
  }

  type Alvo = { fonte: string; el: HTMLElement };
  const alvos: Alvo[] = [];

  // Blocos ainda não renderizados (fences vindos do markdown).
  document
    .querySelectorAll<HTMLElement>('div.language-mermaid > pre > code')
    .forEach((code) => {
      const pre = code.closest('pre');
      if (pre) alvos.push({ fonte: code.textContent ?? '', el: pre });
    });

  // Diagramas já renderizados — re-render quando o tema mudou.
  document
    .querySelectorAll<HTMLElement>('div.mermaid[data-mermaid-source]')
    .forEach((box) => {
      alvos.push({ fonte: box.dataset.mermaidSource ?? '', el: box });
    });

  if (!alvos.length) return;

  let i = 0;
  for (const { fonte, el } of alvos) {
    try {
      const { svg } = await mermaid.render(`mmd-${Date.now()}-${i++}`, fonte);
      const box = document.createElement('div');
      box.className = 'mermaid';
      box.dataset.mermaidSource = fonte;
      box.innerHTML = svg;
      el.replaceWith(box);
    } catch (erro) {
      console.error('[mermaid] falha ao renderizar diagrama', erro);
    }
  }
}

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    // O Scalar chama useHead() (@unhead/vue) e quebra sem um head registrado. Quem cuida do
    // <head> é o VitePress: a instância "de servidor" aceita as chamadas sem tocar no documento.
    app.use(createHead());
    app.component('ApiReferencePage', ApiReferencePage);
  },
  setup() {
    if (import.meta.env.SSR) return;

    const { isDark } = useData();

    // Dispara DEPOIS que o conteúdo do .md montou (navegação e carga inicial —
    // o chunk da página é assíncrono, um watch de rota dispararia cedo demais).
    onContentUpdated(() => {
      fila = fila.then(renderizarDiagramas);
    });

    // Troca de tema claro/noturno: re-renderiza os diagramas com o outro tema.
    watch(isDark, () => {
      fila = fila.then(renderizarDiagramas);
    });
  },
} satisfies Theme;
