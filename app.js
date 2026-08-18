const $ = s => document.querySelector(s);
const app = $('#app');

const store = {
  get(k, fallback){ try{return JSON.parse(localStorage.getItem('lume_'+k)) ?? fallback}catch{return fallback} },
  set(k,v){ localStorage.setItem('lume_'+k,JSON.stringify(v)) }
};

const state = {
  route:'today', protein:'', ingredients:'', time:30, effort:'simple', method:'any', photo:null,
  suggestions:[], selected:null, isGenerating:false, suggestionHistory:[], generationRound:0,
  favorites:store.get('favorites',[]), history:store.get('history',[]), plan:store.get('plan',{})
};

const db = [
  {keys:['peru','bifes de peru'],name:'Bifes de peru dourados com limão',style:'Mediterrânico',time:25,effort:'simple',methods:['pan','grill'],side:'Arroz de cenoura e brócolos',ingredients:[['Bifes de peru','700 g'],['Limão','1'],['Alho','2 dentes'],['Azeite','2 c. sopa'],['Arroz','300 g'],['Cenoura','2'],['Brócolos','350 g']],steps:['Temperar os bifes com alho, limão, sal e um fio de azeite.','Dourar numa frigideira bem quente 3–4 minutos de cada lado.','Cozer o arroz com cenoura ralada.','Cozer ou saltear os brócolos até ficarem tenros mas firmes.','Servir os bifes com o molho da frigideira sobre o arroz.'],adapt:['Sem brócolos: usar ervilhas, courgette, feijão-verde ou salada.','Sem limão: usar laranja ou um pouco de vinagre suave.']},
  {keys:['peru','bifes de peru'],name:'Peru no forno com batata e tomate',style:'Português',time:45,effort:'normal',methods:['oven'],side:'Batata assada e salada simples',ingredients:[['Bifes de peru','700 g'],['Batatas','1 kg'],['Tomate','3'],['Cebola','1'],['Alho','3 dentes'],['Azeite','3 c. sopa'],['Orégãos','q.b.']],steps:['Aquecer o forno a 200 ºC.','Cortar batata, tomate e cebola em pedaços e colocar num tabuleiro com azeite.','Temperar o peru com alho, sal e orégãos e pousar sobre os legumes.','Assar 30–35 minutos, virando os bifes a meio.','Servir com uma salada fresca se houver.'],adapt:['Sem tomate: usar pimento, courgette ou apenas cebola e um pouco de caldo.','Batata pode ser substituída por batata-doce.']},
  {keys:['peru','bifes de peru'],name:'Tiras de peru cremosas com massa',style:'Familiar',time:30,effort:'simple',methods:['pan'],side:'Massa e ervilhas',ingredients:[['Bifes de peru','650–700 g'],['Massa curta','400 g'],['Ervilhas','250 g'],['Iogurte natural','1'],['Mostarda suave','1 c. chá'],['Alho','1 dente'],['Azeite','1 c. sopa']],steps:['Cortar o peru em tiras e dourar rapidamente em azeite e alho.','Cozer a massa e juntar as ervilhas nos últimos 3 minutos.','Baixar o lume e envolver o peru com iogurte e mostarda sem deixar ferver.','Juntar a massa escorrida e envolver tudo.','Ajustar sal e servir de imediato.'],adapt:['Sem iogurte: usar queijo-creme, natas leves ou apenas azeite e água da massa.','Sem ervilhas: usar espinafres, milho ou courgette.']},
  {keys:['frango','peito de frango'],name:'Frango mediterrânico com arroz',style:'Mediterrânico',time:30,effort:'simple',methods:['pan'],side:'Arroz e legumes salteados',ingredients:[['Frango','750 g'],['Arroz','300 g'],['Courgette','1'],['Tomate','2'],['Alho','2 dentes'],['Azeite','2 c. sopa']],steps:['Cortar e temperar o frango.','Dourar em frigideira com azeite e alho.','Juntar courgette e tomate e cozinhar até amaciar.','Cozer o arroz à parte.','Servir tudo junto.'],adapt:['Usar os legumes disponíveis em casa.']},
  {keys:['salmão','peixe'],name:'Salmão no forno com batata e feijão-verde',style:'Mediterrânico',time:35,effort:'simple',methods:['oven','airfryer'],side:'Batata e feijão-verde',ingredients:[['Salmão','750 g'],['Batata','900 g'],['Feijão-verde','350 g'],['Limão','1'],['Azeite','2 c. sopa']],steps:['Aquecer o forno a 200 ºC.','Temperar o salmão com limão e azeite.','Assar com a batata previamente cortada fina.','Cozer o feijão-verde.','Servir com limão.'],adapt:['Outro peixe pode substituir o salmão.']},
  {keys:['carne picada','vaca'],name:'Almôndegas rápidas em molho de tomate',style:'Português',time:35,effort:'normal',methods:['pan','oven'],side:'Esparguete e salada',ingredients:[['Carne picada','750 g'],['Tomate triturado','500 ml'],['Esparguete','400 g'],['Cebola','1'],['Alho','2 dentes']],steps:['Formar almôndegas pequenas.','Dourar numa frigideira.','Juntar cebola, alho e tomate e cozinhar 15 minutos.','Cozer o esparguete.','Servir com salada.'],adapt:['Sem tomate triturado: usar tomate fresco bem picado.']}
];

