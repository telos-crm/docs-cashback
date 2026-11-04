<script setup lang="ts">
// Referência interativa (Scalar) dentro do layout do VitePress: mesmo cabeçalho, busca e
// tema dos guias. Lê o openapi.json sincronizado das annotations da API Cashback.
import { withBase, useData } from 'vitepress';
import { computed, defineAsyncComponent, h } from 'vue';

const { isDark } = useData();

// Estado de carregamento: o bundle do Scalar é grande (~3,5 MB) e sem isso a
// página fica em branco enquanto o chunk baixa e é interpretado.
const CarregandoReferencia = () =>
  h('div', { class: 'reference-loading' }, [
    h('div', { class: 'reference-loading__spinner' }),
    h('p', 'Carregando a referência da API…'),
  ]);

// Carregado só nesta página (o Scalar é grande) e só no navegador.
const ApiReference = defineAsyncComponent({
  loader: async () => {
    await import('@scalar/api-reference/style.css');
    return (await import('@scalar/api-reference')).ApiReference;
  },
  loadingComponent: CarregandoReferencia,
  delay: 100,
});

const configuration = computed(() => ({
  url: withBase('/openapi.json'),
  layout: 'modern' as const,
  localization: { locale: 'pt' },
  defaultHttpClient: { targetKey: 'shell' as const, clientKey: 'curl' },
  // O tema segue o seletor do VitePress, no cabeçalho.
  forceDarkModeState: isDark.value ? ('dark' as const) : ('light' as const),
  hideDarkModeToggle: true,
  withDefaultFonts: false,
  showDeveloperTools: 'never' as const,
  agent: { disabled: true },
  mcp: { disabled: true },
  telemetry: false,
}));
</script>

<template>
  <ClientOnly>
    <!--
      vp-raw: o roteador do VitePress ignora os links daqui. Sem isso, ele intercepta as âncoras
      do Scalar (#tag/...), que não existem como títulos, e a navegação para de funcionar.
    -->
    <div class="api-reference vp-raw">
      <ApiReference :key="isDark ? 'dark' : 'light'" :configuration="configuration" />
    </div>
  </ClientOnly>
</template>

<style>
/* A barra lateral e os títulos fixos do Scalar ficam abaixo do cabeçalho do VitePress. */
.api-reference {
  --scalar-custom-header-height: var(--vp-nav-height);
  --scalar-font: var(--vp-font-family-base);
  --scalar-font-code: var(--vp-font-family-mono);
  --scalar-color-accent: var(--vp-c-brand-1);
}

/*
 * O CSS base do VitePress fixa tamanho e peso de h1–h6 (ex.: h1 { font-size: 16px }) e vence o
 * reset do Scalar, que tem especificidade zero (:where(.scalar-app) * { font-size: inherit }).
 * No Scalar, os títulos herdam o tamanho do bloco de seção; aqui o reset é reaplicado.
 */
.api-reference .scalar-app :is(h1, h2, h3, h4, h5, h6) {
  font-size: inherit;
  font-weight: inherit;
  line-height: inherit;
  letter-spacing: inherit;
}
</style>
