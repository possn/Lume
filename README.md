# Lume v0.6.0 — Recipe Discovery

A pesquisa de receitas foi reconstruída para deixar de reciclar três modelos com a proteína substituída.

## Motor de descoberta

Fluxo principal: **input → pesquisa multi-query → extração da receita → scoring → deduplicação → diversidade de fontes → rotação**.

- cozinha portuguesa é prioritária; mediterrânica mantém-se como perfil secundário;
- proteína, ingredientes disponíveis, tempo e método entram no ranking;
- páginas agregadoras ("10 receitas…", "especial receitas…", listas e coleções) são rejeitadas;
- só uma página com ingredientes e preparação suficientes é aceite como receita real;
- receitas recentes são guardadas em `localStorage` e fortemente penalizadas nas pesquisas seguintes, inclusive depois de fechar/reabrir a PWA;
- títulos quase iguais são deduplicados por similaridade lexical;
- a seleção tenta usar fontes diferentes nos três cartões;
- "Outras ideias" roda a estratégia de pesquisa e evita as sugestões já vistas;
- cada cartão mostra fotografia quando a fonte a disponibiliza e indica quantos ingredientes disponíveis coincidem;
- o caminho direto não necessita de Cloudflare Worker nem de chave de pesquisa.

## Fallback

O fallback local só é usado quando nenhuma fonte direta devolve uma receita completa. É explicitamente identificado como "Sugestão local do Lume" e nunca é apresentado como receita recuperada da Internet.

## GitHub Pages — ficheiros a substituir

Nesta versão basta substituir:

- `app.js`
- `retrieval-client.js`
- `providers.js`
- `config.js`
- `sw.js`
- `README.md`

Os restantes ficheiros podem permanecer como estão.
