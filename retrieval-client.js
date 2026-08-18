(function(){
  const strip=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/&#8211;|&ndash;/g,'–').replace(/&#8217;|&rsquo;/g,"'").replace(/&quot;/g,'"').replace(/&#8230;|&hellip;/g,'…').replace(/\s+/g,' ').trim();
  const norm=s=>strip(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const stop=new Set(['com','sem','uma','umas','uns','para','que','dos','das','por','nos','nas','aos','aquelas','esta','este','isto','receita','receitas','facil','fácil','rapida','rapido','rápida','rápido']);
  const tokens=s=>norm(s).split(/[^a-z0-9]+/).filter(x=>x.length>2&&!stop.has(x));
  const unique=a=>[...new Set(a.filter(Boolean))];

  const BAD_CUISINE=/\b(kentucky|kfc|tex[- ]?mex|mexican|mexicano|indian|indiano|chinese|chines|thai|tailandes|japanese|japones|korean|coreano|cajun|buffalo|teriyaki|tikka|ramen|taco|burrito|poke|sushi)\b/i;
  const COLLECTION=/\b(\d+\s+(?:receitas|ideias|formas|maneiras|pratos|jantares)|receitas\s+(?:de|com|para)\s+.+\b(?:rápidas?|rapidas?|fáceis?|faceis?|ideias?|jantares?)|especial\s*:\s*receitas|menu(?:s)?\b|cole[cç][aã]o|ideias\s+(?:de|para)|jantares\s+(?:de|para)|melhores\s+receitas|sele[cç][aã]o\s+de|semana\s+de|inspire-se|sugest[oõ]es)\b/i;
  const METHOD_WORDS={
    oven:['forno','assado','assada','assar','tabuleiro'],
    pan:['frigideira','salteado','salteada','saltear','frito','frita','fritar','estufado','estufada','estufar','tacho'],
    grill:['grelhado','grelhada','grelhar','grelhador','chapa'],
    airfryer:['air fryer','airfryer','fritadeira de ar','fritadeira sem oleo']
  };

  function proteinTerms(p){
    const n=norm(p);
    const map=[
      [/\b(peru|bife.*peru|peito.*peru)\b/,['peru']],
      [/\b(frango|peito.*frango|coxa.*frango)\b/,['frango','galinha']],
      [/\b(porco|lombo|bifana)\b/,['porco','lombo','bifana']],
      [/\b(vaca|novilho|bife.*vaca)\b/,['vaca','novilho','bife']],
      [/\b(salmao)\b/,['salmao']],
      [/\b(pescada)\b/,['pescada']],
      [/\b(bacalhau)\b/,['bacalhau']],
      [/\b(atum)\b/,['atum']],
      [/\b(ovos?|ovo)\b/,['ovo','ovos']]
    ];
    for(const [re,arr] of map) if(re.test(n)) return arr;
    return tokens(p).slice(0,3);
  }

  function ingredientsFromInput(input){
    return unique(String(input.availableIngredients||'').split(/[,;\n]+/).flatMap(x=>tokens(x)).filter(x=>x.length>2)).slice(0,10);
  }

  async function fetchJSON(url,ms=8500){
    const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);
    try{
      const r=await fetch(url,{signal:c.signal,mode:'cors',cache:'no-store',headers:{Accept:'application/json'}});
      if(!r.ok)throw new Error(`HTTP_${r.status}`);
      return await r.json();
    } finally { clearTimeout(t); }
  }

  function queryPlan(input){
    const p=(input.protein||'').trim();
    const have=ingredientsFromInput(input);
    const seed=Math.abs(Number(input.variationSeed)||0);
    const method={oven:'forno',pan:'frigideira',grill:'grelhado',airfryer:'air fryer',any:''}[input.method]||'';
    const ingredientPairs=[];
    if(have.length){
      ingredientPairs.push(have.slice(0,2).join(' '));
      if(have.length>2) ingredientPairs.push(have.slice(2,4).join(' '));
      if(have.length>4) ingredientPairs.push(have.slice(4,6).join(' '));
    }
    const q=[
      `${p} ${ingredientPairs[0]||''} ${method}`,
      `${p} ${ingredientPairs[1]||ingredientPairs[0]||''}`,
      `${p} ${method}`,
      `${p} portuguesa`,
      `${p} mediterrânica`,
      `${p} ${ingredientPairs[2]||ingredientPairs[0]||''}`,
      `${p} jantar`,
      `${p}`
    ].map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean);
    const rot=seed%q.length;
    return unique([...q.slice(rot),...q.slice(0,rot)]);
  }

  function parseMinutes(text){
    const n=norm(text),vals=[];
    const re=/(?:tempo\s*(?:total|de\s*preparacao|de\s*confeccao)?|preparacao|confeccao|cozedura|duracao)\s*[:\-]?\s*(?:(\d+)\s*h(?:oras?)?\s*)?(\d+)?\s*(?:min|minutos?)/g;
    let m;while((m=re.exec(n))){const v=(Number(m[1]||0)*60)+Number(m[2]||0);if(v>0&&v<480)vals.push(v)}
    if(vals.length)return Math.max(...vals);
    const simple=n.match(/\b(\d{1,3})\s*(?:min|minutos?)\b/);return simple?Number(simple[1]):null;
  }

  function htmlToSections(html){
    const doc=new DOMParser().parseFromString(html||'','text/html');
    doc.querySelectorAll('script,style,noscript,iframe,form,nav,aside,footer').forEach(x=>x.remove());
    const headings=[...doc.querySelectorAll('h2,h3,h4,strong,b')];
    const findHeading=words=>headings.find(h=>words.some(w=>norm(h.textContent).includes(w)));
    function followingItems(h,max=30){
      if(!h)return[];let node=h;const out=[];
      for(let i=0;i<16;i++){
        node=node.nextElementSibling;if(!node)break;if(/^H[234]$/.test(node.tagName))break;
        const lis=[...(node.querySelectorAll?.('li')||[])].map(x=>strip(x.textContent)).filter(Boolean);
        if(lis.length)out.push(...lis);else if(node.matches?.('p')){const t=strip(node.textContent);if(t.length>15)out.push(t)}
        if(out.length>=max)break;
      }
      return out.slice(0,max);
    }
    let ingredients=followingItems(findHeading(['ingrediente']),28);
    let steps=followingItems(findHeading(['preparacao','modo de preparar','confeccao','como fazer','instrucoes']),24);
    if(ingredients.length<3)ingredients=[...doc.querySelectorAll('[class*="ingredient"] li,[class*="ingredient"] [class*="item"],.wprm-recipe-ingredient,.tasty-recipes-ingredients li')].map(x=>strip(x.textContent)).filter(x=>x.length>1).slice(0,28);
    if(steps.length<2)steps=[...doc.querySelectorAll('[class*="instruction"] li,[class*="direction"] li,.wprm-recipe-instruction-text,.tasty-recipes-instructions li')].map(x=>strip(x.textContent)).filter(x=>x.length>12).slice(0,24);
    if(steps.length<2){
      steps=[...doc.querySelectorAll('p')].map(x=>strip(x.textContent)).filter(x=>x.length>40&&/\b(junte|adicione|coloque|leve|cozinhe|tempere|aqueça|aquece|corte|misture|deixe|sirva|grelhe|asse|refogue|frite|envolva)\b/i.test(x)).slice(0,14);
    }
    const img=doc.querySelector('.wp-post-image[src],figure img[src],img[src]')?.getAttribute('src')||doc.querySelector('img[data-src]')?.getAttribute('data-src')||'';
    return {ingredients:unique(ingredients),steps:unique(steps),img,text:strip(doc.body?.textContent||'')};
  }

  function ingredientPairs(lines){
    return lines.map(line=>{
      const m=line.match(/^(.+?)\s*[–—-]\s*(.+)$/);if(m)return[strip(m[1]),strip(m[2])];
      const q=line.match(/^((?:\d+[\s\/]\d+|\d+(?:[.,]\d+)?|q\.?b\.?).{0,20}?)\s+(.+)$/i);if(q)return[strip(q[2]),strip(q[1])];
      return[strip(line),''];
    }).filter(([a])=>a&&a.length<180).slice(0,26);
  }

  function inferMethods(text){
    const n=norm(text),out=[];
    Object.entries(METHOD_WORDS).forEach(([m,words])=>{if(words.some(w=>n.includes(norm(w))))out.push(m)});
    return unique(out);
  }

  function titleSimilarity(a,b){
    const A=new Set(tokens(a)),B=new Set(tokens(b));if(!A.size||!B.size)return 0;
    let inter=0;A.forEach(x=>{if(B.has(x))inter++});return inter/Math.max(A.size,B.size);
  }

  function matchScore(recipe,input,provider){
    const title=norm(recipe.name),hay=norm(`${recipe.name} ${recipe.rawText} ${recipe.ingredients.flat().join(' ')}`),pts=proteinTerms(input.protein);
    if(!pts.some(t=>hay.includes(norm(t))))return -999;
    let score=(provider.priority||50);
    if(pts.some(t=>title.includes(norm(t))))score+=55;
    const have=ingredientsFromInput(input);let matched=0;
    have.forEach(t=>{if(hay.includes(t)){matched++;score+=12}});
    recipe.matchedIngredients=matched;
    if(have.length)score+=Math.round((matched/have.length)*35);
    if(input.method&&input.method!=='any'){
      if(recipe.methods.includes(input.method))score+=34;
      else if(recipe.methods.length)score-=18; // unknown is better than a false hard rejection
      else score-=4;
    }
    const max=Number(input.timeMinutes)||0;
    if(max&&recipe.time){if(recipe.time<=max)score+=28;else score-=Math.min(30,(recipe.time-max)*1.5)}
    else if(max<=30&&!recipe.time)score-=6;
    if(recipe.image)score+=16;if(recipe.ingredients.length>=5)score+=18;if(recipe.steps.length>=3)score+=22;
    if(/portugues|à portuguesa|portugal|tradicional/.test(hay))score+=14;if(/mediterran/.test(hay))score+=8;
    if(recipe.ingredients.length<3||recipe.steps.length<2)score-=100;
    return score;
  }

  async function fetchWPRecipe(provider,row,input){
    const timeout=window.LUME_CONFIG?.RETRIEVAL_TIMEOUT_MS||8500;
    const post=await fetchJSON(`${provider.base}/wp-json/wp/v2/posts/${row.id}?_embed=1`,timeout);
    const title=strip(post?.title?.rendered||row.title||'');
    if(!title||title.length<5||COLLECTION.test(title)||BAD_CUISINE.test(norm(title)))return null;
    const parsed=htmlToSections(post?.content?.rendered||'');
    if(parsed.ingredients.length<3||parsed.steps.length<2)return null;
    const featured=post?._embedded?.['wp:featuredmedia']?.[0];
    const image=featured?.media_details?.sizes?.large?.source_url||featured?.source_url||parsed.img||'';
    const rawText=`${title} ${post?.excerpt?.rendered||''} ${parsed.text}`;
    const methods=inferMethods(rawText),time=parseMinutes(rawText);
    const recipe={
      externalId:`${provider.id}:${post.id}`,name:title,style:provider.tier==='mediterranean'?'Mediterrânico':'Português',cuisineTier:provider.tier||'portuguese',
      time:time||null,effort:(parsed.ingredients.length>12||(time&&time>45))?'normal':'simple',methods,
      side:strip(post?.excerpt?.rendered||'').slice(0,150)||'Receita completa da fonte original',
      ingredients:ingredientPairs(parsed.ingredients),steps:parsed.steps,adapt:[],image,source:'direct',sourceName:provider.name,
      sourceUrl:post?.link||row.url||provider.base,providerId:provider.id,sourceDescription:'Receita individual recuperada diretamente da fonte.',rawText
    };
    recipe._score=matchScore(recipe,input,provider);return recipe._score<0?null:recipe;
  }

  async function wpSearch(provider,q,input,page=1){
    const per=Math.min(20,window.LUME_CONFIG?.MAX_PROVIDER_RESULTS||16),timeout=window.LUME_CONFIG?.RETRIEVAL_TIMEOUT_MS||8500;
    const url=`${provider.base}/wp-json/wp/v2/search?search=${encodeURIComponent(q)}&per_page=${per}&page=${page}&subtype=post`;
    const rows=await fetchJSON(url,timeout);if(!Array.isArray(rows))return[];
    const pts=proteinTerms(input.protein),have=ingredientsFromInput(input);
    const candidates=rows.filter(r=>{
      const title=strip(r.title||''),n=norm(title);if(!title||COLLECTION.test(title)||BAD_CUISINE.test(n))return false;
      return pts.some(t=>n.includes(norm(t)))||have.some(t=>n.includes(t));
    }).slice(0,9);
    const settled=await Promise.allSettled(candidates.map(r=>fetchWPRecipe(provider,r,input)));
    return settled.filter(x=>x.status==='fulfilled'&&x.value).map(x=>x.value);
  }

  async function searchProvider(provider,input){
    if(provider.type!=='wp')return[];
    const qs=queryPlan(input),seed=Math.abs(Number(input.variationSeed)||0);let all=[];
    // Different rounds start from a different query and, occasionally, the second WP results page.
    for(let i=0;i<Math.min(6,qs.length);i++){
      const q=qs[i],page=(seed>1&&i===0&&seed%3===0)?2:1;
      try{all.push(...await wpSearch(provider,q,input,page));}catch(e){if(page>1){try{all.push(...await wpSearch(provider,q,input,1));}catch{}}}
      if(all.length>=7)break;
    }
    return all;
  }

  function deDupeRank(rows,input){
    const avoid=unique([...(input.avoidRecipes||[]),...(input.history||[]).map(x=>x.name).filter(Boolean)]);
    const accepted=[];
    for(const r of rows.sort((a,b)=>(b._score||0)-(a._score||0))){
      if(!r?.name)continue;
      if(accepted.some(x=>titleSimilarity(x.name,r.name)>=0.72))continue;
      const recent=avoid.reduce((m,a)=>Math.max(m,titleSimilarity(a,r.name)),0);
      r._recentSimilarity=recent;
      if(recent>=0.88)r._score-=180;else if(recent>=0.65)r._score-=70;
      accepted.push(r);
    }
    return accepted.sort((a,b)=>(b._score||0)-(a._score||0));
  }

  function diversePick(ranked,count=3){
    const out=[],usedProviders=new Set();
    for(const r of ranked){if(!usedProviders.has(r.providerId)){out.push(r);usedProviders.add(r.providerId)}if(out.length===count)return out}
    for(const r of ranked){if(!out.includes(r))out.push(r);if(out.length===count)return out}
    return out;
  }

  async function suggest(input){
    const providers=(window.LUME_PROVIDERS||[]).filter(p=>p.enabled!==false).slice().sort((a,b)=>b.priority-a.priority);
    const results=[],status=[];
    // Probe in parallel batches so one dead site cannot stall the whole experience.
    for(let i=0;i<providers.length;i+=4){
      const batch=providers.slice(i,i+4),settled=await Promise.allSettled(batch.map(p=>searchProvider(p,input)));
      settled.forEach((s,j)=>{const p=batch[j];if(s.status==='fulfilled'){status.push({id:p.id,name:p.name,ok:true,count:s.value.length});results.push(...s.value)}else status.push({id:p.id,name:p.name,ok:false,count:0})});
      const ranked=deDupeRank(results,input),fresh=ranked.filter(r=>r._recentSimilarity<0.88);
      if(fresh.length>=7&&new Set(fresh.map(r=>r.providerId)).size>=3)break;
    }
    window.dispatchEvent(new CustomEvent('lume:provider-status',{detail:status}));
    const ranked=deDupeRank(results,input);
    const fresh=ranked.filter(r=>r._recentSimilarity<0.88);
    const pool=fresh.length?fresh:ranked;
    const picked=diversePick(pool,3);
    if(!picked.length){const err=new Error('DIRECT_COMPLETE_RECIPES_INSUFFICIENT');err.providerStatus=status;throw err}
    return picked.map(r=>{const x={...r};delete x.rawText;delete x._score;delete x._recentSimilarity;return x});
  }

  window.LumeRetrieval={suggest,isWebConfigured:()=>true,providers:()=>window.LUME_PROVIDERS||[]};
})();
