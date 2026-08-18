# Lume v0.5.0 — Direct Portuguese Sources

PWA mobile-first para sugestões de refeições familiares.

## O que mudou

- O caminho principal deixou de precisar de Cloudflare Worker, Brave Search ou TheMealDB.
- `providers.js` contém um registo de fontes culinárias portuguesas.
- O browser tenta pesquisar diretamente cada fonte através de endpoints públicos (WordPress REST ou feeds Blogger).
- Cada fonte é testada em runtime. Se bloquear CORS, tiver o endpoint desligado ou mudar de tecnologia, é ignorada sem bloquear o Lume.
- O ranking privilegia explicitamente cozinha portuguesa e rejeita títulos claramente fora do perfil culinário definido.
- Se menos de três fontes diretas responderem com resultados úteis, o Lume mantém o fallback local português/mediterrânico existente.

## Fontes candidatas iniciais

Teleculinária, Cozinha à la Carte, Tuga na Cozinha, Cinco Quartos de Laranja, Petiscos, Receitas e Menus, Clara de Sousa, SaborIntenso e blogs culinários portugueses em Blogger.

Isto é um registry, não uma lista fechada. Acrescentar uma fonte compatível é apenas adicionar uma entrada em `providers.js`.

## Nota técnica importante

Uma página pública não implica permissão de CORS. Por isso a compatibilidade é deliberadamente testada no próprio dispositivo em cada execução. Não há chaves API no frontend.

## GitHub Pages

Publicar todos os ficheiros na raiz do repositório. `index.html` deve estar na raiz. O service worker usa o cache `lume-v0.5.0-direct-portuguese-sources`.

## Ficheiros alterados nesta versão

- `index.html`
- `config.js`
- `providers.js` (novo)
- `retrieval-client.js`
- `app.js`
- `sw.js`
- `README.md`

O diretório `worker/` fica apenas como legado/opção futura e não é necessário para o modo direto da v0.5.0.
