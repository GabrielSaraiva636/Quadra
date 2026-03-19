const state = {
  token: localStorage.getItem('token') || null,
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  games: [],
  products: [],
  currentGameId: null
};

const el = {
  loginSection: document.getElementById('loginSection'),
  mainSection: document.getElementById('mainSection'),
  currentUser: document.getElementById('currentUser'),
  toast: document.getElementById('toast'),

  loginForm: document.getElementById('loginForm'),
  loginIdentifier: document.getElementById('loginIdentifier'),
  loginPassword: document.getElementById('loginPassword'),
  logoutBtn: document.getElementById('logoutBtn'),
  refreshAllBtn: document.getElementById('refreshAllBtn'),

  tabs: document.getElementById('tabs'),
  usersTabBtn: document.getElementById('usersTabBtn'),

  gameFilterForm: document.getElementById('gameFilterForm'),
  filterDate: document.getElementById('filterDate'),
  filterResponsible: document.getElementById('filterResponsible'),
  gamesTableBody: document.querySelector('#gamesTable tbody'),
  clearGameFormBtn: document.getElementById('clearGameFormBtn'),

  gameFormTitle: document.getElementById('gameFormTitle'),
  gameForm: document.getElementById('gameForm'),
  gameId: document.getElementById('gameId'),
  gameName: document.getElementById('gameName'),
  gameDate: document.getElementById('gameDate'),
  gameResponsible: document.getElementById('gameResponsible'),
  gameStart: document.getElementById('gameStart'),
  gameEnd: document.getElementById('gameEnd'),
  gamePrice: document.getElementById('gamePrice'),
  gamePayingPlayers: document.getElementById('gamePayingPlayers'),
  gameStatus: document.getElementById('gameStatus'),

  pdvGameForm: document.getElementById('pdvGameForm'),
  pdvGameSelect: document.getElementById('pdvGameSelect'),
  pdvGameSummary: document.getElementById('pdvGameSummary'),
  pdvGameAccount: document.getElementById('pdvGameAccount'),
  pdvGameStatus: document.getElementById('pdvGameStatus'),
  loadGamePayersBtn: document.getElementById('loadGamePayersBtn'),
  gamePayersDetails: document.getElementById('gamePayersDetails'),
  pdvCustomersTableBody: document.querySelector('#pdvCustomersTable tbody'),
  customerItemForm: document.getElementById('customerItemForm'),
  itemCustomerName: document.getElementById('itemCustomerName'),
  itemProductSelect: document.getElementById('itemProductSelect'),
  itemQuantity: document.getElementById('itemQuantity'),
  itemIsPayingPlayer: document.getElementById('itemIsPayingPlayer'),
  itemIsPaid: document.getElementById('itemIsPaid'),
  itemPaymentMethod: document.getElementById('itemPaymentMethod'),
  paymentForm: document.getElementById('paymentForm'),
  paymentAccountType: document.getElementById('paymentAccountType'),
  paymentCustomerSelect: document.getElementById('paymentCustomerSelect'),
  paymentAmount: document.getElementById('paymentAmount'),
  paymentMethod: document.getElementById('paymentMethod'),
  customerDetails: document.getElementById('customerDetails'),

  productFilterForm: document.getElementById('productFilterForm'),
  productFilterQ: document.getElementById('productFilterQ'),
  productFilterActiveOnly: document.getElementById('productFilterActiveOnly'),
  productsTableBody: document.querySelector('#productsTable tbody'),
  productFormTitle: document.getElementById('productFormTitle'),
  productForm: document.getElementById('productForm'),
  productId: document.getElementById('productId'),
  productName: document.getElementById('productName'),
  productCategory: document.getElementById('productCategory'),
  productStock: document.getElementById('productStock'),
  productMin: document.getElementById('productMin'),
  productSale: document.getElementById('productSale'),
  productCost: document.getElementById('productCost'),
  productActive: document.getElementById('productActive'),
  stockAdjustForm: document.getElementById('stockAdjustForm'),
  stockAdjustProduct: document.getElementById('stockAdjustProduct'),
  stockAdjustType: document.getElementById('stockAdjustType'),
  stockAdjustQty: document.getElementById('stockAdjustQty'),
  stockMovementsTableBody: document.querySelector('#stockMovementsTable tbody'),

  cashOpenForm: document.getElementById('cashOpenForm'),
  cashOpeningAmount: document.getElementById('cashOpeningAmount'),
  loadCashSummaryBtn: document.getElementById('loadCashSummaryBtn'),
  cashSummaryBox: document.getElementById('cashSummaryBox'),

  indicatorGameForm: document.getElementById('indicatorGameForm'),
  indicatorGameSelect: document.getElementById('indicatorGameSelect'),
  indicatorGameBox: document.getElementById('indicatorGameBox'),
  indicatorMonthlyForm: document.getElementById('indicatorMonthlyForm'),
  indicatorMonth: document.getElementById('indicatorMonth'),
  indicatorYear: document.getElementById('indicatorYear'),
  indicatorMonthlyBox: document.getElementById('indicatorMonthlyBox'),
  indicatorStockBtn: document.getElementById('indicatorStockBtn'),
  indicatorStockBox: document.getElementById('indicatorStockBox'),
  indicatorCommissionForm: document.getElementById('indicatorCommissionForm'),
  commissionMonth: document.getElementById('commissionMonth'),
  commissionYear: document.getElementById('commissionYear'),
  indicatorCommissionBox: document.getElementById('indicatorCommissionBox'),

  usersTableBody: document.querySelector('#usersTable tbody'),
  userForm: document.getElementById('userForm'),
  userName: document.getElementById('userName'),
  userEmail: document.getElementById('userEmail'),
  userPassword: document.getElementById('userPassword'),
  userRole: document.getElementById('userRole')
};

