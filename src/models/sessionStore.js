const crypto=require('node:crypto');
const sessions=new Map();
function create(user){const token=crypto.randomBytes(32).toString('hex');sessions.set(token,{id:user.id,name:user.name,email:user.email});return token}
function destroy(token){if(token)sessions.delete(token)}
module.exports={sessions,create,destroy};
