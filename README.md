# Cashback API — Documentação pública

Guias, fluxos e referência da API de cashback e fidelidade da Telos, para ERPs e PDVs.

Publicada no GitHub Pages via workflow (`deploy.yml`, build VitePress a cada push na `main`).

## Arquitetura

| Caminho | O quê |
|---|---|
| `index.md`, `guia/`, `fluxos/` | Conteúdo do site (VitePress, markdown) |
| `reference.md` | Página da referência interativa (Scalar) |
| `public/openapi.json` | **A spec da API — sincronizada automaticamente do repo privado `telos-crm` pelo workflow `api-docs.yml` (GitHub App). Não editar manualmente.** |
| `.vitepress/theme/` | Tema custom (marca Telos) + integração Scalar + mermaid sob demanda |

O fonte da spec são as annotations `@OA\*` nos controllers da API (repo `telos-crm`);
o JSON é gerado por CI e publicados aqui pelo sync.

## Desenvolvimento

```bash
npm ci
npm run dev        # http://localhost:3301
npm run build      # .vitepress/dist
```

## Notas de deploy

- `cleanUrls: false`: GitHub Pages não faz rewrite de `/caminho` → `/caminho.html`.
  Ao migrar para servidores com rewrite (Worker/nginx), religar no config.
- `base` do VitePress: default `/docs-cashback/` (servindo sob o github.io da org).
  No corte para o domínio próprio, setar `DOCS_BASE=/` no workflow e mudar o CNAME.