function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.remove('hidden');setTimeout(()=>t.classList.add('hidden'),2200)}
function setAIStatus(mode='local'){const el=$('#aiStatus');if(!el)return;el.classList.remove('online','busy');if(mode==='busy'){el.classList.add('busy');el.querySelector('span').textContent='A procurar';}else if(mode==='retrieval'){el.classList.add('online');el.querySelector('span').textContent='Receitas reais';}else if(mode==='online'){el.classList.add('online');el.querySelector('span').textContent='IA';}else{el.querySelector('span').textContent='Local';}}
function historyForAI(){return state.history.slice(0,20).map(h=>({name:h.recipe?.name||'',rating:h.rating,date:h.date,protein:h.protein||''}));}
function buildAIInput(){return {family:window.LUME_CONFIG?.FAMILY||{people:5},protein:state.protein.trim(),availableIngredients:state.ingredients.trim(),timeMinutes:state.time,effort:state.effort,method:state.method,photoDataUrl:state.photo||null,history:historyForAI(),favorites:state.favorites.slice(0,12).map(f=>f.recipe?.name).filter(Boolean),avoidRecipes:state.suggestionHistory.slice(-12),variationSeed:state.generationRound,language:'pt-PT',constraints:{completeMeal:true,numberOfSuggestions:3,noNutrition:true,adaptMissingIngredients:true,cuisines:['portuguesa','mediterranica'],childFriendly:true,requireNovelSuggestions:true}};}
function normalize(s){return (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function esc(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}

function genericRecipes(protein){
  const p=protein||'proteína';
  return [
    {name:`${cap(p)} na frigideira com limão e ervas`,style:'Mediterrânico',time:25,effort:'simple',methods:['pan'],side:'Arroz e legumes',ingredients:[[cap(p),'quantidade para 5'],['Arroz','300 g'],['Legumes variados','400 g'],['Limão','1'],['Azeite','2 c. sopa']],steps:[`Preparar e temperar ${p} com sal, alho, limão e azeite.`,'Cozinhar numa frigideira quente até estar no ponto.','Preparar arroz simples.','Saltear os legumes disponíveis.','Servir tudo junto, usando os sucos da frigideira como molho.'],adapt:['Substituir qualquer legume pelo que tiveres em casa.']},
    {name:`${cap(p)} assado à portuguesa`,style:'Português',time:45,effort:'normal',methods:['oven'],side:'Batata, cebola e tomate',ingredients:[[cap(p),'quantidade para 5'],['Batata','1 kg'],['Cebola','1'],['Tomate','2'],['Azeite','3 c. sopa']],steps:['Aquecer o forno a 200 ºC.','Dispor batata e cebola num tabuleiro.','Juntar a proteína temperada e tomate.','Regar com azeite e assar até estar cozinhado.','Servir com salada ou legumes.'],adapt:['Sem batata: usar arroz, batata-doce ou legumes assados.']},
    {name:`Taça mediterrânica de ${p}`,style:'Mediterrânico',time:30,effort:'simple',methods:['pan','grill','airfryer'],side:'Cuscuz ou arroz e salada',ingredients:[[cap(p),'quantidade para 5'],['Cuscuz ou arroz','300 g'],['Tomate','2'],['Pepino','1'],['Iogurte natural','1']],steps:[`Grelhar ou saltear ${p} em pedaços.`,'Preparar cuscuz ou arroz.','Cortar os legumes frescos.','Misturar iogurte com limão ou ervas para um molho simples.','Montar em taças para cada pessoa.'],adapt:['Sem iogurte: usar azeite e limão.','Usar os vegetais que existirem.']},
    {name:`${cap(p)} com molho suave de tomate e arroz`,style:'Familiar',time:30,effort:'simple',methods:['pan'],side:'Arroz branco e legumes verdes',ingredients:[[cap(p),'quantidade para 5'],['Tomate triturado','350 ml'],['Arroz','300 g'],['Cebola','1'],['Legumes verdes','350 g']],steps:[`Dourar ${p} com um fio de azeite.`,'Juntar cebola e tomate e cozinhar em lume brando.','Cozer o arroz à parte.','Preparar os legumes sem os deixar demasiado moles.','Servir com o molho por cima.'],adapt:['Sem tomate: fazer um molho leve de iogurte e limão.']},
    {name:`Espetadas de ${p} com legumes`,style:'Mediterrânico',time:35,effort:'normal',methods:['grill','airfryer','oven'],side:'Batata rústica ou arroz',ingredients:[[cap(p),'quantidade para 5'],['Pimento ou courgette','2'],['Cebola','1'],['Batata','900 g'],['Azeite','2 c. sopa']],steps:[`Cortar ${p} e os legumes em pedaços semelhantes.`,'Montar espetadas e temperar com azeite e ervas.','Grelhar, assar ou cozinhar na air fryer até dourar.','Preparar batata rústica ou arroz.','Servir as espetadas ao centro.'],adapt:['Sem espetos: cozinhar tudo solto num tabuleiro.']},
    {name:`Arroz de ${p} e legumes numa só panela`,style:'Português',time:35,effort:'simple',methods:['pan'],side:'Refeição completa numa só panela',ingredients:[[cap(p),'quantidade para 5'],['Arroz','350 g'],['Cenoura','2'],['Ervilhas','200 g'],['Cebola','1'],['Caldo ou água','q.b.']],steps:[`Cortar ${p} em pedaços e alourar.`,'Juntar cebola e cenoura.','Adicionar arroz e caldo suficiente.','Juntar as ervilhas perto do fim e cozinhar até o arroz ficar no ponto.','Repousar 3 minutos antes de servir.'],adapt:['Usar milho, feijão-verde ou courgette no lugar das ervilhas.']},
    {name:`${cap(p)} crocante na air fryer`,style:'Familiar',time:25,effort:'simple',methods:['airfryer','oven'],side:'Batata-doce e salada de tomate',ingredients:[[cap(p),'quantidade para 5'],['Pão ralado','80 g'],['Batata-doce','900 g'],['Tomate','3'],['Azeite','2 c. sopa']],steps:[`Cortar e temperar ${p}.`,'Passar ligeiramente por pão ralado.','Cozinhar na air fryer ou forno até dourar.','Assar a batata-doce em palitos.','Servir com tomate temperado.'],adapt:['Sem pão ralado: usar aveia triturada ou cozinhar sem cobertura.']},
    {name:`Massa mediterrânica com ${p} e legumes`,style:'Mediterrânico',time:30,effort:'simple',methods:['pan'],side:'Massa curta com molho leve',ingredients:[[cap(p),'quantidade para 5'],['Massa curta','400 g'],['Courgette','1'],['Tomate','2'],['Alho','1 dente'],['Azeite','2 c. sopa']],steps:[`Saltear ${p} em pedaços.`,'Juntar courgette, tomate e alho.','Cozer a massa e reservar um pouco da água.','Envolver tudo com um pouco da água da massa e azeite.','Servir de imediato.'],adapt:['Qualquer legume macio pode substituir a courgette.']}
  ]
}
function cap(s){return s.charAt(0).toUpperCase()+s.slice(1)}

function scoreRecipe(r){
  let score=0;
  if(r.time<=state.time)score+=4; else score-=3;
  if(state.effort===r.effort)score+=2;
  if(state.method==='any'||r.methods.includes(state.method))score+=2;

  const sameProtein=state.history.filter(h=>h.rating>=3 && normalize(h.protein||'').includes(normalize(state.protein).split(' ')[0]));
  score+=Math.min(sameProtein.length,2)*0.5;

  const previous=state.history.find(h=>normalize(h.recipe.name)===normalize(r.name));
  if(previous){
    const days=(Date.now()-new Date(previous.date).getTime())/86400000;
    if(days<14) score-=4;
    else if(days<28) score-=1;
    else if(previous.rating>=3) score+=2;
    if(previous.rating===1) score-=6;
    if(previous.rating===4) score+=1;
  }
  return score;
}

async function generate(){
  if(state.isGenerating) return;
  state.isGenerating=true;
  state.generationRound+=1;
  const button=$('#suggestBtn');
  const otherButtons=[...document.querySelectorAll('[data-more]')];
  if(button){button.disabled=true;button.textContent='A procurar…'}
  otherButtons.forEach(b=>{b.disabled=true;b.textContent='A procurar…'});
  const host=$('#suggestions');
  if(host)host.innerHTML=`<section class="card loading-card"><span class="spinner"></span><div class="loading-copy"><b>A procurar receitas reais</b><small>A selecionar opções diferentes e adequadas ao que tens.</small></div></section>`;

  try{
    // 1) Retrieval-first: receitas reais da Internet são a fonte principal.
    if(navigator.onLine && window.LumeRetrieval){
      try{
        setAIStatus('busy');
        const recipes=await window.LumeRetrieval.suggest(buildAIInput());
        if(recipes.length>=3){
          state.suggestions=recipes.slice(0,3).map(r=>({...r,id:uid()}));
          state.suggestionHistory.push(...state.suggestions.map(r=>r.name));
          state.suggestionHistory=state.suggestionHistory.slice(-24);
          setAIStatus('retrieval');
          renderSuggestions();
          return;
        }
      }catch(err){
        console.warn('Lume retrieval fallback:',err);
      }
    }

    // 2) IA é opcional: pode adaptar/gerar apenas se o endpoint estiver configurado.
    if(window.LumeAI?.isConfigured()){
      try{
        setAIStatus('busy');
        const recipes=await window.LumeAI.suggest(buildAIInput());
        state.suggestions=recipes.map(r=>({...r,id:uid()}));
        state.suggestionHistory.push(...state.suggestions.map(r=>r.name));
        state.suggestionHistory=state.suggestionHistory.slice(-24);
        setAIStatus('online');
        renderSuggestions();
        return;
      }catch(err){
        console.warn('Lume AI fallback:',err);
      }
    }

    // 3) Fallback local: a app continua útil offline ou se uma API falhar.
    toast('Não consegui pesquisar receitas agora. Usei as sugestões locais.');
    setAIStatus('local');
    const q=normalize(state.protein);
    const matched=db.filter(r=>r.keys.some(k=>q.includes(normalize(k))||normalize(k).includes(q)));
    let pool=[...matched,...genericRecipes(state.protein)];
    const recent=new Set(state.suggestionHistory.slice(-9).map(normalize));
    let fresh=pool.filter(r=>!recent.has(normalize(r.name)));
    if(fresh.length<3){
      const oldestFirst=[...pool].sort((a,b)=>state.suggestionHistory.indexOf(a.name)-state.suggestionHistory.indexOf(b.name));
      fresh=[...fresh,...oldestFirst.filter(r=>!fresh.some(x=>normalize(x.name)===normalize(r.name)))];
    }
    const offset=state.generationRound % Math.max(fresh.length,1);
    fresh=[...fresh.slice(offset),...fresh.slice(0,offset)];
    state.suggestions=fresh.sort((a,b)=>scoreRecipe(b)-scoreRecipe(a)).slice(0,3).map(r=>({...r,id:uid(),source:'local'}));
    state.suggestionHistory.push(...state.suggestions.map(r=>r.name));
    state.suggestionHistory=state.suggestionHistory.slice(-24);
    renderSuggestions();
  } finally {
    state.isGenerating=false;
    const current=$('#suggestBtn');
    if(current){current.disabled=false;current.textContent='Dar-me 3 ideias'}
    document.querySelectorAll('[data-more]').forEach(b=>{b.disabled=false;b.textContent='Outras ideias'});
  }
}

function route(name){state.route=name; document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.nav===name)); render()}
document.addEventListener('click',e=>{const n=e.target.closest('[data-nav]');if(n)route(n.dataset.nav)});

