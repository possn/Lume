const $ = s => document.querySelector(s);
const app = $('#app');

const store = {
  get(k, fallback){ try{return JSON.parse(localStorage.getItem('lume_'+k)) ?? fallback}catch{return fallback} },
  set(k,v){ localStorage.setItem('lume_'+k,JSON.stringify(v)) }
};

const state = {
  route:'today', protein:'', ingredients:'', time:30, effort:'simple', method:'any', photo:null,
  suggestions:[], selected:null, isGenerating:false, suggestionHistory:store.get('suggestionHistory',[]), generationRound:store.get('generationRound',0),
  favorites:store.get('favorites',[]), history:store.get('history',[]), plan:store.get('plan',{}),
  currentMeal:store.get('currentMeal',null)
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
function setAIStatus(mode='local'){const el=$('#aiStatus');if(!el)return;el.classList.remove('online','busy');if(mode==='busy'){el.classList.add('busy');el.querySelector('span').textContent='A procurar';}else if(mode==='retrieval'){el.classList.add('online');el.querySelector('span').textContent='Fontes PT';}else if(mode==='online'){el.classList.add('online');el.querySelector('span').textContent='IA';}else{el.querySelector('span').textContent='Local';}}
function historyForAI(){return state.history.slice(0,40).map(h=>({name:h.recipe?.name||'',rating:h.rating,date:h.date,protein:h.protein||'',childrenLiked:h.childrenLiked,adultsLiked:h.adultsLiked,style:h.recipe?.style||'',methods:h.recipe?.methods||[],ingredients:(h.recipe?.ingredients||[]).map(x=>Array.isArray(x)?x[0]:x).slice(0,14),sourceName:h.recipe?.sourceName||''}));}
function buildAIInput(){return {family:window.LUME_CONFIG?.FAMILY||{people:5},protein:state.protein.trim(),availableIngredients:state.ingredients.trim(),timeMinutes:state.time,effort:state.effort,method:state.method,photoDataUrl:state.photo||null,history:historyForAI(),favorites:state.favorites.slice(0,20).map(f=>({name:f.recipe?.name||'',style:f.recipe?.style||'',methods:f.recipe?.methods||[],ingredients:(f.recipe?.ingredients||[]).map(x=>Array.isArray(x)?x[0]:x).slice(0,14)})).filter(x=>x.name),avoidRecipes:state.suggestionHistory.slice(-18),variationSeed:state.generationRound,language:'pt-PT',constraints:{completeMeal:true,numberOfSuggestions:5,noNutrition:true,adaptMissingIngredients:true,cuisines:['portuguesa','mediterranica'],suggestionMix:{portuguese:3,mediterranean:1,family:1},childFriendly:true,requireNovelSuggestions:true,preferRecipeImage:true}};}
function normalize(s){return (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function esc(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}

function daysSince(date){const ms=Date.now()-new Date(date).getTime();return Math.max(0,Math.floor(ms/86400000))}
function lastHistoryFor(name){return state.history.find(h=>normalize(h.recipe?.name)===normalize(name))||null}
function repeatNote(recipe){const h=lastHistoryFor(recipe.name);if(!h)return'';const d=daysSince(h.date);const when=d===0?'hoje':d===1?'há 1 dia':d<14?`há ${d} dias`:d<56?`há ${Math.round(d/7)} semanas`:`há ${Math.round(d/30)} meses`;const label={4:'adoraram',3:'gostaram',2:'ficou assim-assim',1:'não quiseram repetir'}[h.rating]||'já fizeram';return `Última vez: ${label} · ${when}`}
function availableTokens(){return state.ingredients.split(/[,;\n]+/).map(x=>normalize(x.trim())).filter(x=>x.length>2).slice(0,12)}
const ingredientAliasGroups=[
  ['batata','batatas'],['tomate','tomates'],['cebola','cebolas'],['cenoura','cenouras'],['courgette','curgete','abobrinha'],
  ['brocolos','brocolo'],['ervilha','ervilhas'],['feijao verde','feijao-verde'],['pimento','pimentos'],['espinafre','espinafres'],
  ['ovo','ovos'],['limao','limoes'],['massa','esparguete','macarrao','penne','fusilli'],['queijo','mozarela','mozzarella','feta','parmesao']
].map(g=>g.map(normalize));
function ingredientMatches(a,b){
  const x=normalize(a),y=normalize(b);if(!x||!y)return false;
  if(x.includes(y)||y.includes(x))return true;
  return ingredientAliasGroups.some(g=>g.some(t=>x.includes(t))&&g.some(t=>y.includes(t)));
}
function ingredientStatus(name){return availableTokens().some(t=>ingredientMatches(name,t))?'have':''}

// v0.12 — Smart Adaptation Engine
// Only adapts when the user has explicitly listed a plausible substitute.
// The source recipe is preserved; the adapted version is always labelled as Lume's suggestion.
const substitutionFamilies={
  leafy:['espinafre','espinafres','acelga','acelgas','couve','couve galega','rúcula','rucula'],
  softVeg:['courgette','curgete','abobrinha','beringela','pimento','pimentos','cogumelos','cogumelo','tomate','tomates'],
  greenVeg:['brócolos','brocolos','brócolo','brocolo','feijão-verde','feijao verde','ervilhas','ervilha','espargos'],
  rootVeg:['cenoura','cenouras','nabo','nabos','abóbora','abobora'],
  starch:['arroz','massa','esparguete','penne','fusilli','cuscuz','couscous','batata','batatas','batata-doce'],
  creamy:['iogurte','iogurte natural','natas','queijo creme','queijo-creme','ricota'],
  cheese:['queijo','mozarela','mozzarella','feta','parmesão','parmesao'],
  acid:['limão','limao','laranja','vinagre'],
  allium:['cebola','cebolas','alho','alho-francês','alho frances'],
  pulses:['grão','grao','grão-de-bico','feijão','feijao','lentilhas']
};
function familyForIngredient(name){
  const n=normalize(name);
  for(const [family,terms] of Object.entries(substitutionFamilies))if(terms.some(t=>n.includes(normalize(t))))return family;
  return '';
}
function proteinIsAvailable(name){return state.protein&&ingredientMatches(name,state.protein)}
function explicitlyHave(name){return proteinIsAvailable(name)||ingredientStatus(name)==='have'}
function displayToken(t){return String(t||'').trim().replace(/^./,c=>c.toUpperCase())}
function bestSubstituteFor(name,used=new Set()){
  const family=familyForIngredient(name); if(!family)return null;
  const candidates=availableTokens().filter(t=>familyForIngredient(t)===family&&!ingredientMatches(name,t)&&!used.has(t));
  if(!candidates.length)return null;
  // Prefer the first ingredient entered by the user; entry order usually reflects what they want to use up.
  return candidates[0];
}
function smartAdaptation(r){
  const used=new Set(),changes=[];
  const adaptedIngredients=(r.ingredients||[]).map(pair=>{
    const [name,qty]=Array.isArray(pair)?pair:[pair,''];
    if(explicitlyHave(name))return [name,qty];
    const substitute=bestSubstituteFor(name,used);
    if(!substitute)return [name,qty];
    used.add(substitute);
    changes.push({from:name,to:displayToken(substitute),qty});
    return [displayToken(substitute),qty];
  });
  if(!changes.length)return {available:false,changes:[],ingredients:adaptedIngredients,steps:r.steps||[]};
  let adaptedSteps=[...(r.steps||[])];
  const escapeRegExp=x=>String(x).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  for(const c of changes){
    const from=String(c.from||'').trim(); if(!from)continue;
    const re=new RegExp(escapeRegExp(from),'gi');
    adaptedSteps=adaptedSteps.map(step=>String(step).replace(re,c.to));
  }
  return {available:true,changes,ingredients:adaptedIngredients,steps:adaptedSteps};
}
function localIngredientCoverage(r){
  const have=availableTokens();if(!have.length)return {matched:0,total:0,ratio:0};
  const names=(r.ingredients||[]).map(x=>Array.isArray(x)?x[0]:x);
  const matched=have.filter(h=>names.some(n=>ingredientMatches(n,h))).length;
  return {matched,total:have.length,ratio:matched/have.length};
}
function chooseRecipe(recipe){
  state.currentMeal={id:uid(),chosenAt:new Date().toISOString(),protein:state.protein,context:{ingredients:state.ingredients,time:state.time,effort:state.effort,method:state.method},recipe:{...recipe}};
  store.set('currentMeal',state.currentMeal);state.selected=recipe;openRecipe(recipe.id,true);
}

function genericRecipes(protein){
  const p=protein||'proteína';
  return [
    {name:`${cap(p)} na frigideira com alho e limão`,style:'Português',time:25,effort:'simple',methods:['pan'],side:'Arroz e legumes',ingredients:[[cap(p),'quantidade para 5'],['Arroz','300 g'],['Legumes variados','400 g'],['Limão','1'],['Azeite','2 c. sopa']],steps:[`Preparar e temperar ${p} com sal, alho, limão e azeite.`,'Cozinhar numa frigideira quente até estar no ponto.','Preparar arroz simples.','Saltear os legumes disponíveis.','Servir tudo junto, usando os sucos da frigideira como molho.'],adapt:['Substituir qualquer legume pelo que tiveres em casa.']},
    {name:`${cap(p)} assado à portuguesa`,style:'Português',time:45,effort:'normal',methods:['oven'],side:'Batata, cebola e tomate',ingredients:[[cap(p),'quantidade para 5'],['Batata','1 kg'],['Cebola','1'],['Tomate','2'],['Azeite','3 c. sopa']],steps:['Aquecer o forno a 200 ºC.','Dispor batata e cebola num tabuleiro.','Juntar a proteína temperada e tomate.','Regar com azeite e assar até estar cozinhado.','Servir com salada ou legumes.'],adapt:['Sem batata: usar arroz, batata-doce ou legumes assados.']},
    {name:`Taça mediterrânica de ${p}`,style:'Mediterrânico',time:30,effort:'simple',methods:['pan','grill','airfryer'],side:'Cuscuz ou arroz e salada',ingredients:[[cap(p),'quantidade para 5'],['Cuscuz ou arroz','300 g'],['Tomate','2'],['Pepino','1'],['Iogurte natural','1']],steps:[`Grelhar ou saltear ${p} em pedaços.`,'Preparar cuscuz ou arroz.','Cortar os legumes frescos.','Misturar iogurte com limão ou ervas para um molho simples.','Montar em taças para cada pessoa.'],adapt:['Sem iogurte: usar azeite e limão.','Usar os vegetais que existirem.']},
    {name:`${cap(p)} estufado com tomate e arroz`,style:'Português',time:30,effort:'simple',methods:['pan'],side:'Arroz branco e legumes verdes',ingredients:[[cap(p),'quantidade para 5'],['Tomate triturado','350 ml'],['Arroz','300 g'],['Cebola','1'],['Legumes verdes','350 g']],steps:[`Dourar ${p} com um fio de azeite.`,'Juntar cebola e tomate e cozinhar em lume brando.','Cozer o arroz à parte.','Preparar os legumes sem os deixar demasiado moles.','Servir com o molho por cima.'],adapt:['Sem tomate: fazer um molho leve de iogurte e limão.']},
    {name:`Espetadas de ${p} com legumes`,style:'Mediterrânico',time:35,effort:'normal',methods:['grill','airfryer','oven'],side:'Batata rústica ou arroz',ingredients:[[cap(p),'quantidade para 5'],['Pimento ou courgette','2'],['Cebola','1'],['Batata','900 g'],['Azeite','2 c. sopa']],steps:[`Cortar ${p} e os legumes em pedaços semelhantes.`,'Montar espetadas e temperar com azeite e ervas.','Grelhar, assar ou cozinhar na air fryer até dourar.','Preparar batata rústica ou arroz.','Servir as espetadas ao centro.'],adapt:['Sem espetos: cozinhar tudo solto num tabuleiro.']},
    {name:`Arroz de ${p} e legumes numa só panela`,style:'Português',time:35,effort:'simple',methods:['pan'],side:'Refeição completa numa só panela',ingredients:[[cap(p),'quantidade para 5'],['Arroz','350 g'],['Cenoura','2'],['Ervilhas','200 g'],['Cebola','1'],['Caldo ou água','q.b.']],steps:[`Cortar ${p} em pedaços e alourar.`,'Juntar cebola e cenoura.','Adicionar arroz e caldo suficiente.','Juntar as ervilhas perto do fim e cozinhar até o arroz ficar no ponto.','Repousar 3 minutos antes de servir.'],adapt:['Usar milho, feijão-verde ou courgette no lugar das ervilhas.']},
    {name:`${cap(p)} crocante na air fryer`,style:'Familiar',time:25,effort:'simple',methods:['airfryer','oven'],side:'Batata-doce e salada de tomate',ingredients:[[cap(p),'quantidade para 5'],['Pão ralado','80 g'],['Batata-doce','900 g'],['Tomate','3'],['Azeite','2 c. sopa']],steps:[`Cortar e temperar ${p}.`,'Passar ligeiramente por pão ralado.','Cozinhar na air fryer ou forno até dourar.','Assar a batata-doce em palitos.','Servir com tomate temperado.'],adapt:['Sem pão ralado: usar aveia triturada ou cozinhar sem cobertura.']},
    {name:`Massa mediterrânica com ${p} e legumes`,style:'Mediterrânico',time:30,effort:'simple',methods:['pan'],side:'Massa curta com molho leve',ingredients:[[cap(p),'quantidade para 5'],['Massa curta','400 g'],['Courgette','1'],['Tomate','2'],['Alho','1 dente'],['Azeite','2 c. sopa']],steps:[`Saltear ${p} em pedaços.`,'Juntar courgette, tomate e alho.','Cozer a massa e reservar um pouco da água.','Envolver tudo com um pouco da água da massa e azeite.','Servir de imediato.'],adapt:['Qualquer legume macio pode substituir a courgette.']}
  ]
}
function cap(s){return s.charAt(0).toUpperCase()+s.slice(1)}

function scoreRecipe(r){
  let score=0;
  if(r.time&&r.time<=state.time)score+=5; else if(r.time)score-=3;
  if(state.effort===r.effort)score+=2;
  if(state.method==='any'||(r.methods||[]).includes(state.method))score+=3;
  if(r.image)score+=2.5;
  const coverage=localIngredientCoverage(r);
  score+=coverage.matched*4;
  score+=coverage.ratio*10;
  if(coverage.total&&coverage.matched===0)score-=5;
  if(coverage.ratio>=0.75)score+=5;
  const adaptation=smartAdaptation(r);
  if(adaptation.available)score+=Math.min(3,adaptation.changes.length*0.8);

  const previous=state.history.find(h=>normalize(h.recipe.name)===normalize(r.name));
  if(previous){
    const days=(Date.now()-new Date(previous.date).getTime())/86400000;
    if(days<14) score-=8;
    else if(days<28) score-=3;
    else if(previous.rating>=3) score+=3;
    if(previous.rating===1) score-=16;
    if(previous.rating===4) score+=4;
    if(previous.childrenLiked===false) score-=8;
    if(previous.childrenLiked===true) score+=2.5;
    if(previous.adultsLiked===false) score-=3;
    if(previous.adultsLiked===true) score+=1;
  }

  // Lightweight family learning: reward overlap with meals that worked well,
  // especially when the children liked them.
  const rt=new Set(normalize(`${r.name} ${(r.ingredients||[]).map(x=>x[0]).join(' ')}`).split(/[^a-z0-9]+/).filter(x=>x.length>3));
  for(const h of state.history.slice(0,30)){
    if(!h.recipe||h.rating<3)continue;
    const ht=new Set(normalize(`${h.recipe.name} ${(h.recipe.ingredients||[]).map(x=>x[0]).join(' ')}`).split(/[^a-z0-9]+/).filter(x=>x.length>3));
    let inter=0;rt.forEach(x=>{if(ht.has(x))inter++});
    const similarity=inter/Math.max(1,Math.min(rt.size,ht.size));
    if(similarity>0.18)score+=similarity*(h.rating===4?3:1.5)*(h.childrenLiked===true?1.4:1);
  }
  return score;
}

function recipeBucket(r){
  const explicit=normalize(r.suggestionType||r.discoveryIntent||r.style||'');
  const hay=normalize(`${r.name||''} ${r.side||''} ${(r.ingredients||[]).flat().join(' ')}`);
  if(explicit.includes('familiar')||/massa|almôndeg|hamburg|empad|gratin|croquete|panado/.test(hay))return 'family';
  if(explicit.includes('mediterr')||/mediterr|greg|italian|espanhol|cuscuz|oreg[aã]os|azeitona|feta/.test(hay))return 'mediterranean';
  return 'portuguese';
}
function composeLocalFive(rows){
  const uniqueRows=[];
  for(const r of rows){if(r?.name&&!uniqueRows.some(x=>normalize(x.name)===normalize(r.name)))uniqueRows.push(r)}
  const out=[];
  const take=(bucket,n,label)=>{
    for(const r of uniqueRows){
      if(out.includes(r)||recipeBucket(r)!==bucket)continue;
      out.push({...r,suggestionType:label});
      if(out.filter(x=>x.suggestionType===label).length>=n)break;
    }
  };
  take('portuguese',3,'Portuguesa');take('mediterranean',1,'Mediterrânica');take('family',1,'Familiar');
  for(const r of uniqueRows){if(out.length>=5)break;if(!out.some(x=>normalize(x.name)===normalize(r.name)))out.push({...r,suggestionType:r.suggestionType||r.style||'Alternativa'});}
  return out.slice(0,5);
}


// v0.10 — Complete Meal Composer
// The source recipe stays untouched. Lume only adds a clearly identified accompaniment
// when the retrieved recipe does not already contain a starch and/or vegetables.
const mealSides={
  starch:[
    {key:'arroz-cenoura',name:'arroz de cenoura',terms:['arroz','cenoura'],ingredients:[['Arroz','300 g'],['Cenoura','2']],step:'Cozer 300 g de arroz para 5 pessoas com 2 cenouras raladas; manter simples para aproveitar o molho do prato principal.'},
    {key:'batata-forno',name:'batata assada',terms:['batata'],ingredients:[['Batata','900 g']],step:'Cortar 900 g de batata em gomos, temperar com azeite e assar até dourar. Pode aproveitar o forno se a receita principal também o usar.'},
    {key:'pure',name:'puré de batata',terms:['batata'],ingredients:[['Batata','900 g']],step:'Cozer 900 g de batata e esmagar com um pouco de leite ou azeite até obter um puré leve.'},
    {key:'cuscuz',name:'cuscuz de ervas',terms:['cuscuz'],ingredients:[['Cuscuz','300 g']],step:'Hidratar 300 g de cuscuz e soltar com azeite, limão e ervas. Fica pronto enquanto termina o prato principal.'},
    {key:'massa',name:'massa curta simples',terms:['massa'],ingredients:[['Massa curta','350 g']],step:'Cozer 350 g de massa curta al dente e envolver com um fio de azeite ou um pouco do molho da receita principal.'},
    {key:'batata-cozida',name:'batata cozida com azeite',terms:['batata'],ingredients:[['Batata','900 g']],step:'Cozer 900 g de batata em pedaços e terminar com azeite. É um acompanhamento neutro e familiar.'}
  ],
  veg:[
    {key:'brocolos',name:'brócolos salteados',terms:['brocolos','brócolos'],ingredients:[['Brócolos','400 g']],step:'Cozer ou saltear 400 g de brócolos, deixando-os firmes. Temperar apenas com azeite e, se quiseres, limão.'},
    {key:'salada-tomate',name:'salada de tomate',terms:['tomate'],ingredients:[['Tomate','4']],step:'Cortar 4 tomates e temperar com azeite. Juntar cebola ou ervas apenas se existirem em casa.'},
    {key:'courgette',name:'courgette salteada',terms:['courgette'],ingredients:[['Courgette','2']],step:'Fatiar 2 courgettes e saltear rapidamente em azeite para ficarem douradas sem perder textura.'},
    {key:'feijao-verde',name:'feijão-verde',terms:['feijao verde','feijão-verde','feijão verde'],ingredients:[['Feijão-verde','400 g']],step:'Cozer 400 g de feijão-verde e temperar no fim com um fio de azeite.'},
    {key:'ervilhas',name:'ervilhas e cenoura',terms:['ervilhas','cenoura'],ingredients:[['Ervilhas','250 g'],['Cenoura','2']],step:'Cozer ou saltear 250 g de ervilhas com 2 cenouras em cubos; manter o tempero suave.'},
    {key:'salada-verde',name:'salada verde simples',terms:['alface','salada','pepino'],ingredients:[['Alface ou mistura verde','1 embalagem'],['Pepino','1']],step:'Preparar uma salada simples e temperar apenas no momento de servir.'}
  ]
};
function recipeFoodText(r){return normalize(`${r.name||''} ${(r.ingredients||[]).map(x=>Array.isArray(x)?x[0]:x).join(' ')}`)}
function hasAny(text,terms){return terms.some(t=>text.includes(normalize(t)))}
function hashText(x){let h=0;for(const c of String(x||''))h=((h<<5)-h+c.charCodeAt(0))|0;return Math.abs(h)}
function sideFitScore(o,r,used,index){
  let score=0;const have=availableTokens();
  if(o.terms.some(t=>have.some(h=>ingredientMatches(t,h))))score+=55;
  if(!used.has(o.key))score+=16;else score-=24;
  if((r.methods||[]).includes('oven')&&o.key==='batata-forno')score+=7;
  if(state.time<=30&&['cuscuz','salada-tomate','salada-verde','courgette','brocolos'].includes(o.key))score+=7;
  score+=((hashText(r.name+o.key+state.generationRound+index)%11)/10);
  return score;
}
function pickMealSide(kind,r,used,index){
  return [...mealSides[kind]].sort((a,b)=>sideFitScore(b,r,used,index)-sideFitScore(a,r,used,index))[0];
}
function completeMeal(r,usedStarch,usedVeg,index){
  const text=recipeFoodText(r);
  const carbTerms=['arroz','batata','massa','esparguete','cuscuz','quinoa','bulgur','pão','pao','polenta','feijão','feijao','grão','grao','lentilha'];
  const vegTerms=['brocol','tomate','courgette','cenoura','ervilha','feijão-verde','feijao-verde','espinafre','salada','alface','pepino','pimento','couve','beringela','legume'];
  const hasStarch=hasAny(text,carbTerms),hasVeg=hasAny(text,vegTerms);
  const additions=[];
  if(!hasStarch){const x=pickMealSide('starch',r,usedStarch,index);if(x){usedStarch.add(x.key);additions.push(x)}}
  if(!hasVeg){const x=pickMealSide('veg',r,usedVeg,index);if(x){usedVeg.add(x.key);additions.push(x)}}
  const sourceSide=(r.side||'').trim();
  if(!additions.length){
    return {...r,meal:{completeFromSource:true,additions:[],label:'A receita já funciona como refeição completa.'},side:'Refeição completa — acompanhamento já integrado na receita'};
  }
  const names=additions.map(x=>x.name);
  return {...r,meal:{completeFromSource:false,additions,label:`Completar com ${names.join(' + ')}`},side:`Completar com ${names.join(' + ')}`,sourceSide};
}
function composeCompleteMeals(rows){
  const usedStarch=new Set(),usedVeg=new Set();
  return rows.map((r,i)=>completeMeal(r,usedStarch,usedVeg,i));
}

async function generate(){
  if(state.isGenerating) return;
  state.isGenerating=true;
  state.generationRound+=1; store.set('generationRound',state.generationRound);
  const button=$('#suggestBtn');
  const otherButtons=[...document.querySelectorAll('[data-more]')];
  if(button){button.disabled=true;button.textContent='A procurar…'}
  otherButtons.forEach(b=>{b.disabled=true;b.textContent='A procurar…'});
  const host=$('#suggestions');
  if(host)host.innerHTML=`<section class="card loading-card"><span class="spinner"></span><div class="loading-copy"><b>A procurar na web</b><small>Primeiro cozinha portuguesa; depois mediterrânica. Sem sugestões fora do perfil só para preencher espaço.</small></div></section>`;

  try{
    // 1) Retrieval-first: receitas reais da Internet são a fonte principal.
    if(navigator.onLine && window.LumeRetrieval){
      try{
        setAIStatus('busy');
        const recipes=await window.LumeRetrieval.suggest(buildAIInput());
        if(recipes.length>=1){
          // The retrieval engine now returns the complete 3 PT + 1 Mediterranean + 1 Family mix.
          // Missing web slots are composed deterministically from the recipes actually researched,
          // never filled with unrelated generic templates while online.
          let picked=recipes.slice(0,5).map(r=>({...r,id:uid()}));
          if(picked.length<5){
            const q=normalize(state.protein);
            const matched=db.filter(r=>r.keys.some(k=>q.includes(normalize(k))||normalize(k).includes(q)));
            const localPool=[...matched,...genericRecipes(state.protein)].map(r=>({...r,source:r.source||'local'}));
            picked=composeLocalFive([...picked,...localPool]).slice(0,5).map(r=>r.id?r:{...r,id:uid()});
          }
          state.suggestions=composeCompleteMeals(picked);
          state.suggestionHistory.push(...state.suggestions.map(r=>r.name));
          state.suggestionHistory=state.suggestionHistory.slice(-60); store.set('suggestionHistory',state.suggestionHistory);
          setAIStatus(recipes.length>=5?'retrieval':'hybrid');
          renderSuggestions();
          return;
        }
      }catch(err){
        console.warn('Lume retrieval fallback:',err);
      }
    }

    // 2) Só usar fallback local quando a pesquisa web não devolveu nenhuma receita completa.
    // Nunca fingir que uma sugestão local é uma receita recuperada da Internet.
    toast(navigator.onLine?'As fontes não devolveram receitas completas agora. Vou usar alternativas locais, sem as apresentar como receitas da web.':'Sem ligação. Vou usar alternativas locais.');
    setAIStatus('local');
    const q=normalize(state.protein);
    const matched=db.filter(r=>r.keys.some(k=>q.includes(normalize(k))||normalize(k).includes(q)));
    let pool=[...matched,...genericRecipes(state.protein)];
    const recent=new Set(state.suggestionHistory.slice(-9).map(normalize));
    let fresh=pool.filter(r=>!recent.has(normalize(r.name)));
    if(fresh.length<5){
      const oldestFirst=[...pool].sort((a,b)=>state.suggestionHistory.indexOf(a.name)-state.suggestionHistory.indexOf(b.name));
      fresh=[...fresh,...oldestFirst.filter(r=>!fresh.some(x=>normalize(x.name)===normalize(r.name)))];
    }
    const offset=state.generationRound % Math.max(fresh.length,1);
    fresh=[...fresh.slice(offset),...fresh.slice(0,offset)];
    state.suggestions=composeCompleteMeals(composeLocalFive(fresh.sort((a,b)=>scoreRecipe(b)-scoreRecipe(a))).map(r=>({...r,id:uid(),source:'local'})));
    state.suggestionHistory.push(...state.suggestions.map(r=>r.name));
    state.suggestionHistory=state.suggestionHistory.slice(-60); store.set('suggestionHistory',state.suggestionHistory);
    renderSuggestions();
  } finally {
    state.isGenerating=false;
    const current=$('#suggestBtn');
    if(current){current.disabled=false;current.textContent='Dar-me 5 ideias'}
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
    <section class="hero home-hero"><div class="eyebrow">Hoje cozinhamos?</div><h1>O que há para o jantar?</h1><p class="sub">Diz-me o que tens em casa. O Lume encontra cinco boas ideias para pôr toda a gente à mesa.</p></section>
    ${state.currentMeal?`<section class="card current-meal"><div><div class="eyebrow">Escolhida para hoje</div><h3>${esc(state.currentMeal.recipe.name)}</h3><p class="sub">${esc(state.currentMeal.recipe.side)}</p></div><button id="resumeMeal" class="primary small">Abrir</button></section>`:''}
    <section class="card">
      <label class="label">Proteína principal</label>
      <input id="protein" class="field" placeholder="Ex.: bifes de peru, salmão, frango…" value="${esc(state.protein)}" />
      <div class="chips" style="margin-top:10px">
        ${[['Bifes de peru','🥩 Bifes de peru'],['Frango','🍗 Frango'],['Salmão','🐟 Salmão'],['Carne picada','🍝 Carne picada'],['Ovos','🍳 Ovos']].map(([v,l])=>`<button class="chip quick-protein" data-protein="${v}">${l}</button>`).join('')}
      </div>
      <label class="label">O que mais existe em casa? <span style="font-weight:500;color:var(--muted)">(opcional)</span></label>
      <textarea id="ingredients" class="field" placeholder="Ex.: courgette, arroz, tomate, iogurte…">${esc(state.ingredients)}</textarea>
      <label class="label">Quanto tempo tens?</label>
      <div class="chips" id="timeChips">${[15,30,45,60].map(t=>`<button class="chip ${state.time===t?'active':''}" data-time="${t}">${t===60?'Sem pressa':t+' min'}</button>`).join('')}</div>
      <label class="label">Hoje quero</label>
      <div class="grid">
        <button class="choice ${state.effort==='simple'?'selected':''}" data-effort="simple"><b>⚡ Simples</b><small>Poucos passos, pouca loiça</small></button>
        <button class="choice ${state.effort==='normal'?'selected':''}" data-effort="normal"><b>🍳 Normal</b><small>Posso cozinhar um pouco mais</small></button>
      </div>
      <label class="label">Como queres cozinhar?</label>
      <div class="chips">${[['any','✨ Tanto faz'],['pan','🍳 Frigideira'],['oven','🔥 Forno'],['grill','♨️ Grelhador'],['airfryer','💨 Air fryer']].map(([v,l])=>`<button class="chip ${state.method===v?'active':''}" data-method="${v}">${l}</button>`).join('')}</div>
      <div class="photo-zone" style="margin-top:16px"><div class="photo-row"><span class="camera-glyph">⌾</span><div class="photo-copy"><b>Fotografar o frigorífico</b><p class="sub" style="font-size:12px;margin-top:3px">A pesquisa usa o texto. Se ligares IA, a fotografia também pode identificar ingredientes visíveis.</p></div><button id="photoBtn" class="ghost small">Adicionar</button></div>${state.photo?`<img class="photo-preview" src="${state.photo}" alt="Fotografia do frigorífico" />`:''}</div>
      <div class="btn-row"><button id="suggestBtn" class="primary full">Dar-me 5 ideias</button></div>
    </section>
    <section id="suggestions"></section>`;

  if($('#resumeMeal'))$('#resumeMeal').onclick=()=>openRecipe(state.currentMeal.recipe.id,true);
  $('#protein').addEventListener('input',e=>state.protein=e.target.value);
  $('#ingredients').addEventListener('input',e=>state.ingredients=e.target.value);
  document.querySelectorAll('.quick-protein').forEach(b=>b.onclick=()=>{const v=b.dataset.protein||b.textContent;$('#protein').value=v;state.protein=v});
  document.querySelectorAll('[data-time]').forEach(b=>b.onclick=()=>{state.time=+b.dataset.time;renderToday()});
  document.querySelectorAll('[data-effort]').forEach(b=>b.onclick=()=>{state.effort=b.dataset.effort;renderToday()});
  document.querySelectorAll('[data-method]').forEach(b=>b.onclick=()=>{state.method=b.dataset.method;renderToday()});
  $('#photoBtn').onclick=()=>$('#photoInput').click();
  $('#suggestBtn').onclick=()=>{if(!state.protein.trim())return toast('Indica primeiro a proteína principal.');generate()};
  if(state.suggestions.length)renderSuggestions();
}

function renderSuggestions(){
  const host=$('#suggestions'); if(!host)return;
  host.innerHTML=`<section class="hero" style="padding-top:22px"><div class="eyebrow">Cinco possibilidades</div><h2>Escolhe a que vos apetece.</h2></section>`+state.suggestions.map((r,i)=>recipeCard(r,i)).join('');
  host.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openRecipe(b.dataset.open));
  host.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{const r=state.suggestions.find(x=>x.id===b.dataset.pick);if(r)chooseRecipe(r)});
  host.querySelectorAll('[data-more]').forEach(b=>b.onclick=()=>generate());
  host.scrollIntoView({behavior:'smooth',block:'start'});
}

function recipeCard(r,i){
  const isReal=(r.source==='web'||r.source==='retrieved'||r.source==='direct');
  const source=isReal?`Receita real · ${esc(r.sourceName||'fonte portuguesa')}`:(r.source==='composed'?'Criação Lume · baseada nas receitas pesquisadas':(r.source==='ai'?'Adaptada pela IA do Lume':'Sugestão local do Lume'));
  const cov=r.availableIngredientCount?{matched:r.matchedIngredients||0,total:r.availableIngredientCount,ratio:r.ingredientCoverage||0}:localIngredientCoverage(r);
  const match=cov.matched>0?` · usa ${cov.matched}/${cov.total} do que tens`:'';
  const useBadge=cov.total&&cov.ratio>=0.6?`<span class="pill use-home-badge">Bom aproveitamento</span>`:'';
  const repeat=repeatNote(r);
  const adaptation=smartAdaptation(r);
  const adaptBadge=adaptation.available?`<span class="pill adapt-home-badge">Adaptável ao que tens</span>`:'';
  return `<article class="card recipe-card">${r.image?`<img class="recipe-image" src="${esc(r.image)}" alt="${esc(r.name)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()" />`:''}<span class="recipe-number">IDEIA 0${i+1}</span><h3>${esc(r.name)}</h3><p class="sub">${esc(r.side)}</p><div class="recipe-meta"><span class="pill">${r.time?`≈ ${r.time} min`:'Tempo não indicado'}</span><span class="pill">${r.effort==='simple'?'Simples':'Normal'}</span><span class="pill">${esc(r.suggestionType||r.style)}</span>${useBadge}${adaptBadge}</div>${repeat?`<div class="memory-note">↻ ${esc(repeat)}</div>`:''}<div class="recipe-actions"><button class="primary" data-pick="${r.id}">Vou fazer esta</button><button class="ghost" data-open="${r.id}">Ver receita</button><button class="ghost" data-more="1">Outras ideias</button></div><div class="source-note">${source}${match}</div></article>`
}

function openRecipe(id,chosen=false){
  const r=state.suggestions.find(x=>x.id===id)||state.favorites.find(x=>x.id===id)?.recipe||state.history.find(x=>x.recipe.id===id)?.recipe||state.currentMeal?.recipe;
  if(!r)return;
  const isChosen=chosen || normalize(state.currentMeal?.recipe?.name)===normalize(r.name);
  state.selected=r;
  const have=availableTokens();
  const matchedCount=r.ingredients.filter(([a])=>ingredientStatus(a)==='have').length;
  app.innerHTML=`<button id="backToday" class="ghost small">← Voltar</button><section class="hero">${r.image?`<img class="detail-image" src="${esc(r.image)}" alt="${esc(r.name)}" referrerpolicy="no-referrer" onerror="this.remove()" />`:''}<div class="eyebrow">${isChosen?'Jantar de hoje':'Receita'}</div><h1>${esc(r.name)}</h1><p class="sub">${esc(r.side)}</p><div class="recipe-meta"><span class="pill">${r.time?`${r.time} min`:'Tempo não indicado'}</span><span class="pill">Refeição completa</span><span class="pill">${esc(r.suggestionType||r.style)}</span></div>${isChosen?`<div class="chosen-banner">✓ Escolhida para hoje</div>`:''}</section>
  ${(()=>{const a=smartAdaptation(r);if(!a.available)return'';return `<section class="card smart-adaptation"><div class="eyebrow">Adaptada ao que tens · Lume</div><h3>Podes fazê-la sem ir às compras</h3><p class="sub">Mantemos a estrutura da receita e trocamos apenas ingredientes compatíveis que disseste ter em casa.</p><div class="adaptation-swaps">${a.changes.map(c=>`<div class="swap-row"><span>${esc(c.from)}</span><b>→</b><strong>${esc(c.to)}</strong></div>`).join('')}</div><div class="divider"></div><h3>Ingredientes adaptados</h3><ul class="ingredients">${a.ingredients.map(([x,q])=>`<li class="${ingredientStatus(x)==='have'?'have':''}"><span>${ingredientStatus(x)==='have'?'<i>✓</i> ':''}${esc(x)}</span><b>${esc(q)}</b></li>`).join('')}</ul><h3 class="adapted-steps-title">Preparação adaptada</h3><ol class="steps compact-steps">${a.steps.map((step,i)=>`<li><span class="step-n">${i+1}</span><span>${esc(step)}</span></li>`).join('')}</ol><div class="source-note">Esta adaptação é proposta pelo Lume. A receita original da fonte permanece abaixo, sem alterações.</div></section>`})()}
  ${r.source==='composed'&&r.inspiredBy?.length?`<section class="card research-basis"><div class="eyebrow">Como nasceu esta ideia</div><h3>Composição Lume baseada em pesquisa real</h3><p class="sub">O Lume combinou os ingredientes que tens com padrões de cozinha portuguesa/mediterrânica encontrados nas receitas abaixo. Não atribuímos esta composição a nenhuma fonte individual.</p>${r.inspiredBy.map(x=>`<div class="source-inspiration"><strong>${esc(x.name)}</strong><span>${esc(x.sourceName||'Fonte')}</span>${x.sourceUrl?`<a href="${esc(x.sourceUrl)}" target="_blank" rel="noopener noreferrer">Ver inspiração</a>`:''}</div>`).join('')}</section>`:''}
  <section class="card original-recipe"><div class="section-head"><div><div class="eyebrow">${r.source==='composed'?'Receita composta pelo Lume':'Receita original'}</div><h3>Ingredientes</h3></div>${have.length?`<span class="match-badge">${matchedCount} encontrados em casa</span>`:''}</div><ul class="ingredients">${r.ingredients.map(([a,b])=>`<li class="${ingredientStatus(a)}"><span>${ingredientStatus(a)==='have'?'<i>✓</i> ':''}${esc(a)}</span><b>${esc(b)}</b></li>`).join('')}</ul>${state.ingredients?`<div class="adapt" style="margin-top:14px">Em casa indicaste: <b>${esc(state.ingredients)}</b>. O Lume usa estes ingredientes no ranking e, quando existe uma troca culinariamente compatível, mostra acima uma versão adaptada.</div>`:''}</section>
  ${(()=>{const c=r.availableIngredientCount?{matched:r.matchedIngredients||0,total:r.availableIngredientCount,ratio:r.ingredientCoverage||0}:localIngredientCoverage(r);return c.total?`<section class="card home-use-card"><div class="eyebrow">Aproveitamento do que tens</div><h3>${c.matched} de ${c.total} ingredientes indicados</h3><p class="sub">O Lume cruza os ingredientes disponíveis com a proteína, o tempo e o método escolhidos e favorece receitas que aproveitem mais do que já existe em casa.</p></section>`:''})()}
  ${r.meal?.additions?.length?`<section class="card meal-composer"><div class="eyebrow">Refeição completa · sugestão Lume</div><h3>Para acompanhar</h3><p class="sub">${esc(r.meal.label)}</p><ul class="ingredients meal-side-ingredients">${r.meal.additions.flatMap(x=>x.ingredients||[]).map(([a,b])=>`<li class="${ingredientStatus(a)}"><span>${ingredientStatus(a)==='have'?'<i>✓</i> ':''}${esc(a)}</span><b>${esc(b)}</b></li>`).join('')}</ul><ol class="steps compact-steps">${r.meal.additions.map((x,i)=>`<li><span class="step-n">${i+1}</span><span>${esc(x.step)}</span></li>`).join('')}</ol><div class="source-note">O acompanhamento é composto pelo Lume; a receita principal mantém-se fiel à fonte original.</div></section>`:''}
  <section class="card"><div class="eyebrow">Passo a passo · receita original</div><h3>Como fazer</h3><ol class="steps">${r.steps.map((s,i)=>`<li><span class="step-n">${i+1}</span><span>${esc(s)}</span></li>`).join('')}</ol>${r.adapt?.length?`<div class="divider"></div><h3>Se faltar alguma coisa</h3>${r.adapt.map(a=>`<div class="adapt" style="margin-top:8px">${esc(a)}</div>`).join('')}`:''}</section>
  ${(r.source==='web'||r.source==='retrieved'||r.source==='direct')&&r.sourceUrl?`<section class="card source-card"><div><div class="eyebrow">Fonte original</div><h3>${esc(r.sourceName||'Receita na Internet')}</h3><p class="sub">Receita recuperada da fonte original e selecionada segundo o contexto da família.</p></div><a class="ghost source-link" href="${esc(r.sourceUrl)}" target="_blank" rel="noopener noreferrer">Abrir fonte ↗</a></section>`:''}
  ${isChosen?`<section class="card dinner-feedback"><div class="eyebrow">Depois da refeição</div><h3>Como correu cá em casa?</h3><p class="sub">Esta resposta altera as próximas sugestões do Lume.</p><div class="feedback">${[[4,'😍','Adorámos'],[3,'🙂','Gostámos'],[2,'😐','Assim-assim'],[1,'👎','Não repetir']].map(([v,e,l])=>`<button data-rate="${v}">${e}<small>${l}</small></button>`).join('')}</div><div id="audienceFeedback" class="audience-feedback hidden"><p>Quem gostou?</p><div class="grid"><button class="choice selected" data-audience="children"><b>Crianças</b><small>Sim</small></button><button class="choice selected" data-audience="adults"><b>Adultos</b><small>Sim</small></button></div><button id="saveDinnerFeedback" class="primary full">Guardar avaliação</button></div></section>`:`<button id="chooseFromDetail" class="primary full sticky-action">Vou fazer esta</button>`}`;
  $('#backToday').onclick=()=>route('today');
  if(!isChosen) $('#chooseFromDetail').onclick=()=>chooseRecipe(r);
  let pendingRating=null, childrenLiked=true, adultsLiked=true;
  document.querySelectorAll('[data-rate]').forEach(b=>b.onclick=()=>{pendingRating=+b.dataset.rate;document.querySelectorAll('[data-rate]').forEach(x=>x.classList.toggle('selected',x===b));$('#audienceFeedback')?.classList.remove('hidden')});
  document.querySelectorAll('[data-audience]').forEach(b=>b.onclick=()=>{const on=!b.classList.contains('selected');b.classList.toggle('selected',on);b.querySelector('small').textContent=on?'Sim':'Não';if(b.dataset.audience==='children')childrenLiked=on;else adultsLiked=on});
  const save=$('#saveDinnerFeedback');if(save)save.onclick=()=>{if(!pendingRating)return toast('Escolhe primeiro como correu o jantar.');saveFeedback(r,pendingRating,{childrenLiked,adultsLiked})};
}

function saveFeedback(recipe,rating,detail={}){
  const chosenAt=state.currentMeal?.chosenAt||new Date().toISOString();
  const entry={id:uid(),date:new Date().toISOString(),chosenAt,rating,childrenLiked:detail.childrenLiked??null,adultsLiked:detail.adultsLiked??null,recipe:{...recipe},protein:state.currentMeal?.protein||state.protein,context:state.currentMeal?.context||null};
  state.history.unshift(entry);store.set('history',state.history);
  if(rating===4&&!state.favorites.some(f=>normalize(f.recipe.name)===normalize(recipe.name))){
    state.favorites.unshift({id:uid(),added:new Date().toISOString(),recipe:{...recipe}});store.set('favorites',state.favorites);toast('Entrou nas Favoritas da Família ♥');
  } else toast('Avaliação guardada. As próximas sugestões vão ter isto em conta.');
  state.currentMeal=null;store.set('currentMeal',null);
  setTimeout(()=>route('today'),650);
}

function renderFavorites(){
  app.innerHTML=`<section class="hero"><div class="eyebrow">Da vossa casa</div><h1>Favoritas da Família</h1><p class="sub">As receitas que receberam “Adorámos”.</p></section>${state.favorites.length?state.favorites.map(f=>`<section class="card list-card"><div class="content"><h3>${esc(f.recipe.name)}</h3><p>${esc(f.recipe.side)} · ${f.recipe.time} min</p><button class="ghost small" data-favopen="${f.id}">Abrir receita</button></div><button class="heart" data-removefav="${f.id}">♥</button></section>`).join(''):`<div class="card empty">Ainda não há favoritas. As receitas classificadas com 😍 aparecem aqui.</div>`}`;
  document.querySelectorAll('[data-favopen]').forEach(b=>b.onclick=()=>{const f=state.favorites.find(x=>x.id===b.dataset.favopen);state.suggestions=[f.recipe];openRecipe(f.recipe.id)});
  document.querySelectorAll('[data-removefav]').forEach(b=>b.onclick=()=>{state.favorites=state.favorites.filter(x=>x.id!==b.dataset.removefav);store.set('favorites',state.favorites);renderFavorites()});
}

function renderHistory(){
  const labels={4:'😍 Adorámos',3:'🙂 Gostámos',2:'😐 Assim-assim',1:'👎 Não repetir'};
  app.innerHTML=`<section class="hero"><div class="eyebrow">Memória</div><h1>Histórico</h1><p class="sub">O que cozinharam e como a família reagiu.</p></section>${state.history.length?state.history.map(h=>`<section class="card list-card"><div class="content"><h3>${esc(h.recipe.name)}</h3><p>${new Date(h.date).toLocaleDateString('pt-PT')} · ${esc(h.recipe.side)}${h.childrenLiked===false?' · crianças não gostaram':''}${h.adultsLiked===false?' · adultos não gostaram':''}</p></div><span class="badge">${labels[h.rating]}</span></section>`).join(''):`<div class="card empty">O histórico começa depois da primeira refeição avaliada.</div>`}`;
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

// v0.13 — short visual identity moment on launch. No sound.
const splash=$('#splash');
if(splash){
  const reduceMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  window.setTimeout(()=>splash.classList.add('hide'),reduceMotion?650:1450);
  window.setTimeout(()=>splash.remove(),reduceMotion?1100:2000);
}
render();
setAIStatus(navigator.onLine&&window.LumeRetrieval?'retrieval':(window.LumeAI?.isConfigured()?'online':'local'));
