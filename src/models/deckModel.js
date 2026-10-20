const crypto=require('node:crypto');const store=require('./jsonStore');
async function list(userId){return (await store.read('decks')).filter(d=>d.userId===userId)}
async function get(userId,id){return (await list(userId)).find(d=>d.id===id)||null}
async function create(userId,{name,description='',cards=[],extraCards=[]}){const all=await store.read('decks');const now=new Date().toISOString();const deck={id:crypto.randomUUID(),userId,name:name.trim(),description:description.trim(),cards:cleanCards(cards),extraCards:cleanCards(extraCards),createdAt:now,updatedAt:now};all.push(deck);await store.write('decks',all);return deck}
async function update(userId,id,{name,description,cards,extraCards}){const all=await store.read('decks'),deck=all.find(d=>d.id===id&&d.userId===userId);if(!deck)return null;if(name!==undefined)deck.name=name.trim();if(description!==undefined)deck.description=description.trim();if(cards!==undefined)deck.cards=cleanCards(cards);if(extraCards!==undefined)deck.extraCards=cleanCards(extraCards);deck.updatedAt=new Date().toISOString();await store.write('decks',all);return deck}
async function remove(userId,id){const all=await store.read('decks'),next=all.filter(d=>!(d.id===id&&d.userId===userId));if(next.length===all.length)return false;await store.write('decks',next);return true}
async function copy(userId,id){const original=await get(userId,id);if(!original)return null;return create(userId,{name:`${original.name} (cópia)`,description:original.description,cards:original.cards,extraCards:original.extraCards||[]})}
function cleanCards(cards){return cards.map(c=>({cardId:String(c.cardId),quantity:Math.max(1,Math.min(3,Number(c.quantity)||1))})).filter(c=>c.cardId.length<30)}
async function removeForUser(userId){await store.write('decks',(await store.read('decks')).filter(d=>d.userId!==userId))}
module.exports={list,get,create,update,remove,copy,removeForUser};
