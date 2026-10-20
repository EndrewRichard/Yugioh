const templates=require('../data/characterDecks.json');
const decks=require('../models/deckModel');
const cards=require('../models/cardModel');
const {currentUser}=require('../middleware/http');
const {send}=require('../utils/response');
const deckTemplateController={
  list(_req,res){return send(res,200,{templates:templates.map(({expectedCount,cardNames,...info})=>({...info,starterCardCount:expectedCount??cardNames?.reduce((sum,[,count])=>sum+count,0)}))})},
  async create(req,res,id){const template=templates.find(item=>item.id===id);if(!template)throw Object.assign(new Error('Modelo de deck não encontrado.'),{status:404});let main,extra=[];if(template.cardNames){const resolved=await cards.cardsByNames(template.cardNames);main=resolved.filter(card=>!/Fusion Monster/i.test(card.type||''));extra=resolved.filter(card=>/Fusion Monster/i.test(card.type||''))}else{const productCards=await cards.productCards(template.product,template.prefix);main=productCards.filter(card=>!/Fusion Monster/i.test(card.type||''));extra=productCards.filter(card=>/Fusion Monster/i.test(card.type||''))}const deck=await decks.create(currentUser(req).id,{name:template.title,description:`${template.description} Fonte: ${template.product||template.source}. Cartas do Extra Deck fora do formato clássico foram removidas.`,cards:main.map(card=>({cardId:card.id,quantity:card.quantity||1})),extraCards:extra.map(card=>({cardId:card.id,quantity:card.quantity||1}))});return send(res,201,{deck})}
};
module.exports={deckTemplateController};
