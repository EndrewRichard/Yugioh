const model=require('../models/cardModel');const {send}=require('../utils/response');
const cardController={async list(_req,res){try{const result=await model.list();return send(res,200,result)}catch(e){return send(res,502,{error:'Não foi possível carregar as cartas agora. Confira a conexão e tente novamente.',details:e.message})}},async refresh(res){try{const cards=await model.refresh();return send(res,200,{source:'YGOPRODeck',fetchedAt:new Date().toISOString(),cards})}catch(e){return send(res,502,{error:'Falha ao atualizar o catálogo.',details:e.message})}}};
module.exports={cardController};
