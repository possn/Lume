(function(){
  const cfg = () => window.LUME_CONFIG || {};

  function isConfigured(){ return Boolean((cfg().AI_ENDPOINT || '').trim()); }

  async function request(path, payload){
    if(!isConfigured()) throw new Error('AI_NOT_CONFIGURED');
    const controller = new AbortController();
    const timer = setTimeout(()=>controller.abort(), cfg().AI_TIMEOUT_MS || 30000);
    try{
      const response = await fetch(`${cfg().AI_ENDPOINT.replace(/\/$/,'')}${path}`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(payload),
        signal:controller.signal
      });
      if(!response.ok) throw new Error(`AI_HTTP_${response.status}`);
      return await response.json();
    } finally { clearTimeout(timer); }
  }

  function validateRecipe(r){
    return r && typeof r.name==='string' && typeof r.side==='string' && Number.isFinite(Number(r.time)) &&
      Array.isArray(r.ingredients) && r.ingredients.length>0 && Array.isArray(r.steps) && r.steps.length>0;
  }

  async function suggest(input){
    const data = await request('/v1/suggest', input);
    if(!data || !Array.isArray(data.recipes) || data.recipes.length<3) throw new Error('AI_BAD_RESPONSE');
    const recipes = data.recipes.slice(0,3).filter(validateRecipe).map(r=>({
      ...r,
      time:Number(r.time),
      effort:r.effort==='normal'?'normal':'simple',
      methods:Array.isArray(r.methods)?r.methods:['pan'],
      ingredients:r.ingredients.map(x=>Array.isArray(x)?x:[x.name||'Ingrediente',x.amount||'q.b.']),
      adapt:Array.isArray(r.adapt)?r.adapt:[],
      source:'ai'
    }));
    if(recipes.length<3) throw new Error('AI_BAD_RESPONSE');
    return recipes;
  }

  window.LumeAI = {isConfigured, suggest};
})();
