# Lume v0.2 — PWA de refeições familiares

PWA mobile-first para uma família de 5 (2 adultos + crianças de 3, 5 e 11 anos). A experiência abre diretamente na decisão diária: dizer o que existe em casa → receber 3 refeições completas → escolher → avaliar → o Lume aprende.

## V0.2
- Nova interface premium, sóbria e suave, inspirada em aplicações nativas de iPhone.
- Fluxo principal simplificado e hierarquia visual mais limpa.
- 3 sugestões completas para 5 pessoas.
- Proteína + ingredientes disponíveis + tempo + esforço + método.
- Fotografia do frigorífico preparada para visão por IA.
- Favoritas, histórico, planeamento semanal e aprendizagem local.
- Camada `ai-client.js` separada da UI.
- Fallback local automático se a IA estiver desligada ou falhar.
- Gateway Cloudflare Worker incluído em `/worker` para manter a chave de IA fora do browser.

## Ligar IA real

### 1. Publicar o Worker
Na pasta `worker/`, copie `wrangler.toml.example` para `wrangler.toml` e preencha:
- `OPENAI_MODEL`: um modelo atual da sua conta que aceite texto + imagem.
- `ALLOWED_ORIGIN`: origem exata do GitHub Pages.

Depois adicione a chave como secret, nunca no GitHub:

```bash
npx wrangler secret put OPENAI_API_KEY
npx wrangler deploy
```

### 2. Ligar a PWA ao Worker
Em `config.js`, colocar apenas o URL público do Worker:

```js
AI_ENDPOINT: 'https://lume-ai.<conta>.workers.dev'
```

Não colocar qualquer API key em `config.js` ou `app.js`.

### 3. Contrato
A PWA envia ao endpoint `/v1/suggest`:
- proteína principal;
- ingredientes escritos;
- fotografia opcional em Data URL;
- tempo disponível;
- esforço e método;
- perfil familiar;
- histórico recente e favoritas.

O Worker devolve `{ "recipes": [...] }` com exatamente 3 receitas. O cliente valida a estrutura antes de a usar.

## Publicar no GitHub Pages
Colocar na raiz do repositório:
- `index.html`
- `styles.css`
- `app.js`
- `ai-client.js`
- `config.js`
- `manifest.webmanifest`
- `sw.js`
- `icons/`

A pasta `worker/` não é necessária no GitHub Pages; pode ficar no mesmo repositório ou ser publicada separadamente no Cloudflare Workers.

## Segurança
- A chave da IA fica exclusivamente como secret do Worker.
- A PWA funciona sem IA, usando fallback local.
- O Worker restringe CORS à origem configurada.
- A fotografia só é enviada quando o utilizador a adiciona e pede sugestões.