function render(){
  if(state.route==='today')renderToday();
  if(state.route==='favorites')renderFavorites();
  if(state.route==='history')renderHistory();
  if(state.route==='plan')renderPlan();
}

function renderToday(){
  app.innerHTML=`
    <section class="hero"><div class="eyebrow">Jantar para cinco</div><h1>O que temos para o jantar?</h1><p class="sub">Diz-me o que há. O Lume transforma isso em três refeições completas, práticas e pensadas para a família.</p></section>
    <section class="card">
      <label class="label">Proteína principal</label>
      <input id="protein" class="field" placeholder="Ex.: bifes de peru, salmão, frango…" value="${esc(state.protein)}" />
      <div class="chips" style="margin-top:10px">
        ${['Bifes de peru','Frango','Salmão','Carne picada','Ovos'].map(x=>`<button class="chip quick-protein">${x}</button>`).join('')}
      </div>
      <label class="label">O que mais existe em casa? <span style="font-weight:500;color:var(--muted)">(opcional)</span></label>
      <textarea id="ingredients" class="field" placeholder="Ex.: courgette, arroz, tomate, iogurte…">${esc(state.ingredients)}</textarea>
      <label class="label">Quanto tempo tens?</label>
      <div class="chips" id="timeChips">${[15,30,45,60].map(t=>`<button class="chip ${state.time===t?'active':''}" data-time="${t}">${t===60?'Sem pressa':t+' min'}</button>`).join('')}</div>
      <label class="label">Hoje quero</label>
      <div class="grid">
        <button class="choice ${state.effort==='simple'?'selected':''}" data-effort="simple"><b>Simples</b><small>Poucos passos, pouca loiça</small></button>
        <button class="choice ${state.effort==='normal'?'selected':''}" data-effort="normal"><b>Normal</b><small>Posso cozinhar um pouco mais</small></button>
      </div>
      <label class="label">Como queres cozinhar?</label>
      <div class="chips">${[['any','Tanto faz'],['pan','Frigideira'],['oven','Forno'],['grill','Grelhador'],['airfryer','Air fryer']].map(([v,l])=>`<button class="chip ${state.method===v?'active':''}" data-method="${v}">${l}</button>`).join('')}</div>
      <div class="photo-zone" style="margin-top:16px"><div class="photo-row"><span class="camera-glyph">⌾</span><div class="photo-copy"><b>Fotografar o frigorífico</b><p class="sub" style="font-size:12px;margin-top:3px">A pesquisa usa o texto. Se ligares IA, a fotografia também pode identificar ingredientes visíveis.</p></div><button id="photoBtn" class="ghost small">Adicionar</button></div>${state.photo?`<img class="photo-preview" src="${state.photo}" alt="Fotografia do frigorífico" />`:''}</div>
      <div class="btn-row"><button id="suggestBtn" class="primary full">Dar-me 3 ideias</button></div>
    </section>
    <section id="suggestions"></section>`;

  $('#protein').addEventListener('input',e=>state.protein=e.target.value);
  $('#ingredients').addEventListener('input',e=>state.ingredients=e.target.value);
  document.querySelectorAll('.quick-protein').forEach(b=>b.onclick=()=>{$('#protein').value=b.textContent;state.protein=b.textContent});
  document.querySelectorAll('[data-time]').forEach(b=>b.onclick=()=>{state.time=+b.dataset.time;renderToday()});
  document.querySelectorAll('[data-effort]').forEach(b=>b.onclick=()=>{state.effort=b.dataset.effort;renderToday()});
  document.querySelectorAll('[data-method]').forEach(b=>b.onclick=()=>{state.method=b.dataset.method;renderToday()});
  $('#photoBtn').onclick=()=>$('#photoInput').click();
  $('#suggestBtn').onclick=()=>{if(!state.protein.trim())return toast('Indica primeiro a proteína principal.');generate()};
  if(state.suggestions.length)renderSuggestions();
}

