/**
 * Lume AI Gateway — Cloudflare Worker
 * Keeps the provider key server-side and exposes one stable contract to the PWA.
 *
 * Secrets/vars:
 *   OPENAI_API_KEY  (secret)
 *   OPENAI_MODEL    (var; choose a current vision-capable model in your account)
 *   ALLOWED_ORIGIN  (var; e.g. https://username.github.io)
 */

const SYSTEM = `És o motor culinário do Lume, uma aplicação familiar portuguesa.
A família tem 5 pessoas: 2 adultos e crianças de 3, 5 e 11 anos, sem alergias conhecidas.
Prioriza comida prática, saudável, saborosa para crianças, sobretudo portuguesa e mediterrânica.
Cria sempre exatamente 3 refeições completas e diferentes. Respeita o tempo e método pedidos.
Usa primeiro os ingredientes que a pessoa diz ter. Se faltar algo não essencial, adapta a receita ou oferece substituição em vez de exigir compra.
As quantidades devem servir 5 pessoas. Não incluas informação nutricional.
Usa o histórico: evita repetir demasiado cedo; favorece padrões bem avaliados após algumas semanas; evita receitas classificadas como não repetir.
Responde SOMENTE com JSON válido no formato pedido.`;

function cors(env, request){
  const origin=request.headers.get('Origin')||'';
  const allowed=(env.ALLOWED_ORIGIN||'*').trim();
  const value=allowed==='*'?'*':(origin===allowed?origin:allowed);
  return {
    'Access-Control-Allow-Origin':value,
    'Access-Control-Allow-Methods':'POST,OPTIONS',
    'Access-Control-Allow-Headers':'Content-Type',
    'Vary':'Origin'
  };
}

function json(data,status,headers={}){
  return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8',...headers}});
}

function recipeSchemaText(){
  return `{"recipes":[{"name":"string","style":"Português|Mediterrânico|Familiar","time":30,"effort":"simple|normal","methods":["pan|oven|grill|airfryer"],"side":"acompanhamento completo","ingredients":[["ingrediente","quantidade"]],"steps":["passo"],"adapt":["substituição/adaptação"]}]}`;
}

function userText(body){
  return `Pedido de hoje:\n${JSON.stringify({
    family:body.family,
    protein:body.protein,
    availableIngredients:body.availableIngredients,
    timeMinutes:body.timeMinutes,
    effort:body.effort,
    method:body.method,
    history:body.history,
    favorites:body.favorites,
    constraints:body.constraints
  },null,2)}\n\nFormato obrigatório: ${recipeSchemaText()}`;
}

async function callOpenAI(body,env){
  if(!env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY missing');
  if(!env.OPENAI_MODEL) throw new Error('OPENAI_MODEL missing');

  const content=[{type:'text',text:userText(body)}];
  if(body.photoDataUrl){
    content.push({type:'image_url',image_url:{url:body.photoDataUrl,detail:'low'}});
  }

  const response=await fetch('https://api.openai.com/v1/chat/completions',{
    method:'POST',
    headers:{'Authorization':`Bearer ${env.OPENAI_API_KEY}`,'Content-Type':'application/json'},
    body:JSON.stringify({
      model:env.OPENAI_MODEL,
      temperature:0.7,
      response_format:{type:'json_object'},
      messages:[
        {role:'system',content:SYSTEM},
        {role:'user',content}
      ]
    })
  });
  if(!response.ok){
    const detail=(await response.text()).slice(0,600);
    throw new Error(`Provider ${response.status}: ${detail}`);
  }
  const data=await response.json();
  const raw=data?.choices?.[0]?.message?.content;
  if(!raw) throw new Error('Empty provider response');
  return JSON.parse(raw);
}

function validRecipe(r){
  return r && typeof r.name==='string' && typeof r.side==='string' && Number.isFinite(Number(r.time)) && Array.isArray(r.ingredients) && Array.isArray(r.steps);
}

export default {
  async fetch(request,env){
    const headers=cors(env,request);
    if(request.method==='OPTIONS') return new Response(null,{status:204,headers});
    const url=new URL(request.url);
    if(url.pathname==='/health') return json({ok:true,service:'lume-ai'},200,headers);
    if(url.pathname!=='/v1/suggest' || request.method!=='POST') return json({error:'Not found'},404,headers);

    try{
      const body=await request.json();
      if(!body?.protein || typeof body.protein!=='string') return json({error:'protein is required'},400,headers);
      if(body.photoDataUrl && body.photoDataUrl.length>5_500_000) return json({error:'photo too large'},413,headers);

      const result=await callOpenAI(body,env);
      if(!Array.isArray(result?.recipes) || result.recipes.length<3 || !result.recipes.slice(0,3).every(validRecipe)){
        return json({error:'Invalid model response'},502,headers);
      }
      return json({recipes:result.recipes.slice(0,3)},200,headers);
    }catch(error){
      console.error(error);
      return json({error:'AI gateway error'},502,headers);
    }
  }
};
