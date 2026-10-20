const { accountController } = require('../controllers/accountController');
const { deckController } = require('../controllers/deckController');
const { cardController } = require('../controllers/cardController');
const { deckTemplateController } = require('../controllers/deckTemplateController');
const { duelController } = require('../controllers/duelController');
const { parseJson, requireUser } = require('../middleware/http');
const { send } = require('../utils/response');

const routes = [
  ['GET','/api/health', async (_req,res) => send(res,200,{ok:true})],
  ['GET','/api/account', async (req,res) => send(res,200,{user:accountController.current(req)})],
  ['GET','/api/decks/templates', async (req,res) => deckTemplateController.list(req,res)],
  ['GET','/api/duels/open', async (req,res) => {requireUser(req); return duelController.list(req,res)}],
  ['POST','/api/duels', async (req,res) => {requireUser(req); return duelController.create(req,res,await parseJson(req))}],
  ['POST','/api/duels/join', async (req,res) => {requireUser(req); return duelController.join(req,res,await parseJson(req))}],
  ['GET','/api/duels/:id', async (req,res,p) => {requireUser(req); return duelController.get(req,res,p.id)}],
  ['POST','/api/duels/:id/actions', async (req,res,p) => {requireUser(req); return duelController.action(req,res,p.id,await parseJson(req))}],
  ['POST','/api/account/register', async (req,res) => accountController.register(req,res,await parseJson(req))],
  ['POST','/api/account/login', async (req,res) => accountController.login(req,res,await parseJson(req))],
  ['POST','/api/account/logout', async (req,res) => accountController.logout(req,res)],
  ['PATCH','/api/account', async (req,res) => {requireUser(req); return accountController.update(req,res,await parseJson(req))}],
  ['DELETE','/api/account', async (req,res) => {requireUser(req); return accountController.remove(req,res)}],
  ['GET','/api/decks', async (req,res) => {requireUser(req); return deckController.list(req,res)}],
  ['POST','/api/decks', async (req,res) => {requireUser(req); return deckController.create(req,res,await parseJson(req))}],
  ['POST','/api/decks/:id/copy', async (req,res,p) => {requireUser(req); return deckController.copy(req,res,p.id)}],
  ['POST','/api/decks/templates/:id', async (req,res,p) => {requireUser(req); return deckTemplateController.create(req,res,p.id)}],
  ['GET','/api/decks/:id', async (req,res,p) => {requireUser(req); return deckController.get(req,res,p.id)}],
  ['PUT','/api/decks/:id', async (req,res,p) => {requireUser(req); return deckController.update(req,res,p.id,await parseJson(req))}],
  ['DELETE','/api/decks/:id', async (req,res,p) => {requireUser(req); return deckController.remove(req,res,p.id)}],
  ['GET','/api/cards', async (req,res) => cardController.list(req,res)],
  ['POST','/api/cards/refresh', async (_req,res) => cardController.refresh(res)]
];
async function router(req,res){
  try {
    const url=new URL(req.url,'http://localhost');
    for(const [method,pattern,handler] of routes){
      if(req.method!==method) continue;
      const keys=[]; const regex=new RegExp('^'+pattern.replace(/:[^/]+/g,m=>{keys.push(m.slice(1));return '([^/]+)'})+'$');
      const match=url.pathname.match(regex); if(!match)continue;
      const params=Object.fromEntries(keys.map((key,i)=>[key,decodeURIComponent(match[i+1])]));
      req.query=Object.fromEntries(url.searchParams);req.params=params;return await handler(req,res,params);
    }
    return send(res,404,{error:'Rota não encontrada.'});
  } catch(error) { const status=error.status||500;if(status>=500)console.error(error);return send(res,status,{error:status>=500?'Erro interno do servidor.':error.message}); }
}
module.exports={router,send};