function renderSuggestions(){
  const host=$('#suggestions'); if(!host)return;
  host.innerHTML=`<section class="hero" style="padding-top:22px"><div class="eyebrow">Três possibilidades</div><h2>Escolhe a que vos apetece.</h2></section>`+state.suggestions.map((r,i)=>recipeCard(r,i)).join('');
  host.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openRecipe(b.dataset.open));
  host.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>openRecipe(b.dataset.pick,true));
  host.querySelectorAll('[data-more]').forEach(b=>b.onclick=()=>generate());
  host.scrollIntoView({behavior:'smooth',block:'start'});
}

function recipeCard(r,i){const source=(r.source==='web'||r.source==='retrieved')?`Receita real · ${esc(r.sourceName||'fonte externa')}`:(r.source==='ai'?'Adaptada pela IA do Lume':'Sugestão local do Lume');return `<article class="card recipe-card">${r.image?`<img class="recipe-image" src="${esc(r.image)}" alt="" loading="lazy" referrerpolicy="no-referrer" />`:''}<span class="recipe-number">IDEIA 0${i+1}</span><h3>${esc(r.name)}</h3><p class="sub">${esc(r.side)}</p><div class="recipe-meta"><span class="pill">≈ ${r.time} min</span><span class="pill">${r.effort==='simple'?'Simples':'Normal'}</span><span class="pill">${esc(r.style)}</span></div><div class="recipe-actions"><button class="primary" data-pick="${r.id}">Vou fazer esta</button><button class="ghost" data-open="${r.id}">Ver receita</button><button class="ghost" data-more="1">Outras ideias</button></div><div class="source-note">${source}</div></article>`}