function showToast(message, isError = false) {
  el.toast.textContent = message;
  el.toast.style.background = isError ? '#8a1d14' : '#111827';
  el.toast.classList.remove('hidden');
  setTimeout(() => el.toast.classList.add('hidden'), 3500);
}

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  return d.toLocaleDateString('pt-BR');
}

function yesNo(value) {
  return Number(value) === 1 ? 'Sim' : 'Nao';
}

function roleLabel(role) {
  return role === 'admin' ? 'Administrador' : role === 'atendente' ? 'Atendente' : role;
}

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const res = await fetch(path, { ...options, headers });
  let payload = null;
  try {
    payload = await res.json();
  } catch (_e) {
    payload = null;
  }

  if (!res.ok) {
    const msg = payload?.message || 'Falha na requisicao';
    throw new Error(msg);
  }

  return payload;
}

function setAuthUI(authenticated) {
  el.loginSection.classList.toggle('hidden', authenticated);
  el.mainSection.classList.toggle('hidden', !authenticated);

  if (authenticated && state.user) {
    el.currentUser.textContent = `${state.user.name} (${roleLabel(state.user.role)})`;
    el.usersTabBtn.classList.toggle('hidden', state.user.role !== 'admin');
  }
}

function switchTab(tabKey) {
  document.querySelectorAll('.tab-content').forEach((section) => section.classList.add('hidden'));
  document.getElementById(`tab-${tabKey}`).classList.remove('hidden');

  document.querySelectorAll('#tabs button').forEach((btn) => btn.classList.remove('active'));
  const btn = document.querySelector(`#tabs button[data-tab="${tabKey}"]`);
  if (btn) btn.classList.add('active');
}

function fillGameSelects() {
  const options = ['<option value="">Selecione</option>']
    .concat(state.games.map((g) => `<option value="${g.id}">${g.name} - ${fmtDate(g.date)} ${String(g.start_time).slice(0,5)}</option>`))
    .join('');

  el.pdvGameSelect.innerHTML = options;
  el.indicatorGameSelect.innerHTML = options;
}

function fillProductSelects() {
  const activeProducts = state.products.filter((p) => Number(p.active) === 1);
  const options = ['<option value="">Selecione</option>']
    .concat(activeProducts.map((p) => `<option value="${p.id}">${p.name} (estoque: ${p.stock_quantity})</option>`))
    .join('');

  el.itemProductSelect.innerHTML = options;

  const all = ['<option value="">Selecione</option>']
    .concat(state.products.map((p) => `<option value="${p.id}">${p.name}</option>`))
    .join('');
  el.stockAdjustProduct.innerHTML = all;
}

