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

  const INGREDIENT_ALIASES={
    arroz:['arroz'],batata:['batata','batatas'],massa:['massa','esparguete','macarrao','macarrão','penne','fusilli'],
    tomate:['tomate','tomates'],cebola:['cebola','cebolas'],alho:['alho'],cenoura:['cenoura','cenouras'],
    courgette:['courgette','curgete','abobrinha'],brocolos:['brocolos','brócolos','brocolo','brócolo'],
    ervilhas:['ervilha','ervilhas'],feijao_verde:['feijao verde','feijão verde','feijao-verde','feijão-verde'],
    pimento:['pimento','pimentos'],espinafres:['espinafre','espinafres'],alface:['alface','salada verde'],
    pepino:['pepino','pepinos'],cogumelos:['cogumelo','cogumelos'],milho:['milho'],
    grao:['grao','grão','grao de bico','grão de bico'],feijao:['feijao','feijão'],
    ovos:['ovo','ovos'],queijo:['queijo','mozzarella','mozarela','feta','parmesao','parmesão'],
    iogurte:['iogurte','iogurte natural'],natas:['natas','creme de leite'],limao:['limao','limão','limoes','limões']
  };
  function ingredientConcept(raw){
    const n=norm(raw).replace(/\s+/g,' ').trim();
    if(!n)return'';
    for(const [key,aliases] of Object.entries(INGREDIENT_ALIASES)){
      if(aliases.some(a=>{const x=norm(a);return n===x||n.includes(x)||x.includes(n)}))return key;
    }
    return tokens(n).slice(0,2).join('_');
  }
  function ingredientEntries(input){
    const raw=String(input.availableIngredients||'').split(/[,;\n]+/).map(x=>strip(x)).filter(x=>x.length>1).slice(0,12);
    const out=[];
    for(const label of raw){const concept=ingredientConcept(label);if(concept&&!out.some(x=>x.concept===concept))out.push({label,concept})}
    return out;
  }
  function ingredientsFromInput(input){return ingredientEntries(input).map(x=>x.label)}
  function recipeMatchesIngredient(recipeHay,entry){
    const hay=norm(recipeHay),aliases=INGREDIENT_ALIASES[entry.concept]||[entry.label.replace(/_/g,' ')];
    return aliases.some(a=>hay.includes(norm(a)));
  }

  async function fetchJSON(url,ms=8500){
    const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);
    try{
      const r=await fetch(url,{signal:c.signal,mode:'cors',cache:'no-store',headers:{Accept:'application/json'}});
      if(!r.ok)throw new Error(`HTTP_${r.status}`);
      return await r.json();
    } finally { clearTimeout(t); }
  }

  async function fetchText(url,ms=6500){
    const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);
    try{
      const r=await fetch(url,{signal:c.signal,mode:'cors',cache:'no-store',headers:{Accept:'text/html,application/xhtml+xml'}});
      if(!r.ok)throw new Error(`HTTP_${r.status}`);
      return await r.text();
    } finally { clearTimeout(t); }
  }

  function imageFromPage(html,base){
    try{
      const doc=new DOMParser().parseFromString(html||'','text/html');
      const raw=doc.querySelector('meta[property="og:image"]')?.content||doc.querySelector('meta[name="twitter:image"]')?.content||doc.querySelector('meta[property="twitter:image"]')?.content||doc.querySelector('article img[src],main img[src]')?.getAttribute('src')||'';
      return raw?new URL(raw,base).href:'';
    }catch{return''}
  }

  function queryPlan(input){
    const p=(input.protein||'').trim();
    const have=ingredientsFromInput(input);
    const seed=Math.abs(Number(input.variationSeed)||0);
    const method={oven:'forno',pan:'frigideira',grill:'grelhado',airfryer:'air fryer',any:''}[input.method]||'';
    const combo3=have.slice(0,3).join(' '),combo4=have.slice(0,4).join(' ');
    const shifted=have.length>3?[...have.slice(2),...have.slice(0,2)].slice(0,3).join(' '):combo3;
    const q=[
      `${p} ${combo4} ${method}`,`${p} ${combo3} portuguesa`,`${p} ${shifted} ${method}`,
      `${p} ${combo3} mediterrânica`,`${p} ${combo3} familiar crianças`,`${p} ${method}`,
      `${p} portuguesa`,`${p} mediterrânica`,`${p} familiar crianças`,`${p} ${shifted}`,`${p}`
    ].map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean);
    const rot=seed%q.length;
    return unique([...q.slice(rot),...q.slice(0,rot)]);
  }

  function queryIntent(q){
    const n=norm(q);
    if(/mediterr/.test(n))return 'mediterranean';
    if(/familiar|criancas|familia|conforto/.test(n))return 'family';
    if(/portugues/.test(n))return 'portuguese';
    return 'general';
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

  function learnedAffinity(recipe,input){
    const history=Array.isArray(input.history)?input.history:[];
    const favorites=Array.isArray(input.favorites)?input.favorites:[];
    const rt=new Set(tokens(`${recipe.name} ${recipe.ingredients.flat().join(' ')} ${recipe.style||''}`));
    let score=0;
    const similarity=item=>{
      const it=new Set(tokens(`${item?.name||''} ${(item?.ingredients||[]).join(' ')} ${item?.style||''}`));
      if(!rt.size||!it.size)return 0;let inter=0;rt.forEach(x=>{if(it.has(x))inter++});return inter/Math.max(1,Math.min(rt.size,it.size));
    };
    for(const h of history.slice(0,40)){
      const sim=similarity(h);if(sim<0.16)continue;
      const rating=Number(h.rating)||0;
      if(rating===4)score+=sim*26;else if(rating===3)score+=sim*12;else if(rating===2)score-=sim*8;else if(rating===1)score-=sim*55;
      if(h.childrenLiked===true)score+=sim*12;else if(h.childrenLiked===false)score-=sim*28;
      if(h.adultsLiked===true)score+=sim*4;else if(h.adultsLiked===false)score-=sim*10;
      if(input.method&&input.method!=='any'&&(h.methods||[]).includes(input.method)&&(recipe.methods||[]).includes(input.method))score+=3;
    }
    for(const f of favorites.slice(0,20)){const sim=similarity(f);if(sim>=0.2)score+=sim*16}
    return Math.max(-80,Math.min(55,score));
  }

  function matchScore(recipe,input,provider){
    const title=norm(recipe.name),hay=norm(`${recipe.name} ${recipe.rawText} ${recipe.ingredients.flat().join(' ')}`),pts=proteinTerms(input.protein);
    if(!pts.some(t=>hay.includes(norm(t))))return -999;
    let score=(provider.priority||50);
    if(pts.some(t=>title.includes(norm(t))))score+=55;
    const have=ingredientEntries(input);let matched=0;
    const matchedLabels=[];
    have.forEach(entry=>{if(recipeMatchesIngredient(hay,entry)){matched++;matchedLabels.push(entry.label);score+=22}});
    recipe.matchedIngredients=matched;
    recipe.availableIngredientCount=have.length;
    recipe.matchedAvailableIngredients=matchedLabels;
    recipe.ingredientCoverage=have.length?matched/have.length:0;
    if(have.length){
      score+=Math.round(recipe.ingredientCoverage*70);
      if(matched>=Math.min(3,have.length))score+=18;
      if(recipe.ingredientCoverage>=0.75)score+=22;
      if(matched===0)score-=35;
    }
    if(input.method&&input.method!=='any'){
      if(recipe.methods.includes(input.method))score+=34;
      else if(recipe.methods.length)score-=18; // unknown is better than a false hard rejection
      else score-=4;
    }
    const max=Number(input.timeMinutes)||0;
    if(max&&recipe.time){if(recipe.time<=max)score+=28;else score-=Math.min(30,(recipe.time-max)*1.5)}
    else if(max<=30&&!recipe.time)score-=6;
    if(recipe.image)score+=26;else score-=5;if(recipe.ingredients.length>=5)score+=18;if(recipe.steps.length>=3)score+=22;
    score+=learnedAffinity(recipe,input);
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
    let image=featured?.media_details?.sizes?.large?.source_url||featured?.source_url||parsed.img||'';
    // Some WP APIs omit featured media. If the page allows CORS, recover og:image.
    if(!image&&post?.link){try{image=imageFromPage(await fetchText(post.link,Math.min(timeout,6500)),post.link)}catch{}}
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
    const pts=proteinTerms(input.protein),have=ingredientEntries(input);
    const candidates=rows.filter(r=>{
      const title=strip(r.title||''),n=norm(title);if(!title||COLLECTION.test(title)||BAD_CUISINE.test(n))return false;
      return pts.some(t=>n.includes(norm(t)))||have.some(entry=>recipeMatchesIngredient(n,entry));
    }).slice(0,10);
    const intent=queryIntent(q);
    const settled=await Promise.allSettled(candidates.map(r=>fetchWPRecipe(provider,r,input)));
    return settled.filter(x=>x.status==='fulfilled'&&x.value).map(x=>({...x.value,discoveryIntent:intent}));
  }

  async function searchProvider(provider,input){
    if(provider.type!=='wp')return[];
    const qs=queryPlan(input),seed=Math.abs(Number(input.variationSeed)||0);let all=[];
    // Different rounds start from a different query and, occasionally, the second WP results page.
    for(let i=0;i<qs.length;i++){
      const q=qs[i],page=(seed>1&&i===0&&seed%3===0)?2:1;
      try{all.push(...await wpSearch(provider,q,input,page));}catch(e){if(page>1){try{all.push(...await wpSearch(provider,q,input,1));}catch{}}}
      if(all.length>=12)break;
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

  function bucketOf(r){
    const intent=r.discoveryIntent||'';
    const hay=norm(`${r.name||''} ${r.side||''} ${r.rawText||''}`);
    if(intent==='family'||/familiar|crianca|massa|almond|hamburg|empad|gratin|panad/.test(hay))return 'family';
    if(intent==='mediterranean'||/mediterr|greg|italian|espanhol|cuscuz|oreg[aã]os|azeitona|feta/.test(hay))return 'mediterranean';
    return 'portuguese';
  }

  function diversePick(ranked,count=5){
    const out=[],usedProviders=new Set();
    const quotas=[['portuguese',3,'Portuguesa'],['mediterranean',1,'Mediterrânica'],['family',1,'Familiar']];
    function candidates(bucket){
      return ranked.filter(r=>bucketOf(r)===bucket).sort((a,b)=>{
        const ai=(a.image?18:0)+(usedProviders.has(a.providerId)?0:8);
        const bi=(b.image?18:0)+(usedProviders.has(b.providerId)?0:8);
        return ((b._score||0)+bi)-((a._score||0)+ai);
      });
    }
    for(const [bucket,wanted,label] of quotas){
      let n=0;
      for(const r of candidates(bucket)){
        if(out.includes(r))continue;
        out.push({...r,suggestionType:label});usedProviders.add(r.providerId);n++;
        if(n>=wanted||out.length>=count)break;
      }
    }
    for(const r of ranked){
      if(out.length>=count)break;
      if(out.some(x=>x.externalId===r.externalId||titleSimilarity(x.name,r.name)>=0.72))continue;
      const label=bucketOf(r)==='mediterranean'?'Mediterrânica':bucketOf(r)==='family'?'Familiar':'Portuguesa';
      out.push({...r,suggestionType:label});
    }
    return out.slice(0,count);
  }

  async function suggest(input){
    const providers=(window.LUME_PROVIDERS||[]).filter(p=>p.enabled!==false).slice().sort((a,b)=>b.priority-a.priority);
    const results=[],status=[];
    // Probe in parallel batches so one dead site cannot stall the whole experience.
    for(let i=0;i<providers.length;i+=4){
      const batch=providers.slice(i,i+4),settled=await Promise.allSettled(batch.map(p=>searchProvider(p,input)));
      settled.forEach((s,j)=>{const p=batch[j];if(s.status==='fulfilled'){status.push({id:p.id,name:p.name,ok:true,count:s.value.length});results.push(...s.value)}else status.push({id:p.id,name:p.name,ok:false,count:0})});
      const ranked=deDupeRank(results,input),fresh=ranked.filter(r=>r._recentSimilarity<0.88);
      if(fresh.length>=8&&new Set(fresh.map(r=>r.providerId)).size>=3)break;
    }
    window.dispatchEvent(new CustomEvent('lume:provider-status',{detail:status}));
    const ranked=deDupeRank(results,input);
    const fresh=ranked.filter(r=>r._recentSimilarity<0.88);
    const pool=fresh.length?fresh:ranked;
    const picked=diversePick(pool,5);
    if(!picked.length){const err=new Error('DIRECT_COMPLETE_RECIPES_INSUFFICIENT');err.providerStatus=status;throw err}
    return picked.map(r=>{const x={...r};delete x.rawText;delete x._score;delete x._recentSimilarity;return x});
  }

  window.LumeRetrieval={suggest,isWebConfigured:()=>true,providers:()=>window.LUME_PROVIDERS||[]};
})();