function openRecipe(id,chosen=false){
  const r=state.suggestions.find(x=>x.id===id)||state.favorites.find(x=>x.id===id)?.recipe||state.history.find(x=>x.recipe.id===id)?.recipe;
  if(!r)return;
  state.selected=r;
  app.innerHTML=`<button id="backToday" class="ghost small">← Voltar</button><section class="hero"><div class="eyebrow">${chosen?'Escolhida para hoje':'Receita'}</div><h1>${esc(r.name)}</h1><p class="sub">${esc(r.side)}</p><div class="recipe-meta"><span class="pill">${r.time} min</span><span class="pill">Para 5</span><span class="pill">${esc(r.style)}</span></div></section>
  <section class="card"><h3>Ingredientes</h3><ul class="ingredients">${r.ingredients.map(([a,b])=>`<li><span>${esc(a)}</span><b>${esc(b)}</b></li>`).join('')}</ul>${state.ingredients?`<div class="adapt" style="margin-top:14px">Vou privilegiar o que disseste que tens: <b>${esc(state.ingredients)}</b>. Se algo da lista faltar, usa as substituições abaixo.</div>`:''}</section>
  <section class="card"><h3>Como fazer</h3><ol class="steps">${r.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol><div class="divider"></div><h3>Se faltar alguma coisa</h3>${r.adapt.map(a=>`<div class="adapt" style="margin-top:8px">${esc(a)}</div>`).join('')}</section>
  ${(r.source==='web'||r.source==='retrieved')&&r.sourceUrl?`<section class="card source-card"><div><div class="eyebrow">Fonte original</div><h3>${esc(r.sourceName||'Receita na Internet')}</h3><p class="sub">O Lume encontrou esta receita na web. Ingredientes e dados essenciais são usados para seleção; a preparação completa permanece na fonte original.</p></div><a class="ghost source-link" href="${esc(r.sourceUrl)}" target="_blank" rel="noopener noreferrer">Abrir fonte ↗</a></section>`:''}<section class="card"><h3>Depois do jantar</h3><p class="sub" style="margin-bottom:13px">O Lume aprende com a família. Como correu?</p><div class="feedback">${[[4,'😍','Adorámos'],[3,'🙂','Gostámos'],[2,'😐','Assim-assim'],[1,'👎','Não repetir']].map(([v,e,l])=>`<button data-rate="${v}">${e}<small>${l}</small></button>`).join('')}</div></section>`;
  $('#backToday').onclick=()=>route('today');
  document.querySelectorAll('[data-rate]').forEach(b=>b.onclick=()=>saveFeedback(r,+b.dataset.rate));
}

