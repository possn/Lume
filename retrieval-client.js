(function(){
  const MEALDB='https://www.themealdb.com/api/json/v1/1';

  const ALIASES=[
    [/\b(peru|bifes? de peru|peito de peru)\b/i,'turkey'],
    [/\b(frango|peito de frango|coxas? de frango)\b/i,'chicken'],
    [/\b(salm[aã]o)\b/i,'salmon'],
    [/\b(bacalhau|pescada|peixe branco|peixe)\b/i,'cod'],
    [/\b(atum)\b/i,'tuna'],
    [/\b(camar[aã]o|gambas?)\b/i,'prawns'],
    [/\b(vaca|carne de vaca|carne picada|hamb[uú]rguer)\b/i,'beef'],
    [/\b(porco|lombo|bifanas?)\b/i,'pork'],
    [/\b(borrego|cordeiro)\b/i,'lamb'],
    [/\b(ovos?|omelete)\b/i,'egg']
  ];

  function endpoint(){
    return (window.LUME_CONFIG?.RETRIEVAL_ENDPOINT||'').replace(/\/$/,'');
  }

  async function postJSON(url,payload,timeout=18000){
    const ctl=new AbortController();
    const timer=setTimeout(()=>ctl.abort(),timeout);
    try{
      const r=await fetch(url,{method:'POST',signal:ctl.signal,headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(payload)});
      if(!r.ok)throw new Error(`RETRIEVAL_HTTP_${r.status}`);
      return await r.json();
    } finally {clearTimeout(timer)}
  }

  async function getJSON(url,timeout=9000){
    const ctl=new AbortController();
    const timer=setTimeout(()=>ctl.abort(),timeout);
    try{
      const r=await fetch(url,{signal:ctl.signal,headers:{'Accept':'application/json'}});
      if(!r.ok)throw new Error(`RETRIEVAL_HTTP_${r.status}`);
      return await r.json();
    } finally {clearTimeout(timer)}
  }

  function ingredientFor(text){
    const q=(text||'').trim();
    const hit=ALIASES.find(([re])=>re.test(q));
    return hit?hit[1]:q.toLowerCase().replace(/\s+/g,'_');
  }

  function normalizeWebRecipe(r){
    return {
      externalId:r.externalId||r.sourceUrl||r.name,
      name:r.name||'Receita encontrada',
      originalName:r.name||'',
      style:r.style||'Receita da web',
      time:Number(r.time)||35,
      effort:r.effort==='normal'?'normal':'simple',
      methods:Array.isArray(r.methods)&&r.methods.length?r.methods:['pan','oven'],
      side:r.side||'O Lume encontrou esta receita na web',
      ingredients:Array.isArray(r.ingredients)?r.ingredients:[],
      steps:Array.isArray(r.steps)&&r.steps.length?r.steps:['Consulta a fonte original para seguir a preparação completa.'],
      adapt:Array.isArray(r.adapt)?r.adapt:[],
      image:r.image||'',
      source:'web',
      sourceName:r.sourceName||'Web',
      sourceUrl:r.sourceUrl||'',
      sourceDescription:r.sourceDescription||''
    };
  }

  async function suggestFromWeb(input){
    const base=endpoint();
    if(!base)throw new Error('WEB_RETRIEVAL_NOT_CONFIGURED');
    const data=await postJSON(`${base}/v1/retrieve`,input,window.LUME_CONFIG?.RETRIEVAL_TIMEOUT_MS||22000);
    const recipes=Array.isArray(data?.recipes)?data.recipes.map(normalizeWebRecipe):[];
    if(recipes.length<3)throw new Error('WEB_RETRIEVAL_TOO_FEW_RESULTS');
    return recipes.slice(0,3);
  }

  // TheMealDB remains only as a no-key fallback when the web search gateway is unavailable.
  function mealIngredients(meal){
    const out=[];
    for(let i=1;i<=20;i++){
      const name=(meal[`strIngredient${i}`]||'').trim();
      const amount=(meal[`strMeasure${i}`]||'').trim();
      if(name)out.push([name,amount||'q.b.']);
    }
    return out;
  }
  function inferMethods(meal){
    const text=`${meal.strMeal||''} ${meal.strInstructions||''}`.toLowerCase();
    const methods=[];
    if(/oven|bake|roast/.test(text))methods.push('oven');
    if(/grill|barbecue|bbq/.test(text))methods.push('grill');
    if(/fry|pan|skillet|saut/.test(text))methods.push('pan');
    if(/air\s*fry/.test(text))methods.push('airfryer');
    return methods.length?methods:['pan','oven'];
  }
  function inferTime(meal){
    const text=(meal.strInstructions||'').toLowerCase();
    const mins=[...text.matchAll(/(\d{1,3})\s*(?:minutes?|mins?)/g)].map(m=>Number(m[1])).filter(n=>n>0&&n<240);
    if(mins.length)return Math.min(90,Math.max(15,mins.reduce((a,b)=>a+b,0)));
    return /slow|simmer|roast/.test(text)?45:35;
  }
  function splitSteps(text){
    const clean=(text||'').replace(/\r/g,'\n').replace(/\n{2,}/g,'\n').trim();
    let parts=clean.split(/\n+/).map(s=>s.trim()).filter(Boolean);
    if(parts.length<2)parts=clean.split(/(?<=[.!?])\s+(?=[A-Z])/).map(s=>s.trim()).filter(Boolean);
    return parts.slice(0,10);
  }
  function toMealRecipe(meal){
    return {
      externalId:meal.idMeal,name:meal.strMeal||'Receita',originalName:meal.strMeal||'',style:meal.strArea||meal.strCategory||'Receita real',
      time:inferTime(meal),effort:(meal.strInstructions||'').length>900?'normal':'simple',methods:inferMethods(meal),
      side:'Receita completa da fonte original',ingredients:mealIngredients(meal),steps:splitSteps(meal.strInstructions),
      adapt:['Se faltar um ingrediente secundário, usa um equivalente que tenhas em casa.'],image:meal.strMealThumb||'',source:'retrieved',
      sourceName:'TheMealDB · fallback',sourceUrl:meal.strSource||meal.strYoutube||`https://www.themealdb.com/meal/${meal.idMeal}`
    };
  }
  async function suggestFromMealDB(input){
    const ingredient=ingredientFor(input.protein);
    const filter=await getJSON(`${MEALDB}/filter.php?i=${encodeURIComponent(ingredient)}`);
    let candidates=Array.isArray(filter.meals)?filter.meals:[];
    if(!candidates.length){
      const search=await getJSON(`${MEALDB}/search.php?s=${encodeURIComponent(ingredient.replace(/_/g,' '))}`);
      candidates=Array.isArray(search.meals)?search.meals:[];
    }
    if(!candidates.length)throw new Error('MEALDB_NO_RESULTS');
    const avoid=new Set((input.avoidRecipes||[]).map(x=>String(x).toLowerCase()));
    let pool=candidates.filter(m=>!avoid.has(String(m.strMeal||'').toLowerCase()));
    if(pool.length<3)pool=candidates;
    const seed=Number(input.variationSeed||0);
    pool=pool.slice().sort((a,b)=>((Number(a.idMeal||0)+seed*37)%997)-((Number(b.idMeal||0)+seed*37)%997));
    const full=(await Promise.all(pool.slice(0,9).map(async m=>{
      try{const d=await getJSON(`${MEALDB}/lookup.php?i=${encodeURIComponent(m.idMeal)}`);return d.meals?.[0]||null}catch{return null}
    }))).filter(Boolean).map(toMealRecipe);
    if(full.length<3)throw new Error('MEALDB_TOO_FEW_RESULTS');
    return full.slice(0,3);
  }

  async function suggest(input){
    try{return await suggestFromWeb(input)}
    catch(err){
      console.warn('Lume web retrieval fallback:',err);
      return suggestFromMealDB(input);
    }
  }

  window.LumeRetrieval={suggest,ingredientFor,isWebConfigured:()=>!!endpoint()};
})();
