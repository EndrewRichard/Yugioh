const crypto=require('node:crypto');
const {promisify}=require('node:util');
const scrypt=promisify(crypto.scrypt);
const store=require('./jsonStore');
const DEFAULT_APPEARANCE={field:'#263c35',back:'#27366f'};
function cleanAppearance(value={}){const clean={};for(const key of ['field','back']){const candidate=value[key];clean[key]=/^#[\da-f]{6}$/i.test(candidate||'')?candidate:DEFAULT_APPEARANCE[key]}return clean}
async function all(){return store.read('users')}
async function byEmail(email){return (await all()).find(u=>u.email===email.toLowerCase())}
async function byId(id){return (await all()).find(u=>u.id===id)}
async function create({name,email,password}){const users=await all();const normalized=email.trim().toLowerCase();if(users.some(u=>u.email===normalized)){const e=new Error('Este e-mail já está cadastrado.');e.status=409;throw e}const salt=crypto.randomBytes(16).toString('hex');const hash=(await scrypt(password,salt,64)).toString('hex');const user={id:crypto.randomUUID(),name:name.trim(),email:normalized,passwordHash:`${salt}:${hash}`,appearance:cleanAppearance(),createdAt:new Date().toISOString()};users.push(user);await store.write('users',users);return user}
async function verify(user,password){if(!user)return false;const [salt,expected]=user.passwordHash.split(':');const actual=await scrypt(password,salt,64);return crypto.timingSafeEqual(actual,Buffer.from(expected,'hex'))}
async function update(id,{name,email,appearance}){const users=await all(),user=users.find(u=>u.id===id);if(!user)return null;const normalized=email?.trim().toLowerCase();if(normalized&&users.some(u=>u.email===normalized&&u.id!==id)){const e=new Error('Este e-mail já está em uso.');e.status=409;throw e}if(name)user.name=name.trim();if(normalized)user.email=normalized;if(appearance)user.appearance=cleanAppearance(appearance);await store.write('users',users);return user}
async function remove(id){await store.write('users',(await all()).filter(u=>u.id!==id))}
function publicUser(user){return user?{id:user.id,name:user.name,email:user.email,appearance:cleanAppearance(user.appearance),createdAt:user.createdAt}:null}
module.exports={all,byEmail,byId,create,verify,update,remove,publicUser,cleanAppearance,DEFAULT_APPEARANCE};
