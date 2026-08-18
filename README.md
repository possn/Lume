# Lume v0.7.0 — Cook & Learn

PWA mobile-first para decidir refeições familiares para 5 pessoas.

## Ciclo principal

**O que tenho → 3 ideias → Ver receita → Vou fazer esta → Cozinhar → Feedback → Aprendizagem**

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
