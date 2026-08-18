# Lume v0.4.0 — Web Retrieval

PWA familiar para escolher refeições. A fonte principal deixa de ser uma base fechada: o Lume pesquisa receitas reais na web.

## Arquitetura

GitHub Pages (PWA) → Cloudflare Worker → Brave Search API → páginas de receitas → Schema.org `Recipe` JSON-LD.

O Worker procura a web, abre resultados de receitas e recolhe dados estruturados como título, imagem, tempo e ingredientes. A preparação integral continua na fonte original; o Lume mostra um botão para a abrir. Isto evita transformar a app num republicador de textos de terceiros.

Se o Worker não estiver configurado ou não devolver 3 resultados, o Lume usa TheMealDB apenas como fallback e, em último caso, o catálogo local.

## 1. Publicar a PWA no GitHub Pages

Coloque na raiz do repositório:
- index.html
- styles.css
- app.js
- retrieval-client.js
- ai-client.js
- config.js
- manifest.webmanifest
- sw.js
- icons/
- .github/workflows/pages.yml (se já existir da v0.2.1, mantenha-o)
- .nojekyll (se já existir, mantenha-o)

## 2. Criar o Worker de pesquisa

Na pasta `worker/`:
1. copie `wrangler.toml.example` para `wrangler.toml`;
2. altere `ALLOWED_ORIGIN` para a origem do GitHub Pages, por exemplo `https://utilizador.github.io`;
3. crie uma chave na Brave Search API;
4. guarde-a como secret: `npx wrangler secret put BRAVE_SEARCH_API_KEY`;
5. publique: `npx wrangler deploy`.

## 3. Ligar a PWA ao Worker

Em `config.js` coloque apenas o URL público do Worker em `RETRIEVAL_ENDPOINT`, por exemplo:

```js
RETRIEVAL_ENDPOINT: 'https://lume-search.<conta>.workers.dev',
```

Nunca coloque `BRAVE_SEARCH_API_KEY` no GitHub.

## Como funciona “Outras ideias”

Cada novo pedido muda `variationSeed` e envia `avoidRecipes`. O Worker altera a pesquisa, elimina títulos já mostrados e volta a ranquear os resultados por tempo, método, ingredientes disponíveis e perfil familiar.

## Ficheiros alterados nesta versão

- retrieval-client.js
- config.js
- app.js
- sw.js
- worker/worker.js
- worker/wrangler.toml.example
- README.md