async function loadGames(params = {}) {
  const query = new URLSearchParams();
  if (params.date) query.set('date', params.date);
  if (params.responsible) query.set('responsible', params.responsible);

  const path = query.toString() ? `/api/games?${query.toString()}` : '/api/games';
  state.games = await api(path);
  renderGames();
  fillGameSelects();
}

function renderGames() {
  el.gamesTableBody.innerHTML = state.games.map((g) => `
    <tr>
      <td>${g.name}</td>
      <td>${fmtDate(g.date)}</td>
      <td>${String(g.start_time).slice(0,5)}</td>
      <td>${String(g.end_time).slice(0,5)}</td>
      <td>${g.responsible_name}</td>
      <td>${g.paying_players_count || 1}</td>
      <td>${money(g.value_per_player || 0)}</td>
      <td>${g.status_description}</td>
      <td>${money(g.total_game_value)}</td>
      <td>${money(g.total_game_paid)}</td>
      <td>${money(g.total_game_pending)}</td>
      <td>
        <button data-game-action="open" data-id="${g.id}">Gerenciar</button>
        <button data-game-action="edit" data-id="${g.id}">Editar</button>
        <button data-game-action="delete" data-id="${g.id}" class="danger">Excluir</button>
      </td>
    </tr>
  `).join('');
}

function resetGameForm() {
  el.gameFormTitle.textContent = 'Cadastro de jogo';
  el.gameId.value = '';
  el.gameForm.reset();
  el.gamePayingPlayers.value = '10';
  el.gameStatus.value = '4';
}

function loadGameIntoForm(gameId) {
  const g = state.games.find((x) => x.id === Number(gameId));
  if (!g) return;

  el.gameFormTitle.textContent = `Edicao do jogo #${g.id}`;
  el.gameId.value = g.id;
  el.gameName.value = g.name;
  el.gameDate.value = String(g.date).slice(0, 10);
  el.gameResponsible.value = g.responsible_name;
  el.gameStart.value = String(g.start_time).slice(0, 5);
  el.gameEnd.value = String(g.end_time).slice(0, 5);
  el.gamePrice.value = g.price_per_hour;
  el.gamePayingPlayers.value = g.paying_players_count || 1;
  el.gameStatus.value = g.game_status_id;
}

