/**
 * Lume direct-source registry — Portuguese first.
 * Every source is probed at runtime. A source that blocks CORS or changes its REST API is skipped.
 * No API keys and no Worker are required for this path.
 */
window.LUME_PROVIDERS = [
  {id:'teleculinaria',name:'Teleculinária',base:'https://teleculinaria.pt',tier:'portuguese',priority:100,type:'wp'},
  {id:'claradesousa',name:'Clara de Sousa',base:'https://claradesousa.pt',tier:'portuguese',priority:98,type:'wp'},
  {id:'cozinhaalacarte',name:'Cozinha à la Carte',base:'https://cozinhaalacarte.pt',tier:'portuguese',priority:96,type:'wp'},
  {id:'tuganacozinha',name:'Tuga na Cozinha',base:'https://www.tuganacozinha.pt',tier:'portuguese',priority:95,type:'wp'},
  {id:'cincoquartos',name:'Cinco Quartos de Laranja',base:'https://www.cincoquartosdelaranja.com',tier:'portuguese',priority:94,type:'wp'},
  {id:'petiscos',name:'Petiscos',base:'https://www.petiscos.com',tier:'portuguese',priority:92,type:'wp'},
  {id:'receitasemenus',name:'Receitas e Menus',base:'https://www.receitasemenus.net',tier:'portuguese',priority:90,type:'wp'},
  {id:'saborintenso',name:'SaborIntenso',base:'https://www.saborintenso.com',tier:'portuguese',priority:88,type:'wp'}
];