function saveFeedback(recipe,rating){
  const entry={id:uid(),date:new Date().toISOString(),rating,recipe:{...recipe},protein:state.protein};
  state.history.unshift(entry);store.set('history',state.history);
  if(rating===4&&!state.favorites.some(f=>f.recipe.name===recipe.name)){
    state.favorites.unshift({id:uid(),added:new Date().toISOString(),recipe:{...recipe}});store.set('favorites',state.favorites);toast('Guardada nas Favoritas da Família ♥');
  } else toast('Feedback guardado. O Lume vai aprender com isto.');
  setTimeout(()=>route('today'),500);
}

function renderFavorites(){
  app.innerHTML=`<section class="hero"><div class="eyebrow">Da vossa casa</div><h1>Favoritas da Família</h1><p class="sub">As receitas que receberam “Adorámos”.</p></section>${state.favorites.length?state.favorites.map(f=>`<section class="card list-card"><div class="content"><h3>${esc(f.recipe.name)}</h3><p>${esc(f.recipe.side)} · ${f.recipe.time} min</p><button class="ghost small" data-favopen="${f.id}">Abrir receita</button></div><button class="heart" data-removefav="${f.id}">♥</button></section>`).join(''):`<div class="card empty">Ainda não há favoritas. As receitas classificadas com 😍 aparecem aqui.</div>`}`;
  document.querySelectorAll('[data-favopen]').forEach(b=>b.onclick=()=>{const f=state.favorites.find(x=>x.id===b.dataset.favopen);state.suggestions=[f.recipe];openRecipe(f.recipe.id)});
  document.querySelectorAll('[data-removefav]').forEach(b=>b.onclick=()=>{state.favorites=state.favorites.filter(x=>x.id!==b.dataset.removefav);store.set('favorites',state.favorites);renderFavorites()});
}