async function submitGameForm(event) {
  event.preventDefault();

  const id = el.gameId.value;
  const payload = {
    name: el.gameName.value,
    date: el.gameDate.value,
    responsible_name: el.gameResponsible.value,
    start_time: el.gameStart.value,
    end_time: el.gameEnd.value,
    price_per_hour: Number(el.gamePrice.value),
    paying_players_count: Number(el.gamePayingPlayers.value),
    game_status_id: Number(el.gameStatus.value)
  };

  if (id) {
    await api(`/api/games/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    showToast('Jogo atualizado.');
  } else {
    await api('/api/games', { method: 'POST', body: JSON.stringify(payload) });
    showToast('Jogo criado.');
  }

  resetGameForm();
  await loadGames({ date: el.filterDate.value, responsible: el.filterResponsible.value });
}

async function handleGameTableClick(event) {
  const button = event.target.closest('button[data-game-action]');
  if (!button) return;

  const action = button.dataset.gameAction;
  const gameId = Number(button.dataset.id);

  if (action === 'edit') {
    loadGameIntoForm(gameId);
    return;
  }

  if (action === 'open') {
    switchTab('pdv');
    el.pdvGameSelect.value = String(gameId);
    await loadPDVOverview(gameId);
    return;
  }

  if (action === 'delete') {
    const ok = window.confirm('Confirma exclusao do jogo?');
    if (!ok) return;
    await api(`/api/games/${gameId}`, { method: 'DELETE' });
    showToast('Jogo excluido.');
    await loadGames({ date: el.filterDate.value, responsible: el.filterResponsible.value });
  }
}

async function loadProducts() {
  const query = new URLSearchParams();
  if (el.productFilterQ.value) query.set('q', el.productFilterQ.value);
  if (el.productFilterActiveOnly.checked) query.set('active_only', '1');

  const path = query.toString() ? `/api/products?${query.toString()}` : '/api/products';
  state.products = await api(path);
  renderProducts();
  fillProductSelects();
}

function renderProducts() {
  el.productsTableBody.innerHTML = state.products.map((p) => `
    <tr>
      <td>${p.name}</td>
      <td>${p.category_name || p.category}</td>
      <td>${p.stock_quantity}</td>
      <td>${p.min_quantity}</td>
      <td>${money(p.sale_price)}</td>
      <td>${money(p.cost_price)}</td>
      <td>${Number(p.active) === 1 ? 'Sim' : 'Nao'}</td>
      <td><button data-product-edit="${p.id}">Editar</button></td>
    </tr>
  `).join('');
}

function resetProductForm() {
  el.productFormTitle.textContent = 'Cadastro de produto';
  el.productId.value = '';
  el.productForm.reset();
  el.productCategory.value = '1';
  el.productActive.value = '1';
  el.productStock.value = '0';
  el.productMin.value = '0';
}

function fillProductForm(productId) {
  const p = state.products.find((x) => x.id === Number(productId));
  if (!p) return;

  el.productFormTitle.textContent = `Edicao de produto #${p.id}`;
  el.productId.value = p.id;
  el.productName.value = p.name;
  el.productCategory.value = p.category;
  el.productStock.value = p.stock_quantity;
  el.productMin.value = p.min_quantity;
  el.productSale.value = p.sale_price;
  el.productCost.value = p.cost_price;
  el.productActive.value = p.active;
}

async function loadPDVOverview(gameId) {
  if (!gameId) return;

  state.currentGameId = Number(gameId);
  const data = await api(`/api/games/${gameId}/overview`);

  const game = data.game;
  el.customerDetails.innerHTML = '<p>Selecione um cliente para ver o detalhamento completo.</p>';
  el.gamePayersDetails.innerHTML = '<p>Clique no botao para ver quem ja pagou o horario.</p>';
  el.pdvGameSummary.innerHTML = `
    <h3>${game.name}</h3>
    <div class="metric">Data: ${fmtDate(game.date)}</div>
    <div class="metric">Horario: ${String(game.start_time).slice(0,5)} - ${String(game.end_time).slice(0,5)}</div>
    <div class="metric">Responsavel: ${game.responsible_name}</div>
  `;

  el.pdvGameAccount.innerHTML = `
    <h3>Conta do jogo</h3>
    <div class="metric">Total: ${money(game.total_game_value)}</div>
    <div class="metric">Pagantes: ${game.paying_players_count || 1}</div>
    <div class="metric">Valor por jogador: ${money(game.value_per_player || 0)}</div>
    <div class="metric">Pago: ${money(game.game_paid)}</div>
    <div class="metric">Pendente: ${money(game.game_pending)}</div>
  `;

  el.pdvGameStatus.innerHTML = `
    <h3>Status</h3>
    <div class="metric">${game.status_description}</div>
    <div class="metric">Clientes: ${data.customers.length}</div>
  `;

  el.pdvCustomersTableBody.innerHTML = data.customers.map((c) => `
    <tr>
      <td>${c.name}</td>
      <td>${yesNo(c.is_paying_player)}</td>
      <td>${money(c.game_share)}</td>
      <td>${money(c.total_consumed)}</td>
      <td>${money(c.total_account)}</td>
      <td>${money(c.total_paid)}</td>
      <td>${money(c.pending)}</td>
      <td>
        <button data-customer-details="${c.id}">Detalhes</button>
        <button data-customer-toggle-payer="${c.id}" data-next-payer="${Number(c.is_paying_player) === 1 ? 0 : 1}">
          ${Number(c.is_paying_player) === 1 ? 'Remover pagante' : 'Marcar pagante'}
        </button>
      </td>
    </tr>
  `).join('');

  const customerOptions = ['<option value="">Sem cliente</option>']
    .concat(data.customers.map((c) => `<option value="${c.id}">${c.name}</option>`))
    .join('');
  el.paymentCustomerSelect.innerHTML = customerOptions;

  await loadGamePayersDetails(state.currentGameId);
  await loadPaymentsList();
}

async function loadCustomerDetails(customerId) {
  const data = await api(`/api/customers/${customerId}/details`);
  const rows = data.items.map((item) => `
    <tr>
      <td>${item.product_name}</td>
      <td>${item.quantity}</td>
      <td>${money(item.unit_price)}</td>
      <td>${money(item.total_price)}</td>
      <td>${item.payment_status}</td>
    </tr>
  `).join('');
  const paymentRows = data.payments.map((payment) => `
    <tr>
      <td>${new Date(payment.created_at).toLocaleString('pt-BR')}</td>
      <td>${payment.account_type}</td>
      <td>${payment.payment_method}</td>
      <td>${money(payment.amount)}</td>
      <td>${payment.created_by_name}</td>
    </tr>
  `).join('');

  el.customerDetails.innerHTML = `
    <h4>${data.customer.name}</h4>
    <div class="metric">Pagante do horario: ${yesNo(data.summary.is_paying_player)}</div>
    <div class="metric">Consumo da copa: ${money(data.summary.total_consumed)}</div>
    <div class="metric">Cota do horario: ${money(data.summary.game_share)}</div>
    <div class="metric">Total conta: ${money(data.summary.total_account)}</div>
    <div class="metric">Total pago: ${money(data.summary.total_paid)}</div>
    <div class="metric">Pendente: ${money(data.summary.pending)}</div>
    <h4>Itens consumidos</h4>
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Item</th><th>Qtd</th><th>Unitario</th><th>Total</th><th>Status</th></tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="5">Sem itens</td></tr>'}</tbody>
      </table>
    </div>
    <h4>Pagamentos da pessoa</h4>
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Data</th><th>Tipo</th><th>Forma</th><th>Valor</th><th>Lancado por</th></tr>
        </thead>
        <tbody>${paymentRows || '<tr><td colspan="5">Sem pagamentos para este cliente</td></tr>'}</tbody>
      </table>
    </div>
  `;
}

async function loadGamePayersDetails(gameId = state.currentGameId) {
  if (!gameId) return;

  const data = await api(`/api/games/${gameId}/payers`);
  const rows = data.customers.map((c) => `
    <tr>
      <td>${c.name}</td>
      <td>${money(c.game_share)}</td>
      <td>${money(c.total_paid)}</td>
      <td>${money(c.pending_share)}</td>
      <td>${c.has_paid_share ? 'Quitado' : 'Pendente'}</td>
    </tr>
  `).join('');

  el.gamePayersDetails.innerHTML = `
    <div class="metric">Valor por pagante: ${money(data.game.value_per_player)}</div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Cliente</th><th>Cota</th><th>Pago</th><th>Pendente</th><th>Status</th></tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="5">Nenhum pagante marcado</td></tr>'}</tbody>
      </table>
    </div>
  `;
}

async function loadPaymentsList() {
  if (!state.currentGameId) return;
  const payments = await api(`/api/payments?game_id=${state.currentGameId}`);

  const info = payments.slice(0, 8).map((p) => {
    const who = p.customer_name || 'Conta do jogo';
    return `<li>${money(p.amount)} - ${p.payment_method} - ${who}</li>`;
  }).join('');

  const html = info || '<li>Sem pagamentos recentes</li>';
  const block = `<h4>Pagamentos recentes</h4><ul>${html}</ul>`;
  el.customerDetails.insertAdjacentHTML('beforeend', block);
}

async function loadStockMovements() {
  const rows = await api('/api/products/stock/movements');
  el.stockMovementsTableBody.innerHTML = rows.map((r) => `
    <tr>
      <td>${new Date(r.created_at).toLocaleString('pt-BR')}</td>
      <td>${r.product_name}</td>
      <td>${r.movement_type}</td>
      <td>${r.quantity}</td>
      <td>${r.user_name}</td>
    </tr>
  `).join('');
}

async function loadCashSummary() {
  const data = await api('/api/cash-register/today');

  if (!data.opened) {
    el.cashSummaryBox.innerHTML = `<p>${data.message}</p>`;
    return;
  }

  el.cashSummaryBox.innerHTML = `
    <div class="metric">Valor inicial: ${money(data.summary.opening_amount)}</div>
    <div class="metric">Recebido em dinheiro: ${money(data.summary.cash_received)}</div>
    <div class="metric">Caixa esperado: ${money(data.summary.expected_cash_now)}</div>
    <div class="metric">Recebido em pix: ${money(data.summary.pix_received)}</div>
    <div class="metric">Recebido em cartao: ${money(data.summary.card_received)}</div>
    <div class="metric">Total do dia: ${money(data.summary.total_day)}</div>
  `;
}

async function loadUsers() {
  if (state.user?.role !== 'admin') return;
  const users = await api('/api/users');
  el.usersTableBody.innerHTML = users.map((u) => `
    <tr>
      <td>${u.name}</td>
      <td>${u.email}</td>
      <td>${roleLabel(u.role)}</td>
      <td>${new Date(u.created_at).toLocaleString('pt-BR')}</td>
    </tr>
  `).join('');
}

function setCurrentMonthYear() {
  const d = new Date();
  const m = d.getMonth() + 1;
  const y = d.getFullYear();
  el.indicatorMonth.value = String(m);
  el.indicatorYear.value = String(y);
  el.commissionMonth.value = String(m);
  el.commissionYear.value = String(y);
}

async function refreshAll() {
  await Promise.all([
    loadGames({ date: el.filterDate.value, responsible: el.filterResponsible.value }),
    loadProducts()
  ]);
  await loadStockMovements();
  await loadCashSummary();
  await loadUsers();
}

function bindEvents() {
  el.loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const payload = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier: el.loginIdentifier.value,
          password: el.loginPassword.value
        })
      });

      state.token = payload.token;
      state.user = payload.user;
      localStorage.setItem('token', state.token);
      localStorage.setItem('user', JSON.stringify(state.user));
      setAuthUI(true);
      await refreshAll();
      showToast('Login realizado.');
    } catch (err) {
      showToast(err.message, true);
    }
  });

  el.logoutBtn.addEventListener('click', () => {
    state.token = null;
    state.user = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setAuthUI(false);
  });

  el.refreshAllBtn.addEventListener('click', async () => {
    try {
      await refreshAll();
      showToast('Dados atualizados.');
    } catch (err) {
      showToast(err.message, true);
    }
  });

  el.tabs.addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-tab]');
    if (!btn) return;
    switchTab(btn.dataset.tab);
  });

  el.gameFilterForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await loadGames({ date: el.filterDate.value, responsible: el.filterResponsible.value });
    } catch (err) {
      showToast(err.message, true);
    }
  });

  el.clearGameFormBtn.addEventListener('click', resetGameForm);
  el.gameForm.addEventListener('submit', async (event) => {
    try {
      await submitGameForm(event);
    } catch (err) {
      showToast(err.message, true);
    }
  });

  el.gamesTableBody.addEventListener('click', async (event) => {
    try {
      await handleGameTableClick(event);
    } catch (err) {
      showToast(err.message, true);
    }
  });

  el.pdvGameForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await loadPDVOverview(Number(el.pdvGameSelect.value));
    } catch (err) {
      showToast(err.message, true);
    }
  });

  el.pdvCustomersTableBody.addEventListener('click', async (event) => {
    const detailsBtn = event.target.closest('button[data-customer-details]');
    if (detailsBtn) {
      try {
        await loadCustomerDetails(Number(detailsBtn.dataset.customerDetails));
      } catch (err) {
        showToast(err.message, true);
      }
      return;
    }

    const toggleBtn = event.target.closest('button[data-customer-toggle-payer]');
    if (!toggleBtn) return;

    try {
      if (!state.currentGameId) throw new Error('Selecione um jogo no PDV.');

      await api(`/api/games/${state.currentGameId}/customers/${Number(toggleBtn.dataset.customerTogglePayer)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          is_paying_player: Number(toggleBtn.dataset.nextPayer)
        })
      });

      showToast('Pagante do horario atualizado.');
      await loadPDVOverview(state.currentGameId);
    } catch (err) {
      showToast(err.message, true);
    }
  });

  el.customerItemForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      if (!state.currentGameId) throw new Error('Selecione um jogo no PDV.');

      await api('/api/customer-items', {
        method: 'POST',
        body: JSON.stringify({
          game_id: state.currentGameId,
          customer_name: el.itemCustomerName.value,
          is_paying_player: el.itemIsPayingPlayer.value === 'true',
          product_id: Number(el.itemProductSelect.value),
          quantity: Number(el.itemQuantity.value),
          is_paid: el.itemIsPaid.value === 'true',
          payment_method_id: el.itemPaymentMethod.value ? Number(el.itemPaymentMethod.value) : null
        })
      });

      showToast('Item registrado.');
      el.customerItemForm.reset();
      await refreshAll();
      await loadPDVOverview(state.currentGameId);
      await loadGamePayersDetails(state.currentGameId);
    } catch (err) {
      showToast(err.message, true);
    }
  });

  el.paymentForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      if (!state.currentGameId) throw new Error('Selecione um jogo no PDV.');

      await api('/api/payments', {
        method: 'POST',
        body: JSON.stringify({
          game_id: state.currentGameId,
          customer_id: el.paymentCustomerSelect.value ? Number(el.paymentCustomerSelect.value) : null,
          account_type_id: Number(el.paymentAccountType.value),
          amount: Number(el.paymentAmount.value),
          payment_method_id: Number(el.paymentMethod.value)
        })
      });

      showToast('Pagamento registrado.');
      el.paymentForm.reset();
      await loadPDVOverview(state.currentGameId);
      await loadGamePayersDetails(state.currentGameId);
      await loadCashSummary();
    } catch (err) {
      showToast(err.message, true);
    }
  });

  el.loadGamePayersBtn.addEventListener('click', async () => {
    try {
      if (!state.currentGameId) throw new Error('Selecione um jogo no PDV.');
      await loadGamePayersDetails(state.currentGameId);
    } catch (err) {
      showToast(err.message, true);
    }
  });

  el.productFilterForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await loadProducts();
    } catch (err) {
      showToast(err.message, true);
    }
  });

  el.productsTableBody.addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-product-edit]');
    if (!btn) return;
    fillProductForm(btn.dataset.productEdit);
  });

  el.productForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const payload = {
        name: el.productName.value,
        category: Number(el.productCategory.value),
        stock_quantity: Number(el.productStock.value),
        min_quantity: Number(el.productMin.value),
        sale_price: Number(el.productSale.value),
        cost_price: Number(el.productCost.value),
        active: Number(el.productActive.value)
      };

      if (el.productId.value) {
        await api(`/api/products/${el.productId.value}`, { method: 'PUT', body: JSON.stringify(payload) });
        showToast('Produto atualizado.');
      } else {
        await api('/api/products', { method: 'POST', body: JSON.stringify(payload) });
        showToast('Produto criado.');
      }

      resetProductForm();
      await loadProducts();
    } catch (err) {
      showToast(err.message, true);
    }
  });

  el.stockAdjustForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await api(`/api/products/${Number(el.stockAdjustProduct.value)}/adjust-stock`, {
        method: 'POST',
        body: JSON.stringify({
          movement_type_id: Number(el.stockAdjustType.value),
          quantity: Number(el.stockAdjustQty.value)
        })
      });

      showToast('Ajuste aplicado.');
      el.stockAdjustForm.reset();
      await loadProducts();
      await loadStockMovements();
    } catch (err) {
      showToast(err.message, true);
    }
  });

  el.cashOpenForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await api('/api/cash-register/open', {
        method: 'POST',
        body: JSON.stringify({ opening_amount: Number(el.cashOpeningAmount.value) })
      });
      showToast('Caixa aberto.');
      el.cashOpenForm.reset();
      await loadCashSummary();
    } catch (err) {
      showToast(err.message, true);
    }
  });

  el.loadCashSummaryBtn.addEventListener('click', async () => {
    try {
      await loadCashSummary();
    } catch (err) {
      showToast(err.message, true);
    }
  });

  el.indicatorGameForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const data = await api(`/api/indicators/game/${Number(el.indicatorGameSelect.value)}`);
      el.indicatorGameBox.innerHTML = `
        <div class="metric">Jogo: ${data.game_name}</div>
        <div class="metric">Total jogo: ${money(data.game_total_value)}</div>
        <div class="metric">Pago jogo: ${money(data.game_paid)}</div>
        <div class="metric">Pendente jogo: ${money(data.game_pending)}</div>
        <div class="metric">Receita copa: ${money(data.copa_revenue)}</div>
        <div class="metric">Total geral: ${money(data.total_general)}</div>
      `;
    } catch (err) {
      showToast(err.message, true);
    }
  });

  el.indicatorMonthlyForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const data = await api(`/api/indicators/monthly?month=${Number(el.indicatorMonth.value)}&year=${Number(el.indicatorYear.value)}`);
      el.indicatorMonthlyBox.innerHTML = `
        <div class="metric">Total mes: ${money(data.total_raised)}</div>
        <div class="metric">Total copa: ${money(data.total_copa)}</div>
        <div class="metric">Total jogos: ${money(data.total_games)}</div>
        <div class="metric">Dinheiro: ${money(data.by_payment_method.cash)}</div>
        <div class="metric">Pix: ${money(data.by_payment_method.pix)}</div>
        <div class="metric">Debito: ${money(data.by_payment_method.debit)}</div>
        <div class="metric">Credito: ${money(data.by_payment_method.credit)}</div>
      `;
    } catch (err) {
      showToast(err.message, true);
    }
  });

  el.indicatorStockBtn.addEventListener('click', async () => {
    try {
      const data = await api('/api/indicators/stock');
      const topRows = data.top_10_products.map((x) => `<li>${x.name}: ${x.total_quantity} un | receita ${money(x.revenue)} | lucro ${money(x.profit)}</li>`).join('');
      const belowRows = data.below_minimum.map((x) => `<li>${x.name}: ${x.stock_quantity}/${x.min_quantity}</li>`).join('');

      el.indicatorStockBox.innerHTML = `
        <h4>Top produtos</h4>
        <ul>${topRows || '<li>Sem dados</li>'}</ul>
        <h4>Abaixo do minimo</h4>
        <ul>${belowRows || '<li>Nenhum produto abaixo do minimo</li>'}</ul>
      `;
    } catch (err) {
      showToast(err.message, true);
    }
  });

  el.indicatorCommissionForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const data = await api(`/api/indicators/commission?month=${Number(el.commissionMonth.value)}&year=${Number(el.commissionYear.value)}`);
      const list = data.data.map((x) => `
        <li>
          ${x.user_name}: venda copa ${money(x.total_sold_copa)} + jogos ${money(x.total_games_value)} = comissao ${money(x.final_commission)}
        </li>
      `).join('');
      el.indicatorCommissionBox.innerHTML = `<ul>${list || '<li>Sem dados</li>'}</ul>`;
    } catch (err) {
      showToast(err.message, true);
    }
  });

  el.userForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await api('/api/users', {
        method: 'POST',
        body: JSON.stringify({
          name: el.userName.value,
          email: el.userEmail.value,
          password: el.userPassword.value,
          role: el.userRole.value
        })
      });
      showToast('Usuario criado.');
      el.userForm.reset();
      await loadUsers();
    } catch (err) {
      showToast(err.message, true);
    }
  });
}

async function init() {
  bindEvents();
  setCurrentMonthYear();

  if (!state.token) {
    setAuthUI(false);
    return;
  }

  try {
    state.user = await api('/api/auth/me');
    localStorage.setItem('user', JSON.stringify(state.user));
    setAuthUI(true);
    await refreshAll();
  } catch (_err) {
    state.token = null;
    state.user = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setAuthUI(false);
  }
}

init();

