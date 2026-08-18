(function(){
  const badCuisine=/\b(kentucky|kfc|tex[- ]?mex|mexican|mexicano|indian|indiano|chinese|chines|thai|tailandes|japanese|japones|korean|coreano|cajun|buffalo|teriyaki|tikka|curry|caril|ramen|taco|burrito)\b/i;
  const strip=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/&#8211;|&ndash;/g,'–').replace(/&#8217;|&rsquo;/g,"'").replace(/\s+/g,' ').trim();
  const norm=s=>strip(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const tokens=s=>norm(s).split(/[^a-z0-9]+/).filter(x=>x.length>2);
  const timeoutFetch=async(url,ms=8000)=>{const c=new AbortController();const t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(url,{signal:c.signal,mode:'cors',headers:{Accept:'application/json'}});if(!r.ok)throw new Error(`HTTP_${r.status}`);return await r.json()}finally{clearTimeout(t)}};

  function queries(input){
    const p=(input.protein||'').trim();
    const ing=(input.availableIngredients||'').trim();
    const method={oven:'forno',pan:'frigideira',grill:'grelhado',airfryer:'air fryer',any:''}[input.method]||'';
    const qs=[p, `${p} receita`, `${p} ${method}`.trim(), `${p} fácil`, `${p} saudável`];
    if(ing) qs.unshift(`${p} ${ing.split(',').slice(0,2).join(' ')}`);
    return [...new Set(qs.filter(Boolean))].slice(0,5);
  }

  async function wpSearch(provider,q,input){
    const per=Math.min(10,window.LUME_CONFIG?.MAX_PROVIDER_RESULTS||8);
    const url=`${provider.base}/wp-json/wp/v2/search?search=${encodeURIComponent(q)}&per_page=${per}&subtype=post`;
    const rows=await timeoutFetch(url,window.LUME_CONFIG?.RETRIEVAL_TIMEOUT_MS||9000);
    if(!Array.isArray(rows)) return [];
    const wanted=tokens(input.protein);
    return rows.map((r,i)=>{
      const title=strip(r.title||'');
      if(!title||badCuisine.test(norm(title)))return null;
      const hit=wanted.some(t=>norm(title).includes(t));
      return {
        externalId:`${provider.id}:${r.id||r.url}`,
        name:title,
        style:'Português', cuisineTier:'portuguese', time:Number(input.timeMinutes)||35,
        effort:input.effort==='normal'?'normal':'simple', methods:[input.method&&input.method!=='any'?input.method:'pan'],
        side:hit?'Receita portuguesa encontrada para o ingrediente principal':'Receita portuguesa encontrada pelo Lume',
        ingredients:[], steps:['Abrir a receita original para consultar ingredientes, quantidades e preparação completa.'],
        adapt:['Se faltar algum ingrediente, o Lume pode procurar outra receita com o que tens em casa.'], image:'',
        source:'direct', sourceName:provider.name, sourceUrl:r.url||provider.base, providerId:provider.id,
        sourceDescription:'Resultado obtido diretamente da fonte portuguesa.',
        _score:provider.priority+(hit?35:0)-i*2
      };
    }).filter(Boolean);
  }

  async function bloggerSearch(provider,q,input){
    // Blogger JSON feeds often support callback/JSONP but not reliable fetch CORS. Probe JSON feed; skip cleanly on failure.
    const url=`${provider.base}/feeds/posts/default?alt=json&q=${encodeURIComponent(q)}&max-results=8`;
    const data=await timeoutFetch(url,window.LUME_CONFIG?.RETRIEVAL_TIMEOUT_MS||9000);
    const entries=data?.feed?.entry||[];
    return entries.map((e,i)=>{
      const title=strip(e.title?.$t||''); if(!title||badCuisine.test(norm(title)))return null;
      const href=(e.link||[]).find(x=>x.rel==='alternate')?.href||provider.base;
      return {externalId:`${provider.id}:${e.id?.$t||href}`,name:title,style:'Português',cuisineTier:'portuguese',time:Number(input.timeMinutes)||35,effort:input.effort==='normal'?'normal':'simple',methods:[input.method&&input.method!=='any'?input.method:'pan'],side:'Receita portuguesa encontrada pelo Lume',ingredients:[],steps:['Abrir a receita original para consultar a preparação completa.'],adapt:['Se faltar algum ingrediente, pede outras ideias com os ingredientes disponíveis.'],image:'',source:'direct',sourceName:provider.name,sourceUrl:href,providerId:provider.id,sourceDescription:'Resultado obtido diretamente da fonte portuguesa.',_score:provider.priority-i*2};
    }).filter(Boolean);
  }

  async function searchProvider(provider,input){
    const qs=queries(input);
    let all=[];
    for(const q of qs.slice(0,3)){
      try{
        const got=provider.type==='blogger'?await bloggerSearch(provider,q,input):await wpSearch(provider,q,input);
        all.push(...got);
        if(all.length>=5)break;
      }catch(e){
        // CORS, unavailable endpoint or non-compatible source: skip this provider.
        throw e;
      }
    }
    return all;
  }

  function deDupeRank(rows,input){
    const avoid=(input.avoidRecipes||[]).map(norm);
    const seen=new Set();
    return rows.filter(r=>{
      const k=norm(r.name); if(!k||seen.has(k))return false; seen.add(k);
      if(avoid.some(a=>a&& (k.includes(a)||a.includes(k)))) r._score-=70;
      return true;
    }).sort((a,b)=>(b._score||0)-(a._score||0));
  }

  async function suggest(input){
    const providers=(window.LUME_PROVIDERS||[]).slice().sort((a,b)=>b.priority-a.priority);
    if(!providers.length)throw new Error('NO_DIRECT_PROVIDERS');
    const results=[]; const status=[];
    // Batches keep mobile latency bounded while still aggregating several independent sites.
    for(let i=0;i<providers.length;i+=4){
      const batch=providers.slice(i,i+4);
      const settled=await Promise.allSettled(batch.map(p=>searchProvider(p,input)));
      settled.forEach((s,j)=>{
        const p=batch[j];
        if(s.status==='fulfilled'){status.push({id:p.id,name:p.name,ok:true,count:s.value.length});results.push(...s.value)}
        else status.push({id:p.id,name:p.name,ok:false,count:0});
      });
      const ranked=deDupeRank(results,input);
      if(ranked.filter(r=>!((input.avoidRecipes||[]).map(norm).includes(norm(r.name)))).length>=6)break;
    }
    window.dispatchEvent(new CustomEvent('lume:provider-status',{detail:status}));
    const ranked=deDupeRank(results,input);
    if(ranked.length<3){const err=new Error('DIRECT_SOURCES_INSUFFICIENT');err.providerStatus=status;throw err;}
    return ranked.slice(0,3);
  }

  window.LumeRetrieval={suggest,isWebConfigured:()=>true,providers:()=>window.LUME_PROVIDERS||[]};
})();
