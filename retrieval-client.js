(function(){
  const badCuisine=/\b(kentucky|kfc|tex[- ]?mex|mexican|mexicano|indian|indiano|chinese|chines|thai|tailandes|japanese|japones|korean|coreano|cajun|buffalo|teriyaki|tikka|ramen|taco|burrito)\b/i;
  const collectionTitle=/\b(\d+\s+receitas|receitas\s+(de|com|para)\s+.+\b(r[aá]pidas?|f[aá]ceis?|ideias?|jantares?)|especial\s*:\s*receitas|menu|menus|cole[cç][aã]o|ideias\s+de|jantares\s+de|semana\s+de)\b/i;
  const strip=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/&#8211;|&ndash;/g,'–').replace(/&#8217;|&rsquo;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();
  const norm=s=>strip(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const tokens=s=>norm(s).split(/[^a-z0-9]+/).filter(x=>x.length>2&&!['com','sem','uma','para','que','dos','das','por','nos','nas'].includes(x));
  const escRE=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

  async function fetchJSON(url,ms=9000){
    const c=new AbortController(); const t=setTimeout(()=>c.abort(),ms);
    try{const r=await fetch(url,{signal:c.signal,mode:'cors',headers:{Accept:'application/json'}});if(!r.ok)throw new Error(`HTTP_${r.status}`);return await r.json()}finally{clearTimeout(t)}
  }

  function proteinTerms(p){
    const n=norm(p);
    const map=[
      [/\b(peru|bife.*peru|peito.*peru)\b/,['peru']],
      [/\b(frango|peito.*frango)\b/,['frango','galinha']],
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

  function methodTerms(method){
    return {
      oven:['forno','assado','assada','assar'],
      pan:['frigideira','salteado','salteada','frito','frita','estufado','estufada'],
      grill:['grelhado','grelhada','grelhar','grelhador'],
      airfryer:['air fryer','airfryer','fritadeira de ar','fritadeira sem oleo']
    }[method]||[];
  }

  function queries(input){
    const p=(input.protein||'').trim();
    const ing=tokens(input.availableIngredients||'').slice(0,3).join(' ');
    const method={oven:'forno',pan:'frigideira',grill:'grelhado',airfryer:'air fryer',any:''}[input.method]||'';
    return [...new Set([
      `${p} ${ing} ${method}`.trim(),
      `${p} ${method} receita`.trim(),
      `${p} receita portuguesa`,
      `${p} mediterrânica ${method}`.trim(),
      `${p} fácil ${input.timeMinutes||30} minutos`
    ].filter(Boolean))];
  }

  function parseMinutes(text){
    const n=norm(text);
    const vals=[];
    const re=/(?:tempo\s*(?:total|de\s*preparacao|de\s*confeccao)?|preparacao|confeccao|cozedura|duracao)\s*[:\-]?\s*(?:(\d+)\s*h(?:oras?)?\s*)?(\d+)?\s*(?:min|minutos?)/g;
    let m; while((m=re.exec(n))){const v=(Number(m[1]||0)*60)+Number(m[2]||0);if(v>0&&v<480)vals.push(v)}
    if(vals.length) return Math.max(...vals);
    const simple=n.match(/\b(\d{1,3})\s*(?:min|minutos?)\b/); return simple?Number(simple[1]):null;
  }

  function htmlToSections(html){
    const doc=new DOMParser().parseFromString(html||'','text/html');
    doc.querySelectorAll('script,style,noscript,iframe,form,nav,aside').forEach(x=>x.remove());
    const img=doc.querySelector('img[src]')?.getAttribute('src')||doc.querySelector('img[data-src]')?.getAttribute('data-src')||'';
    const headings=[...doc.querySelectorAll('h2,h3,h4,strong,b')];
    const findHeading=words=>headings.find(h=>words.some(w=>norm(h.textContent).includes(w)));
    function followingItems(h,max=30){
      if(!h)return[]; let node=h; const out=[];
      for(let i=0;i<12;i++){
        node=node.nextElementSibling; if(!node)break;
        if(/^H[234]$/.test(node.tagName))break;
        const lis=[...node.querySelectorAll?.('li')||[]].map(x=>strip(x.textContent)).filter(Boolean);
        if(lis.length) out.push(...lis);
        else if(node.matches?.('p')){const t=strip(node.textContent);if(t.length>18)out.push(t)}
        if(out.length>=max)break;
      }
      return out.slice(0,max);
    }
    let ingredients=followingItems(findHeading(['ingrediente']),25);
    let steps=followingItems(findHeading(['preparacao','modo de preparar','confeccao','como fazer']),20);

    // Recipe plugins often mark ingredients/instructions with semantic class names.
    if(ingredients.length<2){
      ingredients=[...doc.querySelectorAll('[class*="ingredient"] li,[class*="ingredient"] [class*="item"],.wprm-recipe-ingredient')].map(x=>strip(x.textContent)).filter(x=>x.length>1).slice(0,25);
    }
    if(steps.length<2){
      steps=[...doc.querySelectorAll('[class*="instruction"] li,[class*="direction"] li,.wprm-recipe-instruction-text')].map(x=>strip(x.textContent)).filter(x=>x.length>12).slice(0,20);
    }
    if(steps.length<2){
      const ps=[...doc.querySelectorAll('p')].map(x=>strip(x.textContent)).filter(x=>x.length>45&&/\b(junte|adicione|coloque|leve|cozinhe|tempere|aqueça|aquece|corte|misture|deixe|sirva|grelhe|asse|refogue|frite)\b/i.test(x));
      steps=ps.slice(0,12);
    }
    return {doc,img,ingredients:[...new Set(ingredients)],steps:[...new Set(steps)],text:strip(doc.body.textContent)};
  }

  function ingredientPairs(lines){
    return lines.map(line=>{
      const m=line.match(/^(.+?)\s*[–—-]\s*(.+)$/);
      if(m)return [strip(m[1]),strip(m[2])];
      const q=line.match(/^((?:\d+[\s\/]\d+|\d+(?:[.,]\d+)?|q\.?b\.?).{0,18}?)\s+(.+)$/i);
      if(q)return [strip(q[2]),strip(q[1])];
      return [strip(line),''];
    }).filter(([a])=>a&&a.length<160).slice(0,22);
  }

  function inferMethods(text){
    const n=norm(text), out=[];
    if(/\bforno|assar|assado|assada\b/.test(n))out.push('oven');
    if(/\bfrigideira|saltear|fritar|estufar\b/.test(n))out.push('pan');
    if(/\bgrelhador|grelhar|grelhado|grelhada\b/.test(n))out.push('grill');
    if(/\bair ?fryer|fritadeira (?:de ar|sem oleo)\b/.test(n))out.push('airfryer');
    return [...new Set(out)];
  }

  function matchScore(recipe,input,provider){
    const hay=norm(`${recipe.name} ${recipe.rawText} ${recipe.ingredients.flat().join(' ')}`);
    const pts=proteinTerms(input.protein);
    if(pts.length&&!pts.some(t=>hay.includes(norm(t)))) return -999;
    let score=provider.priority||50;
    if(pts.some(t=>norm(recipe.name).includes(norm(t))))score+=45;
    const have=tokens(input.availableIngredients||'');
    have.forEach(t=>{if(hay.includes(t))score+=7});
    if(input.method&&input.method!=='any'){
      if(recipe.methods.includes(input.method))score+=35; else return -999;
    }
    const max=Number(input.timeMinutes)||0;
    if(max&&recipe.time){if(recipe.time<=max)score+=30;else return -999}
    else if(max<=30&&!recipe.time)score-=20;
    if(recipe.image)score+=18;
    if(recipe.ingredients.length>=4)score+=20;
    if(recipe.steps.length>=3)score+=25;
    if(/portugues|à portuguesa|portugal/.test(hay))score+=12;
    if(/mediterran/.test(hay))score+=8;
    return score;
  }

  async function fetchWPRecipe(provider,row,input){
    const post=await fetchJSON(`${provider.base}/wp-json/wp/v2/posts/${row.id}?_embed=1`,window.LUME_CONFIG?.RETRIEVAL_TIMEOUT_MS||9000);
    const title=strip(post?.title?.rendered||row.title||'');
    if(!title||collectionTitle.test(title)||badCuisine.test(norm(title)))return null;
    const content=post?.content?.rendered||'';
    const parsed=htmlToSections(content);
    if(parsed.ingredients.length<3||parsed.steps.length<2)return null;
    const featured=post?._embedded?.['wp:featuredmedia']?.[0];
    const image=featured?.source_url||featured?.media_details?.sizes?.large?.source_url||parsed.img||'';
    const rawText=`${title} ${parsed.text}`;
    const time=parseMinutes(rawText);
    const methods=inferMethods(rawText);
    const recipe={
      externalId:`${provider.id}:${post.id}`,
      name:title, style:provider.tier==='mediterranean'?'Mediterrânico':'Português', cuisineTier:provider.tier||'portuguese',
      time:time||null, effort:'simple', methods:methods.length?methods:['pan'],
      side:'Receita completa encontrada na fonte original',
      ingredients:ingredientPairs(parsed.ingredients), steps:parsed.steps,
      adapt:[], image, source:'direct', sourceName:provider.name,
      sourceUrl:post?.link||row.url||provider.base, providerId:provider.id,
      sourceDescription:'Receita individual recuperada diretamente da fonte.', rawText
    };
    recipe._score=matchScore(recipe,input,provider);
    if(recipe._score<0)return null;
    return recipe;
  }

  async function wpSearch(provider,q,input){
    const per=Math.min(12,window.LUME_CONFIG?.MAX_PROVIDER_RESULTS||10);
    const url=`${provider.base}/wp-json/wp/v2/search?search=${encodeURIComponent(q)}&per_page=${per}&subtype=post`;
    const rows=await fetchJSON(url,window.LUME_CONFIG?.RETRIEVAL_TIMEOUT_MS||9000);
    if(!Array.isArray(rows))return[];
    const strict=rows.filter(r=>{
      const title=strip(r.title||'');
      if(!title||collectionTitle.test(title)||badCuisine.test(norm(title)))return false;
      return proteinTerms(input.protein).some(t=>norm(title).includes(norm(t))) || tokens(input.availableIngredients||'').some(t=>norm(title).includes(t));
    }).slice(0,5);
    const settled=await Promise.allSettled(strict.map(r=>fetchWPRecipe(provider,r,input)));
    return settled.filter(x=>x.status==='fulfilled'&&x.value).map(x=>x.value);
  }

  async function bloggerSearch(){return[];} // Keep Blogger providers out until full recipe extraction is reliable.

  async function searchProvider(provider,input){
    if(provider.type==='blogger')return bloggerSearch(provider,input);
    const qs=queries(input); let all=[];
    for(const q of qs.slice(0,4)){
      try{all.push(...await wpSearch(provider,q,input));if(all.length>=4)break}catch(e){throw e}
    }
    return all;
  }

  function deDupeRank(rows,input){
    const avoid=(input.avoidRecipes||[]).map(norm);const seen=new Set();
    return rows.filter(r=>{const k=norm(r.name);if(!k||seen.has(k))return false;seen.add(k);if(avoid.some(a=>a&&(k.includes(a)||a.includes(k))))r._score-=80;return true}).sort((a,b)=>(b._score||0)-(a._score||0));
  }

  async function suggest(input){
    const providers=(window.LUME_PROVIDERS||[]).slice().sort((a,b)=>b.priority-a.priority);
    const results=[],status=[];
    for(let i=0;i<providers.length;i+=3){
      const batch=providers.slice(i,i+3);
      const settled=await Promise.allSettled(batch.map(p=>searchProvider(p,input)));
      settled.forEach((s,j)=>{const p=batch[j];if(s.status==='fulfilled'){status.push({id:p.id,name:p.name,ok:true,count:s.value.length});results.push(...s.value)}else status.push({id:p.id,name:p.name,ok:false,count:0})});
      if(deDupeRank(results,input).length>=6)break;
    }
    window.dispatchEvent(new CustomEvent('lume:provider-status',{detail:status}));
    const ranked=deDupeRank(results,input);
    if(ranked.length<3){const err=new Error('DIRECT_COMPLETE_RECIPES_INSUFFICIENT');err.providerStatus=status;throw err}
    return ranked.slice(0,3).map(r=>{delete r.rawText;return r});
  }

  window.LumeRetrieval={suggest,isWebConfigured:()=>true,providers:()=>window.LUME_PROVIDERS||[]};
})();
