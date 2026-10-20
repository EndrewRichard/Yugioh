const { sessions } = require('../models/sessionStore');
function parseCookies(header=''){return Object.fromEntries(header.split(';').map(part=>part.trim()).filter(Boolean).map(part=>{const i=part.indexOf('=');return [part.slice(0,i),decodeURIComponent(part.slice(i+1))]}))}
function currentUser(req){const token=parseCookies(req.headers.cookie).duelist_session;return token?sessions.get(token)||null:null}
function requireUser(req){if(!currentUser(req)){const e=new Error('Entre na sua conta para continuar.');e.status=401;throw e}}
function parseJson(req){return new Promise((resolve,reject)=>{let data='';req.on('data',chunk=>{data+=chunk;if(data.length>1_000_000){const e=new Error('Requisição muito grande.');e.status=413;reject(e);req.destroy()}});req.on('end',()=>{try{resolve(data?JSON.parse(data):{})}catch{const e=new Error('JSON inválido.');e.status=400;reject(e)}});req.on('error',reject)})}
module.exports={currentUser,requireUser,parseJson,parseCookies};
