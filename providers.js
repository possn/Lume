/**
 * Lume direct-source registry.
 * No secret keys. Each provider is probed at runtime; CORS-blocked sources are skipped.
 */
window.LUME_PROVIDERS = [
  {id:'teleculinaria',name:'Teleculinária',base:'https://teleculinaria.pt',tier:'portuguese',priority:100,type:'wp'},
  {id:'cozinhaalacarte',name:'Cozinha à la Carte',base:'https://cozinhaalacarte.pt',tier:'portuguese',priority:95,type:'wp'},
  {id:'tuganacozinha',name:'Tuga na Cozinha',base:'https://www.tuganacozinha.pt',tier:'portuguese',priority:94,type:'wp'},
  {id:'cincoquartos',name:'Cinco Quartos de Laranja',base:'https://www.cincoquartosdelaranja.com',tier:'portuguese',priority:92,type:'wp'},
  {id:'petiscos',name:'Petiscos',base:'https://www.petiscos.com',tier:'portuguese',priority:90,type:'wp'},
  {id:'receitasemenus',name:'Receitas e Menus',base:'https://www.receitasemenus.net',tier:'portuguese',priority:88,type:'wp'},
  {id:'claradesousa',name:'Clara de Sousa',base:'https://claradesousa.pt',tier:'portuguese',priority:87,type:'wp'},
  {id:'saborintenso',name:'SaborIntenso',base:'https://www.saborintenso.com',tier:'portuguese',priority:85,type:'wp'},
  {id:'panelinha',name:'Panelinha de Sabores',base:'https://panelinhadesabores.blogspot.com',tier:'portuguese',priority:80,type:'blogger'},
  {id:'asreceitasladecasa',name:'As Receitas Lá de Casa',base:'https://asreceitasladecasa.blogspot.com',tier:'portuguese',priority:78,type:'blogger'}
];
