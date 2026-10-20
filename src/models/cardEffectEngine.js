function ruleError(message){return Object.assign(new Error(message),{status:400})}

function resolve({game,actor,opponent,rule,targetInstanceId,targetInstanceIds=[],targetCardId,addLog,cardName}){
  const effect=rule.operation||{};
  const getTarget=(side,id)=>{
    const owners=side==='all'?game.players:side==='self'?[actor]:[opponent];
    for(const owner of owners){const monster=owner.monsters.find(item=>item.instanceId===id);if(monster)return{owner,monster}}
    return null;
  };
  if(effect.type==='destroy'){
    if(effect.targeting==='all-backrow'){
      const owners=effect.targetSide==='all'?game.players:[actor,opponent];
      for(const owner of owners){owner.graveyard.push(...owner.backrow.map(item=>item.cardId));owner.backrow=[]}
      addLog(game,`${rule.name} envia todas as Magias e Armadilhas do campo para o Cemitério.`);return;
    }
    const targets=effect.targeting==='all-monsters'?((effect.targetSide==='all'?game.players:[effect.targetSide==='self'?actor:opponent]).flatMap(owner=>owner.monsters.map(monster=>({owner,monster})))):[getTarget(effect.targetSide,targetInstanceId)].filter(Boolean);
    if(!targets.length)throw ruleError('Selecione um monstro válido para este efeito.');
    for(const{owner,monster}of targets){owner.monsters=owner.monsters.filter(item=>item.instanceId!==monster.instanceId);owner.graveyard.push(monster.cardId)}
    addLog(game,`${rule.name} envia ${targets.length} monstro(s) ao Cemitério.`);return;
  }
  if(effect.type==='returnToHand'){
    let targets=[];
    if(effect.targetSide==='attacking-monster'&&game.pendingAttack){const attacker=playerById(game,game.pendingAttack.attackerPlayerId);const monster=attacker?.monsters.find(item=>item.instanceId===game.pendingAttack.attackerInstanceId);if(monster)targets=[{owner:attacker,monster}]}
    else{const ids=targetInstanceIds.length?targetInstanceIds:[targetInstanceId].filter(Boolean);targets=ids.map(id=>getTarget(effect.targetSide,id)).filter(Boolean)}
    const maximum=effect.targeting==='up-to-two-monsters'?2:1;if(!targets.length||targets.length>maximum)throw ruleError(`Escolha de 1 a ${maximum} monstro(s) válido(s) para devolver à mão.`);
    for(const{owner,monster}of targets){owner.monsters=owner.monsters.filter(item=>item.instanceId!==monster.instanceId);owner.hand.push(monster.cardId)}
    addLog(game,`${rule.name} devolve ${targets.length} monstro(s) para a mão.`);return;
  }
  if(effect.type==='modifyStats'){
    const target=getTarget(effect.targetSide,targetInstanceId);if(!target)throw ruleError('Selecione um monstro válido para alterar seus pontos.');
    const field=effect.stat==='def'?'def':'atk',before=Number(target.monster[field])||0;
    const after=effect.amount==='halve'?Math.floor(before/2):before+(Number(effect.amount)||0);
    target.monster[field]=after;target.monster.statResetAtTurn=effect.duration==='end-of-turn'?game.turn:null;
    addLog(game,`${rule.name} altera ${field.toUpperCase()} de ${cardName(target.monster.cardId)} de ${before} para ${after}.`);return;
  }
  if(effect.type==='specialSummon'){
    const cardId=String(targetCardId||'');if(!cardId)throw ruleError('Escolha uma carta de Monstro para Invocar por este efeito.');
    const info=game.cardMap?.get(cardId);if(!info?.type?.includes('Monster'))throw ruleError('O alvo escolhido não é um Monstro.');
    if(actor.monsters.length>=5)throw ruleError('Suas Zonas de Monstro estão cheias.');
    const source=effect.sourceZone==='deck'?actor.deck:effect.sourceZone==='hand'?actor.hand:actor.graveyard,index=source.indexOf(cardId);if(index<0)throw ruleError(`A carta escolhida não está no ${effect.sourceZone}.`);
    if(effect.properlySummoned&&/Fusion Monster|Ritual Monster/i.test(info.type||'')&&!actor.properlySummoned?.includes(cardId))throw ruleError('Este Monstro do Extra Deck/Ritual ainda não foi Invocado corretamente.');
    source.splice(index,1);actor.monsters.push({instanceId:require('node:crypto').randomUUID(),cardId,atk:Number(info.atk)||0,def:Number(info.def)||0,faceDown:false,attacked:false,enteredTurn:game.turn});
    addLog(game,`${rule.name} Invoca ${info.name} por Invocação-Especial.`);return;
  }
  if(effect.type==='negateSummon'){
    if(!game.pendingSummon)throw ruleError('Não há uma Invocação que este efeito possa negar agora.');
    const cost=Math.floor(actor.lp*(Number(effect.lpCostFraction)||0));if(cost)actor.lp-=cost;
    const summoned=playerById(game,game.pendingSummon.playerId),monster=summoned?.monsters.find(item=>item.instanceId===game.pendingSummon.instanceId);
    if(monster){summoned.monsters=summoned.monsters.filter(item=>item.instanceId!==monster.instanceId);summoned.graveyard.push(monster.cardId)}
    game.pendingSummon=null;addLog(game,`${rule.name} paga ${cost} LP, nega a Invocação e envia o Monstro ao Cemitério.`);return;
  }
  throw ruleError(`A operação de efeito “${effect.type||'não definida'}” ainda não está implementada.`);
}

function playerById(game,id){return game.players.find(player=>player.userId===id)}
module.exports={resolve};