function renderHistory(){
  const labels={4:'😍 Adorámos',3:'🙂 Gostámos',2:'😐 Assim-assim',1:'👎 Não repetir'};
  app.innerHTML=`<section class="hero"><div class="eyebrow">Memória</div><h1>Histórico</h1><p class="sub">O que cozinharam e como a família reagiu.</p></section>${state.history.length?state.history.map(h=>`<section class="card list-card"><div class="content"><h3>${esc(h.recipe.name)}</h3><p>${new Date(h.date).toLocaleDateString('pt-PT')} · ${esc(h.recipe.side)}</p></div><span class="badge">${labels[h.rating]}</span></section>`).join(''):`<div class="card empty">O histórico começa depois da primeira refeição avaliada.</div>`}`;
}

function renderPlan(){
  const days=['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];
  app.innerHTML=`<section class="hero"><div class="eyebrow">Semana</div><h1>Planeamento</h1><p class="sub">Guarda uma ideia por dia. Podes usar favoritas ou escrever livremente.</p></section><section class="card week">${days.map((d,i)=>`<div class="day-row"><strong>${d}</strong><input class="day-meal" data-day="${i}" placeholder="Escolher refeição…" value="${esc(state.plan[i]||'')}" /></div>`).join('')}</section><button id="planSave" class="primary full">Guardar semana</button>`;
  $('#planSave').onclick=()=>{document.querySelectorAll('[data-day]').forEach(x=>state.plan[x.dataset.day]=x.value);store.set('plan',state.plan);toast('Planeamento guardado.');};
}

$('#photoInput').addEventListener('change',e=>{
  const f=e.target.files?.[0]; if(!f)return; const reader=new FileReader(); reader.onload=()=>{state.photo=reader.result;renderToday();toast(window.LumeAI?.isConfigured()?'Foto pronta para análise pela IA.':'Foto guardada. Será analisada quando ligares a IA.')}; reader.readAsDataURL(f);
});

let deferredPrompt;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('#installBtn').classList.remove('hidden')});
$('#installBtn').onclick=async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('#installBtn').classList.add('hidden')};

if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
render();
setAIStatus(navigator.onLine&&window.LumeRetrieval?'retrieval':(window.LumeAI?.isConfigured()?'online':'local'));
