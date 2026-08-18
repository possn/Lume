# Lume v0.15.0 — Friendly Kitchen

Visual refresh: linguagem mais jovial e descontraída, mantendo o posicionamento premium. Remove referências visíveis a “jantar para cinco” para tornar a interface mais universal para diferentes famílias. O motor de receitas e o Research Composer da v0.14.0 mantêm-se.

## Destaques
- Hero mais leve e conversacional
- Paleta mais quente: coral, sálvia e apontamentos amarelos
- Chips e controlos com pequenos ícones culinários
- Cards mais suaves e arredondados
- Mantém 5 sugestões por ronda: 3 portuguesas + 1 mediterrânica + 1 familiar
- Mantém imagens reais das receitas sempre que disponíveis
- Mantém pesquisa, adaptação e composição sem IA obrigatória

# Lume v0.14.0 — Identity


## v0.14.0 — Identity
- Novo splash de abertura curto (≈1,5 s), sem som.
- Usa o símbolo interno do Lume: bloco escuro com o pequeno sorriso coral.
- O sorriso desenha-se de forma subtil e o nome Lume aparece logo depois.
- O splash desaparece sozinho e nunca bloqueia a navegação.
- Respeita `prefers-reduced-motion`.
- Ícones da PWA (180/192/512) passam a usar a mesma identidade visual do sorriso, eliminando a inconsistência entre o ícone instalado e a marca dentro da app.

### Ficheiros a substituir a partir da v0.12.0
- `index.html`
- `styles.css`
- `app.js`
- `config.js`
- `sw.js`
- `manifest.webmanifest`
- `icons/icon-180.png`
- `icons/icon-192.png`
- `icons/icon-512.png`
- `README.md`

PWA mobile-first para decidir refeições familiares para 5 pessoas.

## Ciclo principal

**O que tenho → 5 ideias → Ver receita → Vou fazer esta → Cozinhar → Feedback → Aprendizagem**

### Alterações v0.7.0
- Mantém o motor retrieval-first com 3 sugestões e “Outras ideias”.
- “Vou fazer esta” passa a guardar a refeição escolhida como jantar atual.
- A refeição atual reaparece no ecrã Hoje até ser avaliada.
- O detalhe da receita foi transformado num modo de cozinha mais legível: fotografia, ingredientes, passos numerados, substituições e fonte.
- Ingredientes indicados pelo utilizador são assinalados quando coincidem com a receita.
- Feedback familiar: Adorámos / Gostámos / Assim-assim / Não repetir.
- Feedback adicional simples para crianças e adultos.
- O histórico guarda contexto, avaliação e aceitação por crianças/adultos.
- Receitas “Adorámos” entram automaticamente em Favoritas.
- Receitas já feitas mostram memória temporal (“há X semanas”) e o ranking local usa o feedback anterior.
- Estado e aprendizagem persistem em localStorage.

## Ficheiros a substituir no GitHub

Para atualizar a partir da v0.6.1, substituir apenas:

- `app.js`
- `styles.css`
- `config.js`
- `sw.js`
- `README.md`

Os restantes ficheiros da v0.6.1 podem permanecer inalterados.

## Deploy

GitHub Pages funciona sem build. Depois de substituir os ficheiros, fazer commit/push. A alteração do nome da cache no `sw.js` força a PWA a abandonar os assets antigos após a atualização do service worker.

## v0.8.0
- Ranking aprendido a partir do histórico real da família.
- Feedback das crianças tem peso superior no ranking familiar.
- Receitas marcadas como favoritas influenciam receitas semelhantes futuras.
- Penalização reforçada para pratos rejeitados e para repetições recentes.
- Fotografias passam a ser um sinal explícito de ranking; quando a API não fornece imagem, o Lume tenta recuperar `og:image` da receita original.
- Mantém diversidade entre fontes e garante 3 propostas.
- Imagens quebradas são removidas sem estragar o cartão.


