(() => {
  const app = window.DuelistApp;
  if (!app) return;
  const { state, api, toast, modal, closeModal, cardImage, cardName, duelAction, esc } = app;
  let decoratedField = null;
  let syncedUserId = null;

  function label(text) {
    const node = document.createElement('div');
    node.className = 'field-label';
    node.textContent = text;
    return node;
  }

  function zones(player) {
    return `<div class="duel-zones">
      <button data-zone="deck" data-owner="${esc(player.userId)}"><span>DECK</span><b>${player.deckCount}</b></button>
      <button data-zone="graveyard" data-owner="${esc(player.userId)}"><span>CEMITÉRIO</span><b>${player.graveyard?.length || 0}</b></button>
    </div>`;
  }

  function decorate() {
    const duel = state.duel;
    if (state.user && state.user.id !== syncedUserId && state.user.appearance) {
      Object.assign(state.appearance, state.user.appearance);
      localStorage.setItem('duelistAppearance', JSON.stringify(state.appearance));
      syncedUserId = state.user.id;
    }
    const board = document.querySelector('.field');
    if (!board || duel?.status !== 'active' || decoratedField === board) return;
    decoratedField = board;
    const me = duel.players.find(player => player.userId === state.user.id);
    const opponent = duel.players.find(player => player.userId !== state.user.id);
    if (!me || !opponent) return;

    const labels = [...board.querySelectorAll('.field-label')];
    const rows = [...board.querySelectorAll('.field-row')];
    const handRow = board.querySelector('.hand-row');
    // duelBoard() creates three field rows: opponent monsters, own monsters,
    // and own backrow. The hand is a separate .hand-row.
    if (rows.length < 3 || labels.length < 4 || !handRow) return;
    const upper = document.createElement('section');
    upper.className = 'field-half opponent-half';
    upper.style.setProperty('--side-color', opponent.appearance?.field || '#263c35');
    upper.style.setProperty('--card-back-color', opponent.appearance?.back || '#27366f');
    upper.style.setProperty('--back-color', opponent.appearance?.back || '#27366f');
    const lower = document.createElement('section');
    lower.className = 'field-half player-half';
    lower.style.setProperty('--side-color', me.appearance?.field || state.appearance.field);
    lower.style.setProperty('--card-back-color', me.appearance?.back || state.appearance.back);
    lower.style.setProperty('--back-color', me.appearance?.back || state.appearance.back);

    const opponentBackrow = document.createElement('div');
    opponentBackrow.className = 'field-row opponent-backrow';
    const opponentBackrowCount = opponent.backrow?.length ?? opponent.backrowCount ?? 0;
    for (let i = 0; i < opponentBackrowCount; i++) {
      opponentBackrow.insertAdjacentHTML('beforeend', '<div class="field-card is-face-down"><span>Carta baixada</span></div>');
    }
    if (!opponentBackrowCount) opponentBackrow.innerHTML = '<span class="sub">Nenhuma carta baixada</span>';

    const ownBackrow = rows[2];
    ownBackrow.dataset.dropZone = 'backrow';
    ownBackrow.querySelectorAll('.field-card').forEach((node, index) => {
      const slot = me.backrowCards?.[index];
      if (!slot) return;
      node.dataset.cardId = slot.cardId;
      node.dataset.ownerId = me.userId;
      node.dataset.instanceId = slot.instanceId;
      node.dataset.action = 'duel-card';
    });
    const ownMonsterRow = rows[1];
    ownMonsterRow.dataset.dropZone = 'monster';
    labels[1].textContent = 'Monstros · arraste uma carta aqui para Invocar';
    rows[0].querySelectorAll('.field-card').forEach((card, index) => {
      const slot = opponent.monsters[index];
      if (!slot || slot.faceDown) return;
      card.dataset.cardId = slot.cardId;
      card.dataset.ownerId = opponent.userId;
      card.dataset.instanceId = slot.instanceId;
      card.dataset.action = 'duel-card';
      card.dataset.id = slot.cardId;
    });
    ownMonsterRow.querySelectorAll('.field-card').forEach((card, index) => {
      const slot = me.monsters[index];
      if (!slot) return;
      card.dataset.ownerId = me.userId;
      card.dataset.instanceId = slot.instanceId;
      if (slot.cardId) {
        card.dataset.cardId = slot.cardId;
        card.dataset.action = 'duel-card';
        card.dataset.id = slot.cardId;
      }
      if (slot.faceDown) card.classList.add('is-face-down');
    });

    handRow.querySelectorAll('.hand-card').forEach((card, index) => {
      const id = me.hand[index];
      if (!id) return;
      card.dataset.cardId = id;
      card.dataset.id = id;
      card.dataset.action = 'duel-card';
      card.draggable = true;
      card.querySelector('img')?.setAttribute('draggable', 'false');
      card.querySelectorAll('button').forEach(button => button.remove());
    });

    upper.append(
      document.createRange().createContextualFragment(zones(opponent)),
      label('Monstros do oponente'), rows[0],
      label('Magias e armadilhas do oponente'), opponentBackrow,
    );
    lower.append(
      document.createRange().createContextualFragment(zones(me)),
      labels[1], ownMonsterRow,
      labels[3], ownBackrow,
      labels[2], handRow,
    );
    board.replaceChildren(upper, label('CAMPO DE DUELO'), lower);
    board.style.setProperty('--field-color', me.appearance?.field || state.appearance.field);
    board.style.setProperty('--back-color', state.appearance.back);
    document.querySelectorAll('.field-half').forEach(half => {
      const owner = half === upper ? opponent : me;
      half.style.setProperty('--side-color', owner.appearance?.field || '#263c35');
      half.style.setProperty('--card-back-color', owner.appearance?.back || '#27366f');
      half.style.setProperty('--back-color', owner.appearance?.back || '#27366f');
    });

    const validAttacker = me.monsters.some(monster => !monster.faceDown && !monster.attacked);
    document.querySelectorAll('.field-card button[data-game-action="attack"]').forEach(button => {
      let reason = '';
      if (!duel.yourTurn) reason = 'Ataques só são permitidos no seu turno.';
      else if (duel.phase !== 'battle') reason = 'Ataques só são permitidos na Fase de Batalha.';
      else if (!validAttacker) reason = 'Você precisa de um monstro em posição de ataque que ainda não atacou.';
      if (reason) { button.disabled = true; button.title = reason; }
    });
    document.querySelectorAll('.field-card button[data-game-action="attack"][data-target=""]').forEach(button => {
      if (opponent.monsters.length) { button.disabled = true; button.title = 'Escolha um monstro do oponente como alvo.'; }
    });
  }

  function showZone(ownerId, zone) {
    const player = state.duel?.players.find(item => item.userId === ownerId);
    if (!player) return;
    const ids = zone === 'graveyard' ? (player.graveyard || []) : (player.userId === state.user.id ? (player.deckCards || []) : []);
    const title = zone === 'graveyard' ? 'Cemitério' : 'Deck';
    const cards = ids.length ? `<div class="zone-card-grid">${ids.map(id => {
      const card = state.cards.find(item => String(item.id) === String(id));
      return card ? `<article>${cardImage(card)}<span>${esc(card.name)}</span></article>` : `<article><span>${esc(cardName(id))}</span></article>`;
    }).join('')}</div>` : zone === 'deck' && player.userId !== state.user.id
      ? '<p>As cartas do Deck do oponente permanecem ocultas.</p>' : '<p>Esta zona está vazia.</p>';
    const count = zone === 'graveyard' ? (player.graveyard?.length || 0) : player.deckCount;
    modal(`<div class="modal-top"><h2>${title} · ${esc(player.name)} (${count})</h2><button class="close" data-action="close">×</button></div>${cards}`, true);
  }

  function performCardAction(action, payload) {
    const duel = state.duel;
    const me = duel?.players.find(player => player.userId === state.user.id);
    const card = state.cards.find(item => String(item.id) === String(payload.cardId));
    if (['summon', 'set'].includes(action) && /Monster/i.test(card?.type || '')) {
      if (!duel.yourTurn) return toast('Regra: você só pode Invocar monstros no seu turno.');
      if (!['main1', 'main2'].includes(duel.phase)) return toast('Regra: Invocações só são permitidas na Main Phase.');
      if (me.normalSummonUsed) return toast('Regra: você já fez sua Invocação-Normal ou baixou um monstro neste turno.');
      if (me.monsters.length >= 5) return toast('Regra: suas Zonas de Monstro estão cheias.');
      const tributes = Number(card.level) >= 7 ? 2 : Number(card.level) >= 5 ? 1 : 0;
      const selected = payload.tributeInstanceIds || [];
      if (selected.length !== tributes) return toast(`Regra: ${card.name} exige ${tributes} Tributo(s).`);
      if (me.monsters.filter(monster => !monster.faceDown).length < tributes) return toast(`Regra: faltam monstros em posição de ataque para oferecer como Tributo (${tributes}).`);
    }
    if (action === 'set' && card && !/Monster/i.test(card.type || '') && (me.backrowCount || 0) >= 5) {
      return toast('Regra: suas Zonas de Magia e Armadilha estão cheias.');
    }
    duelAction(action, payload);
  }

  function effectNeedsTarget(rule) {
    const operation = rule?.operation || {};
    return operation.type === 'specialSummon'
      || operation.type === 'modifyStats'
      || (operation.type === 'destroy' && !['all-backrow', 'all-monsters'].includes(operation.targeting))
      || (operation.type === 'returnToHand' && operation.targetSide !== 'attacking-monster');
  }

  function chooseEffectTarget(cardId, action, sourceInstanceId = '') {
    const duel = state.duel;
    const rule = duel.effectDefinitions?.[String(cardId)];
    const operation = rule?.operation || {};
    const me = duel.players.find(player => player.userId === state.user.id);
    let options = [];
    const cardTarget = operation.type === 'specialSummon';
    if (cardTarget) {
      const zone = operation.sourceZone === 'deck' ? me.deckCards : operation.sourceZone === 'hand' ? me.hand : me.graveyard;
      options = (zone || []).map(id => {
        const card = state.cards.find(item => String(item.id) === String(id));
        return card && /Monster/i.test(card.type || '') ? { value: id, title: card.name, detail: `${card.type}${card.atk != null ? ` · ${card.atk} ATK / ${card.def} DEF` : ''}`, card } : null;
      }).filter(Boolean);
    } else {
      const owners = operation.targetSide === 'self' ? [me]
        : operation.targetSide === 'all' ? duel.players
          : [duel.players.find(player => player.userId !== state.user.id)];
      options = owners.filter(Boolean).flatMap(owner => (owner.monsters || []).map(monster => {
        const card = state.cards.find(item => String(item.id) === String(monster.cardId));
        return { value: monster.instanceId, title: monster.faceDown && !card ? 'Monstro virado para baixo' : card?.name || 'Monstro', detail: `${owner.name}${!monster.faceDown && monster.atk != null ? ` · ${monster.atk} ATK` : ''}`, card: monster.faceDown && owner.userId !== state.user.id ? null : card };
      }));
    }
    if (!options.length) { toast('Não há alvos válidos no campo ou na zona exigida para este efeito.'); return; }
    const multiple = operation.targeting === 'up-to-two-monsters';
    const control = option => `<label class="effect-target"><input type="${multiple ? 'checkbox' : 'radio'}" name="effect-target" value="${esc(option.value)}">${option.card ? cardImage(option.card) : '<span class="effect-target-back">✦</span>'}<span><b>${esc(option.title)}</b><small>${esc(option.detail)}</small></span></label>`;
    const zoneName = cardTarget ? (operation.sourceZone === 'graveyard' ? 'Cemitério' : operation.sourceZone === 'deck' ? 'Deck' : 'mão') : 'campo';
    modal(`<div class="modal-top"><h2>${esc(rule.name)} · escolher alvo</h2><button class="close" data-action="close">×</button></div><p class="sub">Escolha uma carta do ${zoneName}${multiple ? ' (até 2)' : ''} para resolver o efeito.</p><div class="effect-target-list">${options.map(control).join('')}</div><button class="primary full" data-duel-command="resolve-effect" data-card="${esc(cardId)}" data-source-instance="${esc(sourceInstanceId)}" data-effect-action="${esc(action)}" data-multiple="${multiple}" data-card-target="${cardTarget}">RESOLVER EFEITO</button>`, true);
  }

  function openCard(id, ownerId = state.user.id, instanceId = '') {
    const card = state.cards.find(item => String(item.id) === String(id));
    if (!card) return;
    const me = state.duel.players.find(player => player.userId === state.user.id);
    const monster = me.monsters.find(item => instanceId ? item.instanceId === instanceId && item.faceDown : String(item.cardId) === String(id) && item.faceDown);
    const isMonster = /Monster/i.test(card.type || '');
    const tributes = Number(card.level) >= 7 ? 2 : Number(card.level) >= 5 ? 1 : 0;
    const faceDown = Boolean(monster);
    const setEntry = instanceId ? me.backrowCards?.find(item => item.instanceId === instanceId && String(item.cardId) === String(id)) : null;
    const isOwnCard = ownerId === state.user.id || me.hand.some(cardId => String(cardId) === String(id));
    const rule = state.duel.effectDefinitions?.[String(id)];
    const canActivate = isOwnCard && !isMonster && rule && !rule.source && rule.timing === 'main' && (!setEntry || /Spell/i.test(card.type || ''));
    const actionButtons = isOwnCard && state.duel.yourTurn && ['main1', 'main2'].includes(state.duel.phase)
      ? isMonster
        ? `<button class="primary" data-duel-command="summon" data-card="${esc(id)}" ${me.monsters.filter(item => !item.faceDown).length < tributes ? 'disabled title="Faltam monstros para oferecer como Tributo"' : ''}>INVOCAR EM ATAQUE</button><button class="secondary" data-duel-command="set" data-card="${esc(id)}">INVOCAR EM DEFESA (BAIXADO)</button>`
        : `${canActivate ? `<button class="primary" data-duel-command="activate-card" data-card="${esc(id)}" data-source-instance="${esc(setEntry?.instanceId || '')}">ATIVAR EFEITO</button>` : ''}${setEntry ? '' : `<button class="secondary" data-duel-command="set" data-card="${esc(id)}">BAIXAR</button>`}`
      : '';
    const tributeChoices = tributes ? `<fieldset class="tribute-select"><legend>Escolha ${tributes} Tributo(s)</legend>${me.monsters.filter(item => !item.faceDown).map(item => `<label><input type="checkbox" name="tribute" value="${esc(item.instanceId)}"><span>${esc(cardName(item.cardId))} · ${item.atk} ATK</span></label>`).join('') || '<p>Não há monstros disponíveis para Tributar.</p>'}<small>Enviar como Tributo não conta como destruir.</small></fieldset>` : '';
    modal(`<div class="modal-top"><h2>${esc(card.name)}</h2><button class="close" data-action="close">×</button></div><div class="duel-card-detail">${cardImage(card)}<div><span class="eyebrow">${esc(card.type)}</span><p>${esc(card.description || '')}</p>${card.level ? `<p>Nível ${card.level} · ${esc(card.attribute || '')} · ${esc(card.race || '')}</p>` : ''}${card.atk !== null ? `<b>ATK ${card.atk} / DEF ${card.def}</b>` : ''}${isOwnCard && tributes ? `<p>Invocação por Tributo: ${tributes} Tributo(s).</p>` : ''}${isOwnCard ? tributeChoices : ''}<div class="duel-card-actions">${faceDown && isOwnCard && state.duel.yourTurn && ['main1','main2'].includes(state.duel.phase) ? '<button class="primary" data-duel-command="flip" data-card="' + esc(id) + '" data-instance="' + esc(monster.instanceId) + '">INVOCAR POR VIRAR</button>' : actionButtons}</div></div></div>`, true);
  }

  document.addEventListener('click', event => {
    const zone = event.target.closest('[data-zone]');
    if (zone) { showZone(zone.dataset.owner, zone.dataset.zone); return; }
    const command = event.target.closest('[data-duel-command]');
    if (command) {
      const id = command.dataset.card;
      if (command.dataset.duelCommand === 'resolve-effect') {
        const selected = [...document.querySelectorAll('input[name="effect-target"]:checked')].map(input => input.value);
        if (!selected.length) { toast('Escolha pelo menos um alvo para este efeito.'); return; }
        if (command.dataset.multiple === 'true' && selected.length > 2) { toast('Este efeito permite selecionar no máximo 2 monstros.'); return; }
        const payload = { cardId: id };
        if (command.dataset.sourceInstance) payload.sourceInstanceId = command.dataset.sourceInstance;
        if (command.dataset.cardTarget === 'true') payload.targetCardId = selected[0];
        else { payload.targetInstanceId = selected[0]; payload.targetInstanceIds = selected; }
        const action = command.dataset.effectAction;
        closeModal(); performCardAction(action, payload); return;
      }
      if (['summon', 'set'].includes(command.dataset.duelCommand)) {
        const tributeInstanceIds = [...document.querySelectorAll('input[name="tribute"]:checked')].map(input => input.value);
        const card = state.cards.find(item => String(item.id) === String(id));
        const required = /Monster/i.test(card?.type || '') ? (Number(card?.level) >= 7 ? 2 : Number(card?.level) >= 5 ? 1 : 0) : 0;
        if (tributeInstanceIds.length !== required) { toast(`Selecione exatamente ${required} Tributo(s).`); return; }
        closeModal(); performCardAction(command.dataset.duelCommand, { cardId: id, tributeInstanceIds }); return;
      }
      if (command.dataset.duelCommand === 'activate-card') {
        const rule = state.duel.effectDefinitions?.[String(id)];
        if (effectNeedsTarget(rule)) { chooseEffectTarget(id, 'activate-card', command.dataset.sourceInstance); return; }
        closeModal(); performCardAction('activate-card', { cardId: id, ...(command.dataset.sourceInstance ? { sourceInstanceId: command.dataset.sourceInstance } : {}) }); return;
      }
      if (command.dataset.duelCommand === 'flip') { closeModal(); duelAction('flip', { monsterId: command.dataset.instance }); return; }
      closeModal(); duelAction(command.dataset.duelCommand, { cardId: id }); return;
    }
    const effectButton = event.target.closest('[data-game-action="activate"]');
    if (effectButton) {
      const id = effectButton.dataset.card;
      if (effectNeedsTarget(state.duel.effectDefinitions?.[String(id)])) {
        event.stopPropagation(); chooseEffectTarget(id, 'activate'); return;
      }
    }
    const handCard = event.target.closest('.hand-card[data-card-id]');
    if (handCard && !event.target.closest('button')) { event.stopPropagation(); openCard(handCard.dataset.cardId, handCard.dataset.ownerId, handCard.dataset.instanceId); return; }
    const fieldCard = event.target.closest('.field-card[data-card-id]');
    if (fieldCard && !event.target.closest('button')) { event.stopPropagation(); openCard(fieldCard.dataset.cardId, fieldCard.dataset.ownerId, fieldCard.dataset.instanceId); }
  }, true);

  document.addEventListener('dragstart', event => {
    const card = event.target.closest('.hand-card[draggable="true"]');
    if (card) {
      event.dataTransfer.setData('text/plain', card.dataset.cardId);
      event.dataTransfer.effectAllowed = 'move';
      card.classList.add('is-dragging');
    }
  });
  document.addEventListener('dragend', event => event.target.closest('.hand-card')?.classList.remove('is-dragging'));
  document.addEventListener('dragenter', event => {
    const zone = event.target.closest('[data-drop-zone]');
    if (zone) { event.preventDefault(); zone.classList.add('is-drop-target'); }
  });
  document.addEventListener('dragover', event => {
    const zone = event.target.closest('[data-drop-zone]');
    if (zone) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; }
  });
  document.addEventListener('dragleave', event => {
    const zone = event.target.closest('[data-drop-zone]');
    if (zone && !zone.contains(event.relatedTarget)) zone.classList.remove('is-drop-target');
  });
  document.addEventListener('drop', event => {
    const zone = event.target.closest('[data-drop-zone]');
    if (!zone) return;
    event.preventDefault();
    zone.classList.remove('is-drop-target');
    const cardId = event.dataTransfer.getData('text/plain');
    const card = state.cards.find(item => String(item.id) === String(cardId));
    if (!card) return;
    if (zone.dataset.dropZone === 'monster') {
      if (!/Monster/i.test(card.type || '')) { toast('Regra: só monstros podem entrar na Zona de Monstros.'); return; }
      const me = state.duel?.players.find(player => player.userId === state.user.id);
      if (!state.duel?.yourTurn) { toast('Regra: você só pode Invocar monstros no seu turno.'); return; }
      if (!['main1', 'main2'].includes(state.duel.phase)) { toast('Regra: Invocações só são permitidas na Main Phase.'); return; }
      if (me?.normalSummonUsed) { toast('Regra: você já fez sua Invocação-Normal ou baixou um monstro neste turno.'); return; }
      if ((me?.monsters.length || 0) >= 5) { toast('Regra: suas Zonas de Monstro estão cheias.'); return; }
      const required = Number(card.level) >= 7 ? 2 : Number(card.level) >= 5 ? 1 : 0;
      if (required) openCard(cardId);
      else performCardAction('summon', { cardId, tributeInstanceIds: [] });
    } else {
      if (/Monster/i.test(card.type || '')) { toast('Regra: monstros não podem entrar na Zona de Magias e Armadilhas.'); return; }
      performCardAction('set', { cardId });
    }
  });

  document.addEventListener('input', event => {
    const color = event.target.closest('[data-appearance]');
    if (!color) return;
    state.appearance[color.dataset.appearance] = color.value;
    localStorage.setItem('duelistAppearance', JSON.stringify(state.appearance));
    const me = state.duel?.players.find(player => player.userId === state.user?.id);
    document.querySelector('.player-half')?.style.setProperty('--side-color', state.appearance.field);
    document.querySelector('.field')?.style.setProperty('--back-color', state.appearance.back);
    if (me) me.appearance = { ...state.appearance };
  });
  document.addEventListener('change', async event => {
    const color = event.target.closest('[data-appearance]');
    if (!color || !state.user) return;
    try { await api('/api/account', { method: 'PATCH', body: JSON.stringify({ appearance: state.appearance }) }); }
    catch { toast('A cor ficou salva neste dispositivo; não foi sincronizada com a conta.'); }
  });

  const observer = new MutationObserver(() => {
    if (state.user && state.user.id !== syncedUserId && state.user.appearance) {
      Object.assign(state.appearance, state.user.appearance);
      localStorage.setItem('duelistAppearance', JSON.stringify(state.appearance));
      syncedUserId = state.user.id;
    }
    const field = document.querySelector('.field');
    if (field !== decoratedField) decorate();
  });
  observer.observe(document.querySelector('#app'), { childList: true, subtree: true });
})();

