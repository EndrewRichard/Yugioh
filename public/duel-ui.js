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
    if (rows.length < 4 || labels.length < 4) return;
    const upper = document.createElement('section');
    upper.className = 'field-half opponent-half';
    upper.style.setProperty('--side-color', opponent.appearance?.field || '#263c35');
    const lower = document.createElement('section');
    lower.className = 'field-half player-half';
    lower.style.setProperty('--side-color', me.appearance?.field || state.appearance.field);

    const opponentBackrow = document.createElement('div');
    opponentBackrow.className = 'field-row opponent-backrow';
    for (let i = 0; i < (opponent.backrowCount || 0); i++) {
      opponentBackrow.insertAdjacentHTML('beforeend', '<div class="field-card is-face-down"><span>Carta baixada</span></div>');
    }
    if (!opponent.backrowCount) opponentBackrow.innerHTML = '<span class="sub">Nenhuma carta baixada</span>';

    const ownBackrow = rows[3];
    ownBackrow.dataset.dropZone = 'backrow';
    const ownMonsterRow = rows[1];
    ownMonsterRow.dataset.dropZone = 'monster';
    rows[0].querySelectorAll('.field-card').forEach((card, index) => {
      const slot = opponent.monsters[index];
      if (!slot || slot.faceDown) return;
      card.dataset.cardId = slot.cardId;
      card.dataset.ownerId = opponent.userId;
      card.dataset.action = 'duel-card';
      card.dataset.id = slot.cardId;
    });
    ownMonsterRow.querySelectorAll('.field-card').forEach((card, index) => {
      const slot = me.monsters[index];
      if (!slot) return;
      card.dataset.ownerId = me.userId;
      if (slot.cardId) {
        card.dataset.cardId = slot.cardId;
        card.dataset.action = 'duel-card';
        card.dataset.id = slot.cardId;
      }
      if (slot.faceDown) card.classList.add('is-face-down');
    });

    const handRow = rows[2];
    handRow.querySelectorAll('.hand-card').forEach((card, index) => {
      const id = me.hand[index];
      if (!id) return;
      card.dataset.cardId = id;
      card.dataset.id = id;
      card.dataset.action = 'duel-card';
      card.draggable = true;
      card.querySelectorAll('button').forEach(button => button.remove());
    });

    upper.append(
      document.createRange().createContextualFragment(zones(opponent)),
      label('Monstros do oponente'), rows[0],
      label('Magias e armadilhas do oponente'), opponentBackrow,
    );
    lower.append(
      document.createRange().createContextualFragment(zones(me)),
      labels[3], ownBackrow,
      labels[1], ownMonsterRow,
      labels[2], handRow,
    );
    board.replaceChildren(upper, label('CAMPO DE DUELO'), lower);
    board.style.setProperty('--field-color', me.appearance?.field || state.appearance.field);
    board.style.setProperty('--back-color', state.appearance.back);
    document.querySelectorAll('.field-half').forEach(half => half.style.setProperty('--side-color', half === upper ? (opponent.appearance?.field || '#263c35') : (me.appearance?.field || state.appearance.field)));

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

  function openCard(id) {
    const card = state.cards.find(item => String(item.id) === String(id));
    if (!card) return;
    const me = state.duel.players.find(player => player.userId === state.user.id);
    const monster = me.monsters.find(item => String(item.cardId) === String(id) && item.faceDown);
    const isMonster = /Monster/i.test(card.type || '');
    const tributes = Number(card.level) >= 7 ? 2 : Number(card.level) >= 5 ? 1 : 0;
    const faceDown = Boolean(monster);
    const rule = state.duel.effectDefinitions?.[String(id)];
    const canActivate = !isMonster && rule && !rule.source && rule.timing === 'main';
    const actionButtons = state.duel.yourTurn && ['main1', 'main2'].includes(state.duel.phase)
      ? isMonster
        ? `<button class="primary" data-duel-command="summon" data-card="${esc(id)}" ${me.monsters.filter(item => !item.faceDown).length < tributes ? 'disabled title="Faltam monstros para oferecer como Tributo"' : ''}>INVOCAR</button><button class="secondary" data-duel-command="set" data-card="${esc(id)}">BAIXAR</button>`
        : `${canActivate ? `<button class="primary" data-duel-command="activate-card" data-card="${esc(id)}">ATIVAR EFEITO</button>` : ''}<button class="secondary" data-duel-command="set" data-card="${esc(id)}">BAIXAR</button>`
      : '';
    const tributeChoices = tributes ? `<fieldset class="tribute-select"><legend>Escolha ${tributes} Tributo(s)</legend>${me.monsters.filter(item => !item.faceDown).map(item => `<label><input type="checkbox" name="tribute" value="${esc(item.instanceId)}"><span>${esc(cardName(item.cardId))} · ${item.atk} ATK</span></label>`).join('') || '<p>Não há monstros disponíveis para Tributar.</p>'}<small>Enviar como Tributo não conta como destruir.</small></fieldset>` : '';
    modal(`<div class="modal-top"><h2>${esc(card.name)}</h2><button class="close" data-action="close">×</button></div><div class="duel-card-detail">${cardImage(card)}<div><span class="eyebrow">${esc(card.type)}</span><p>${esc(card.description || '')}</p>${card.level ? `<p>Nível ${card.level} · ${esc(card.attribute || '')} · ${esc(card.race || '')}</p>` : ''}${card.atk !== null ? `<b>ATK ${card.atk} / DEF ${card.def}</b>` : ''}${tributes ? `<p>Invocação por Tributo: ${tributes} Tributo(s).</p>` : ''}${tributeChoices}<div class="duel-card-actions">${faceDown && state.duel.yourTurn && ['main1','main2'].includes(state.duel.phase) ? '<button class="primary" data-duel-command="flip" data-card="' + esc(id) + '" data-instance="' + esc(monster.instanceId) + '">INVOCAR POR VIRAR</button>' : actionButtons}</div></div></div>`, true);
  }

  document.addEventListener('click', event => {
    const zone = event.target.closest('[data-zone]');
    if (zone) { showZone(zone.dataset.owner, zone.dataset.zone); return; }
    const command = event.target.closest('[data-duel-command]');
    if (command) {
      const id = command.dataset.card;
      if (['summon', 'set'].includes(command.dataset.duelCommand)) {
        const tributeInstanceIds = [...document.querySelectorAll('input[name="tribute"]:checked')].map(input => input.value);
        const card = state.cards.find(item => String(item.id) === String(id));
        const required = /Monster/i.test(card?.type || '') ? (Number(card?.level) >= 7 ? 2 : Number(card?.level) >= 5 ? 1 : 0) : 0;
        if (tributeInstanceIds.length !== required) { toast(`Selecione exatamente ${required} Tributo(s).`); return; }
        closeModal(); duelAction(command.dataset.duelCommand, { cardId: id, tributeInstanceIds }); return;
      }
      if (command.dataset.duelCommand === 'activate-card') { closeModal(); duelAction('activate-card', { cardId: id }); return; }
      if (command.dataset.duelCommand === 'flip') { closeModal(); duelAction('flip', { monsterId: command.dataset.instance }); return; }
      closeModal(); duelAction(command.dataset.duelCommand, { cardId: id }); return;
    }
    const handCard = event.target.closest('.hand-card[data-card-id]');
    if (handCard && !event.target.closest('button')) { openCard(handCard.dataset.cardId); return; }
    const fieldCard = event.target.closest('.field-card[data-card-id]');
    if (fieldCard && !event.target.closest('button')) openCard(fieldCard.dataset.cardId);
  });

  document.addEventListener('dragstart', event => {
    const card = event.target.closest('.hand-card[draggable="true"]');
    if (card) event.dataTransfer.setData('text/plain', card.dataset.cardId);
  });
  document.addEventListener('dragover', event => { if (event.target.closest('[data-drop-zone]')) event.preventDefault(); });
  document.addEventListener('drop', event => {
    const zone = event.target.closest('[data-drop-zone]');
    if (!zone) return;
    event.preventDefault();
    const cardId = event.dataTransfer.getData('text/plain');
    const card = state.cards.find(item => String(item.id) === String(cardId));
    if (!card) return;
    if (zone.dataset.dropZone === 'monster') {
      if (!/Monster/i.test(card.type || '')) { toast('Regra: só monstros podem entrar na Zona de Monstros.'); return; }
      openCard(cardId);
    } else {
      if (/Monster/i.test(card.type || '')) { toast('Regra: monstros não podem entrar na Zona de Magias e Armadilhas.'); return; }
      duelAction('set', { cardId });
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