## v0.9.0 — Culinary Mix
- Cada ronda passa de 3 para **5 propostas**.
- Composição-alvo: **3 Portuguesas + 1 Mediterrânica + 1 Familiar**.
- O retrieval faz pesquisas específicas para os três perfis culinários e tenta preencher a composição com receitas reais.
- Mantém prioridade a fotografias reais da fonte original; receitas com imagem têm vantagem no ranking.
- “Outras ideias” gera uma nova ronda de 5, penalizando títulos já mostrados.
- Se uma categoria não tiver resultados reais suficientes, o Lume preenche os lugares em falta sem reduzir o total abaixo de 5.

### Ficheiros a substituir a partir da v0.8.0
- `app.js`
- `retrieval-client.js`
- `config.js`
- `sw.js`
- `README.md`



## v0.11.0 — Use What You Have

- Os ingredientes indicados em casa passam a ser um sinal principal do ranking.
- A pesquisa combina a proteína com 3–4 ingredientes disponíveis antes de alargar a procura.
- Reconhece plurais e alguns sinónimos comuns para melhorar a correspondência.
- Receitas que aproveitam 60% ou mais do que foi indicado recebem destaque visual.
- Os cartões mostram `usa X/Y do que tens`.
- O detalhe mostra explicitamente o aproveitamento dos ingredientes introduzidos.
- Os acompanhamentos compostos pelo Lume dão prioridade reforçada a ingredientes já disponíveis.

## v0.10.0 — Complete Meal Composer
- As 5 propostas passam a ser tratadas como **refeições completas**, não apenas receitas principais.
- O Lume deteta se a receita original já inclui hidrato e legumes; quando faltam, compõe apenas os acompanhamentos necessários.
- Os acompanhamentos privilegiam ingredientes indicados como disponíveis em casa.
- Há rotação de acompanhamentos entre as cinco ideias para evitar repetir sempre arroz/batata/legumes.
- A composição considera o tempo e o método escolhido (por exemplo, batata assada ganha vantagem quando o forno já está a ser usado).
- No detalhe, a receita original e a sugestão de acompanhamento ficam claramente separadas para não atribuir à fonte passos que foram compostos pelo Lume.
- Quantidades dos acompanhamentos são dimensionadas para a família de 5.

### Ficheiros a substituir a partir da v0.9.0
- `app.js`
- `styles.css`
- `config.js`
- `sw.js`
- `README.md`


## v0.12.0 — Smart Adaptation
- Quando uma boa receita pede um ingrediente que não foi indicado como disponível, o Lume procura primeiro um substituto culinariamente compatível entre os ingredientes que o utilizador disse ter em casa.
- As trocas são conservadoras e organizadas por famílias culinárias (legumes semelhantes, hidratos, cremosos, queijos, ácidos, etc.).
- A receita original nunca é alterada silenciosamente: o detalhe mostra uma secção **Adaptada ao que tens · Lume** e mantém abaixo a **Receita original** da fonte.
- A versão adaptada apresenta trocas explícitas, ingredientes adaptados e passos adaptados.
- Receitas adaptáveis recebem um pequeno benefício no ranking e um selo visual, sem ultrapassar os sinais principais de ingredientes, tempo, método e preferência familiar.
- Se não existir uma substituição suficientemente segura entre os ingredientes indicados, o Lume não inventa uma troca.

### Ficheiros a substituir a partir da v0.11.0
- `app.js`
- `styles.css`
- `config.js`
- `sw.js`
- `README.md`


## v0.14.0 — Research Composer

- O motor continua retrieval-first e sem necessidade de IA.
- Mantém a regra 3 receitas portuguesas + 1 mediterrânica + 1 alternativa familiar.
- Se a web não devolver cinco receitas suficientemente distintas, os lugares em falta são compostos deterministicamente a partir das receitas reais recuperadas e dos ingredientes indicados pelo utilizador.
- As criações são identificadas como “Criação Lume” e nunca atribuídas falsamente a uma fonte.
- O detalhe mostra as receitas reais que serviram de inspiração quando existe composição.
- Cozinhas fora do perfil português/mediterrânico continuam excluídas do motor principal.
