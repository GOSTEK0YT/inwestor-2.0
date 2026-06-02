const coins = {
  LTC: { name: "Litecoin", price: 100, holding: 0, history: Array(24).fill(100), volatility: 3.0, mineYield: 0.001 },
  BTC: { name: "Bitcoin", price: 250000, holding: 0, history: Array(24).fill(250000), volatility: 2.0, mineYield: 0.000001 },
  ETH: { name: "Ethereum", price: 14000, holding: 0, history: Array(24).fill(14000), volatility: 2.5, mineYield: 0.00002 },
  DOGE: { name: "Dogecoin", price: 0.75, holding: 0, history: Array(24).fill(0.75), volatility: 5.0, mineYield: 0.35 }
};

const state = {
  cash: 50,
  activeCoin: "LTC",
  tickerCoin: "LTC",
  level: 1,
  xp: 0,
  selectedRouletteColor: "red",
  wins: 0,
  slotSpinning: false,
  slotTimers: [],
  miningOn: false,
  miningCoin: "LTC",
  miners: [{ id: 1, faster: 0, bigger: 0, lastReward: 0, nextAt: 0 }],
  nextMinerId: 2,
  miningTimer: null,
  deposit: null,
  loanDebt: 0,
  inventory: {
    energyDrink: 0,
    router: 0,
    luckyCharm: 0
  },
  xpBoostUntil: 0,
  miningBoostUntil: 0,
};

const SLOT_COST = 5;
const LOAN_RATE = 0.15;
const ENERGY_DRINK_PRICE = 30;
const ENERGY_DRINK_DURATION = 5 * 60 * 1000;
const ROUTER_PRICE = 50;
const ROUTER_DURATION = 5 * 60 * 1000;
const LUCKY_CHARM_PRICE = 5000;
const LUCKY_CHARM_BONUS = 0.05;
const SLOT_SYMBOLS = ["7", "★", "◆", "●", "L"];
const SLOT_NON_SEVEN_SYMBOLS = SLOT_SYMBOLS.filter((symbol) => symbol !== "7");
const SLOT_PAYOUTS = {
  jackpot: { chance: 0.1, prize: 15000, xp: 120, label: "777" },
  twoSevens: { chance: 0.5, prize: 1000, xp: 45, label: "77" },
  triple: { chance: 1, prize: 500, xp: 25, label: "trzy znaki" },
  pair: { chance: 10, prize: 100, xp: 10, label: "dwa znaki" }
};
const ROULETTE_GREEN_SIZE = 9.73;
const ROULETTE_COLOR_SIZE = (360 - ROULETTE_GREEN_SIZE) / 18;
const ROULETTE_LABELS = {
  red: "Czerwony",
  black: "Czarny",
  green: "Zielony"
};
const ADMIN_CODE = "codex";
const EASTER_EGG_CODE = "67";
const USERS_KEY = "inwestor2Users";
const ACTIVE_USER_KEY = "inwestor2ActiveUser";
const AUTH_TOKEN_KEY = "inwestor2AuthToken";
const SAVE_PREFIX = "inwestor2Save:";
const SAVE_VERSION = 1;

const defaultCoins = JSON.parse(JSON.stringify(coins));
const defaultState = JSON.parse(JSON.stringify({
  ...state,
  slotTimers: [],
  miningTimer: null,
  slotSpinning: false,
  miningOn: false
}));

const $ = (selector) => document.querySelector(selector);

const els = {
  cash: $("#cash"),
  portfolioValue: $("#portfolioValue"),
  activeCoinPrice: $("#activeCoinPrice"),
  playerLevel: $("#playerLevel"),
  xpText: $("#xpText"),
  xpFill: $("#xpFill"),
  toast: $("#toast"),
  slotReels: $("#slotReels"),
  slotFrame: $(".slot-frame"),
  wins: $("#wins"),
  slotStatus: $("#slotStatus"),
  rouletteWheel: $("#rouletteWheel"),
  rouletteResultBox: $(".roulette-result"),
  rouletteBet: $("#rouletteBet"),
  rouletteResult: $("#rouletteResult"),
  rouletteStatus: $("#rouletteStatus"),
  selectedRouletteColor: $("#selectedRouletteColor"),
  coinList: $("#coinList"),
  holdingsList: $("#holdingsList"),
  priceChange: $("#priceChange"),
  priceChart: $("#priceChart"),
  coinHolding: $("#coinHolding"),
  coinAmount: $("#coinAmount"),
  minersList: $("#minersList"),
  profileOverlay: $("#profileOverlay"),
  profileModal: $("#profileOverlay .profile-modal"),
  authOverlay: $("#authOverlay"),
  authModal: $("#authOverlay .profile-modal"),
  authCloseBtn: $("#authCloseBtn"),
  loginInput: $("#loginInput"),
  passwordInput: $("#passwordInput"),
  loginBtn: $("#loginBtn"),
  registerBtn: $("#registerBtn"),
  authMessage: $("#authMessage"),
  profileModeLabel: $("#profileModeLabel"),
  profileSaveStatus: $("#profileSaveStatus"),
  currentUserLabel: $("#currentUserLabel"),
  openAuthBtn: $("#openAuthBtn"),
  resetProgressBtn: $("#resetProgressBtn"),
  logoutBtn: $("#logoutBtn"),
  deleteAccountBtn: $("#deleteAccountBtn"),
  adminCodeInput: $("#adminCodeInput"),
  adminEasterEgg: $("#adminEasterEgg"),
  adminPanel: $("#adminPanel"),
  adminMoneyInput: $("#adminMoneyInput"),
  adminXpInput: $("#adminXpInput"),
  adminTimeInput: $("#adminTimeInput"),
  depositAmount: $("#depositAmount"),
  depositDuration: $("#depositDuration"),
  depositRateLabel: $("#depositRateLabel"),
  depositStatus: $("#depositStatus"),
  depositPayout: $("#depositPayout"),
  depositProgressWrap: $("#depositProgressWrap"),
  depositProgress: $("#depositProgress"),
  depositActionBtn: $("#depositActionBtn"),
  loanAmount: $("#loanAmount"),
  takeLoanBtn: $("#takeLoanBtn"),
  creditLimit: $("#creditLimit"),
  loanDebt: $("#loanDebt"),
  loanStatus: $("#loanStatus"),
  repayLoanBtn: $("#repayLoanBtn"),
  buyEnergyDrinkBtn: $("#buyEnergyDrinkBtn"),
  buyRouterBtn: $("#buyRouterBtn"),
  buyLuckyCharmBtn: $("#buyLuckyCharmBtn"),
  energyInventoryCard: $("#energyInventoryCard"),
  routerInventoryCard: $("#routerInventoryCard"),
  luckyCharmInventoryCard: $("#luckyCharmInventoryCard"),
  emptyInventoryCard: $("#emptyInventoryCard"),
  energyDrinkCount: $("#energyDrinkCount"),
  routerCount: $("#routerCount"),
  luckyCharmCount: $("#luckyCharmCount"),
  xpBoostStatus: $("#xpBoostStatus"),
  miningBoostStatus: $("#miningBoostStatus"),
  useEnergyDrinkBtn: $("#useEnergyDrinkBtn"),
  useRouterBtn: $("#useRouterBtn")
};

let lastCash = state.cash;
let lastPortfolio = portfolioValue();
let profilePointerStartedOnOverlay = false;
let activeUser = null;
let activeToken = window.localStorage.getItem(AUTH_TOKEN_KEY);
let saveReady = false;

function money(value) {
  if (value >= 1000) return value.toLocaleString("pl-PL", { maximumFractionDigits: 2 });
  return value.toFixed(2);
}

function formatTime(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const restMinutes = String(minutes % 60).padStart(2, "0");
    return `${hours}h ${restMinutes}m`;
  }
  return `${minutes}:${seconds}`;
}

function portfolioValue() {
  return Object.values(coins).reduce((sum, coin) => sum + coin.holding * coin.price, 0);
}

function activeCoin() {
  return coins[state.activeCoin];
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    els.toast.classList.remove("is-visible");
  }, 2200);
}

function storageGet(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function storageSet(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    showToast("Nie udało się zapisać gry.");
    return false;
  }
}

async function apiRequest(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (activeToken) headers.Authorization = activeToken;

  const response = await fetch(path, {
    ...options,
    headers
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Serwer nie odpowiedzial poprawnie.");
  }

  return data;
}

function hashText(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function normalizedLogin() {
  return els.loginInput.value.trim().toLowerCase();
}

function usersStore() {
  return storageGet(USERS_KEY, {});
}

function setAuthMessage(message) {
  els.authMessage.textContent = message;
}

function updateAuthUi() {
  if (activeUser) {
    els.profileModeLabel.textContent = "Zapisane konto";
    els.currentUserLabel.textContent = activeUser;
    els.profileSaveStatus.textContent = "Autozapis aktywny";
    els.openAuthBtn.hidden = true;
    els.logoutBtn.hidden = false;
    els.deleteAccountBtn.hidden = false;
    return;
  }

  els.profileModeLabel.textContent = "Gość";
  els.currentUserLabel.textContent = "gość";
  els.profileSaveStatus.textContent = "Niezapisany";
  els.openAuthBtn.hidden = false;
  els.logoutBtn.hidden = true;
  els.deleteAccountBtn.hidden = true;
}

function setCurrentUser(login) {
  activeUser = login;
  if (login) {
    window.localStorage.setItem(ACTIVE_USER_KEY, login);
  } else {
    window.localStorage.removeItem(ACTIVE_USER_KEY);
  }
  updateAuthUi();
}

function setAuthToken(token) {
  activeToken = token;
  if (token) {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

function resetGameState() {
  window.clearTimeout(state.miningTimer);
  state.slotTimers.forEach((timer) => window.clearInterval(timer));

  Object.keys(coins).forEach((symbol) => {
    Object.assign(coins[symbol], JSON.parse(JSON.stringify(defaultCoins[symbol])));
  });

  Object.keys(state).forEach((key) => {
    delete state[key];
  });
  Object.assign(state, JSON.parse(JSON.stringify(defaultState)));
  state.slotTimers = [];
  state.miningTimer = null;
  lastCash = state.cash;
  lastPortfolio = portfolioValue();
}

function saveKey(login = activeUser) {
  return `${SAVE_PREFIX}${login}`;
}

function buildSavePayload() {
  return {
    version: SAVE_VERSION,
    savedAt: Date.now(),
    state: {
      cash: state.cash,
      activeCoin: state.activeCoin,
      tickerCoin: state.tickerCoin,
      level: state.level,
      xp: state.xp,
      selectedRouletteColor: state.selectedRouletteColor,
      wins: state.wins,
      miningCoin: state.miningCoin,
      miners: state.miners,
      nextMinerId: state.nextMinerId,
      deposit: state.deposit,
      loanDebt: state.loanDebt,
      inventory: state.inventory,
      xpBoostUntil: state.xpBoostUntil,
      miningBoostUntil: state.miningBoostUntil
    },
    coins
  };
}

function saveGame() {
  if (!activeUser || !saveReady) return;

  const save = buildSavePayload();
  storageSet(saveKey(), save);

  if (activeToken) {
    apiRequest("/api/save", {
      method: "PUT",
      body: JSON.stringify({ save })
    }).catch(() => {});
  }
}

function loadGame(login, remoteSave = null) {
  resetGameState();
  const save = remoteSave || storageGet(saveKey(login), null);

  if (save?.coins) {
    Object.entries(save.coins).forEach(([symbol, coin]) => {
      if (coins[symbol]) Object.assign(coins[symbol], coin);
    });
  }

  if (save?.state) {
    Object.assign(state, save.state);
    state.slotSpinning = false;
    state.slotTimers = [];
    state.miningOn = false;
    state.miningTimer = null;
    state.miners = Array.isArray(state.miners) && state.miners.length
      ? state.miners
      : JSON.parse(JSON.stringify(defaultState.miners));
    state.inventory = {
      energyDrink: 0,
      router: 0,
      luckyCharm: 0,
      ...state.inventory
    };
  }

  saveReady = true;
}

function showAuth() {
  els.authOverlay.hidden = false;
  setAuthMessage("");
  window.setTimeout(() => els.loginInput.focus(), 0);
}

function hideAuth() {
  els.authOverlay.hidden = true;
}

async function loginUser() {
  const login = normalizedLogin();
  const password = els.passwordInput.value;
  const users = usersStore();

  if (login && password) {
    try {
      setAuthMessage("Logowanie...");
      const data = await apiRequest("/api/login", {
        method: "POST",
        body: JSON.stringify({ login, password })
      });
      setAuthToken(data.token);
      setCurrentUser(data.user.login);
      loadGame(data.user.login, data.save);
      hideAuth();
      renderSlots();
      renderAll();
      showToast(`Witaj, ${login}.`);
      return;
    } catch (error) {
      setAuthMessage(error.message || "Nie udalo sie polaczyc z serwerem.");
    }
  }

  if (!login || !password) {
    setAuthMessage("Wpisz login i hasło.");
    return;
  }

  if (!users[login] || users[login].password !== hashText(password)) {
    setAuthMessage("Zły login albo hasło.");
    return;
  }

  setAuthToken(null);
  setCurrentUser(login);
  loadGame(login);
  hideAuth();
  renderSlots();
  renderAll();
  showToast(`Witaj, ${login}.`);
}

async function registerUser() {
  const login = normalizedLogin();
  const password = els.passwordInput.value;
  const users = usersStore();

  if (login.length >= 3 && password.length >= 3) {
    try {
      setAuthMessage("Tworzenie konta...");
      const data = await apiRequest("/api/register", {
        method: "POST",
        body: JSON.stringify({ login, password })
      });
      setAuthToken(data.token);
      setCurrentUser(data.user.login);
      saveReady = true;
      saveGame();
      hideAuth();
      renderSlots();
      renderAll();
      showToast(`Utworzono konto ${login}.`);
      return;
    } catch (error) {
      if ((error.message || "").includes("istnieje")) {
        setAuthMessage(error.message);
        return;
      }
      setAuthMessage(error.message || "Nie udalo sie polaczyc z serwerem.");
    }
  }

  if (login.length < 3) {
    setAuthMessage("Login musi mieć minimum 3 znaki.");
    return;
  }

  if (password.length < 3) {
    setAuthMessage("Hasło musi mieć minimum 3 znaki.");
    return;
  }

  if (users[login]) {
    setAuthMessage("Takie konto już istnieje.");
    return;
  }

  users[login] = {
    password: hashText(password),
    createdAt: Date.now()
  };
  storageSet(USERS_KEY, users);
  setAuthToken(null);
  setCurrentUser(login);
  saveReady = true;
  saveGame();
  hideAuth();
  renderSlots();
  renderAll();
  showToast(`Utworzono konto ${login}.`);
}

function logoutUser() {
  saveGame();
  if (activeToken) {
    apiRequest("/api/logout", { method: "POST" }).catch(() => {});
  }
  setAuthToken(null);
  setCurrentUser(null);
  saveReady = false;
  closeProfile();
  showToast("Wylogowano. Możesz grać dalej jako gość.");
}

function resetProgress() {
  const confirmed = window.confirm("Zresetować cały postęp gry?");
  if (!confirmed) return;

  resetGameState();
  saveReady = Boolean(activeUser);
  if (activeToken) {
    apiRequest("/api/reset", { method: "POST" }).catch(() => {});
  }
  renderSlots();
  renderAll();
  closeProfile();
  showToast(activeUser ? "Postęp konta zresetowany." : "Postęp gościa zresetowany.");
}

async function deleteAccount() {
  if (!activeUser) return;

  const login = activeUser;
  const confirmed = window.confirm(`Usunąć konto "${login}" i jego zapis gry?`);
  if (!confirmed) return;

  const users = usersStore();
  delete users[login];
  storageSet(USERS_KEY, users);
  window.localStorage.removeItem(saveKey(login));
  if (activeToken) {
    try {
      await apiRequest("/api/account", { method: "DELETE" });
    } catch (error) {
      showToast(error.message);
      return;
    }
  }
  setAuthToken(null);
  setCurrentUser(null);
  saveReady = false;
  closeProfile();
  showToast("Konto i zapis zostały usunięte.");
}

async function initAuth() {
  const users = usersStore();
  const login = window.localStorage.getItem(ACTIVE_USER_KEY);
  if (activeToken) {
    try {
      const data = await apiRequest("/api/me");
      setCurrentUser(data.user.login);
      loadGame(data.user.login, data.save);
      hideAuth();
      renderSlots();
      renderAll();
      return;
    } catch {
      setAuthToken(null);
    }
  }

  if (login && users[login]) {
    setCurrentUser(login);
    loadGame(login);
    hideAuth();
    return;
  }

  saveReady = false;
  setCurrentUser(null);
}

function switchPanel(panelId) {
  const activeTabPanel = panelId === "myRealEstatePanel" ? "realEstatePanel" : panelId;

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.panel === activeTabPanel);
  });
  document.querySelectorAll(".panel").forEach((panel) => {
    panel.classList.toggle("is-active", panel.id === panelId);
  });
}

function renderWallet() {
  const coin = coins[state.tickerCoin];
  const currentPortfolio = portfolioValue();
  els.cash.textContent = money(state.cash);
  els.portfolioValue.textContent = money(currentPortfolio);
  els.activeCoinPrice.textContent = `${money(coin.price)} zł / ${state.tickerCoin}`;
  const selectedMarketCoin = activeCoin();
  els.coinHolding.textContent = `Masz ${selectedMarketCoin.holding.toFixed(6)} ${state.activeCoin}`;

  if (state.cash !== lastCash) {
    pulseElement(els.cash.parentElement);
    lastCash = state.cash;
  }

  if (currentPortfolio !== lastPortfolio) {
    pulseElement(els.portfolioValue.parentElement);
    lastPortfolio = currentPortfolio;
  }
}

function pulseElement(element) {
  element.classList.remove("is-bumping");
  void element.offsetWidth;
  element.classList.add("is-bumping");
}

function flashElement(element, className) {
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
}

function updateRouletteRadius() {
  const radius = Math.max(66, els.rouletteWheel.clientWidth / 2 - 22);
  els.rouletteWheel.style.setProperty("--ball-radius", `${radius}px`);
}

function xpForNextLevel() {
  return 100 + (state.level - 1) * 50;
}

function xpMultiplier() {
  return Date.now() < state.xpBoostUntil ? 2 : 1;
}

function miningMultiplier() {
  return Date.now() < state.miningBoostUntil ? 2 : 1;
}

function hasLuckyCharm() {
  return state.inventory.luckyCharm > 0;
}

function luckyCharmHits() {
  return hasLuckyCharm() && Math.random() < LUCKY_CHARM_BONUS;
}

function addXp(amount, reason) {
  if (amount <= 0) return;

  const multiplier = xpMultiplier();
  const gained = amount * multiplier;
  state.xp += gained;
  let leveledUp = false;
  while (state.xp >= xpForNextLevel()) {
    state.xp -= xpForNextLevel();
    state.level += 1;
    leveledUp = true;
  }

  renderLevel();
  if (leveledUp) {
    showToast(`Awans! Poziom ${state.level}.`);
  } else if (reason) {
    showToast(`+${gained} EXP${multiplier > 1 ? " (x2)" : ""}: ${reason}`);
  }
}

function renderLevel() {
  const next = xpForNextLevel();
  els.playerLevel.textContent = state.level;
  els.xpText.textContent = `${state.xp} / ${next} EXP`;
  els.xpFill.style.width = `${Math.min(100, state.xp / next * 100)}%`;
}

function openProfile() {
  els.profileOverlay.hidden = false;
  els.adminCodeInput.focus();
}

function closeProfile() {
  els.profileOverlay.hidden = true;
}

function unlockAdminPanel() {
  const code = els.adminCodeInput.value.trim().toLowerCase();

  if (code === EASTER_EGG_CODE) {
    els.adminPanel.hidden = true;
    els.adminEasterEgg.hidden = false;
    showToast("serio miłosz znowu 67");
    return;
  }

  if (code !== ADMIN_CODE) {
    showToast("Zły kod admina.");
    return;
  }

  els.adminEasterEgg.hidden = true;
  els.adminPanel.hidden = false;
  showToast("Panel admina odblokowany.");
}

function addAdminMoney() {
  const amount = Number(els.adminMoneyInput.value);
  if (!Number.isFinite(amount) || amount <= 0) {
    showToast("Wpisz poprawną kwotę.");
    return;
  }

  state.cash += amount;
  renderAll();
  showToast(`Admin: dodano ${money(amount)} zł.`);
}

function addAdminXp() {
  const amount = Math.floor(Number(els.adminXpInput.value));
  if (!Number.isFinite(amount) || amount <= 0) {
    showToast("Wpisz poprawny EXP.");
    return;
  }

  addXp(amount, "panel admina");
}

function advanceAdminTime() {
  const minutes = Math.floor(Number(els.adminTimeInput.value));
  if (!Number.isFinite(minutes) || minutes <= 0) {
    showToast("Wpisz poprawną liczbę minut.");
    return;
  }

  if (!state.deposit) {
    showToast("Nie ma aktywnej lokaty do przyspieszenia.");
    return;
  }

  state.deposit.startedAt -= minutes * 60000;
  renderBank();
  showToast(`Admin: przyspieszono czas o ${minutes} min.`);
}

function selectedDepositOffer() {
  const option = els.depositDuration.selectedOptions[0];
  const minutes = Number(option.value);
  const rate = Number(option.dataset.rate);
  return { duration: minutes * 60000, minutes, rate };
}

function depositPayout(deposit) {
  return deposit.amount * (1 + deposit.rate);
}

function updateDepositOffer() {
  if (state.deposit) return;
  const amount = Math.max(0, Number(els.depositAmount.value) || 0);
  const offer = selectedDepositOffer();
  els.depositRateLabel.textContent = `+${Math.round(offer.rate * 100)}%`;
  els.depositPayout.textContent = `${money(amount * (1 + offer.rate))} zł`;
}

function creditLimit() {
  return 500 + (state.level - 1) * 250;
}

function renderBank() {
  const now = Date.now();
  if (state.deposit) {
    const elapsed = Math.min(state.deposit.duration, now - state.deposit.startedAt);
    const progress = elapsed / state.deposit.duration;
    const timeLeft = state.deposit.duration - elapsed;
    const ready = progress >= 1;

    els.depositRateLabel.textContent = `+${Math.round(state.deposit.rate * 100)}%`;
    els.depositStatus.textContent = ready ? "Gotowa do odbioru" : `${formatTime(timeLeft)} do końca`;
    els.depositPayout.textContent = `${money(depositPayout(state.deposit))} zł`;
    els.depositProgressWrap.hidden = false;
    els.depositProgress.style.width = `${progress * 100}%`;
    els.depositActionBtn.textContent = "Odbierz pieniądze";
    els.depositActionBtn.disabled = !ready;
    els.depositAmount.disabled = true;
    els.depositDuration.disabled = true;
  } else {
    els.depositStatus.textContent = "Brak lokaty";
    els.depositProgressWrap.hidden = true;
    els.depositProgress.style.width = "0%";
    els.depositActionBtn.textContent = "Załóż lokatę";
    els.depositActionBtn.disabled = false;
    els.depositAmount.disabled = false;
    els.depositDuration.disabled = false;
    updateDepositOffer();
  }

  const limit = creditLimit();
  els.creditLimit.textContent = `${money(limit)} zł`;
  els.loanAmount.max = limit;
  els.loanDebt.textContent = `${money(state.loanDebt)} zł`;
  els.loanStatus.textContent = state.loanDebt > 0 ? "Aktywna" : "Brak pożyczki";
  els.takeLoanBtn.disabled = state.loanDebt > 0;
  els.repayLoanBtn.disabled = state.loanDebt <= 0;
}

function startDeposit() {
  const amount = Number(els.depositAmount.value);
  if (!Number.isFinite(amount) || amount < 10) {
    showToast("Minimalna lokata to 10 zł.");
    return;
  }

  if (amount > state.cash) {
    showToast("Nie masz tyle złotówek na lokatę.");
    return;
  }

  state.cash -= amount;
  const offer = selectedDepositOffer();
  state.deposit = { amount, duration: offer.duration, rate: offer.rate, startedAt: Date.now() };
  addXp(4, "założenie lokaty");
  showToast(`Lokata założona: ${money(amount)} zł na ${offer.minutes} min.`);
  renderAll();
}

function claimDeposit() {
  if (!state.deposit) return;
  if (Date.now() - state.deposit.startedAt < state.deposit.duration) {
    showToast("Lokata jeszcze pracuje.");
    return;
  }

  const payout = depositPayout(state.deposit);
  state.cash += payout;
  state.deposit = null;
  addXp(12, "odbiór lokaty");
  showToast(`Lokata wypłacona: ${money(payout)} zł.`);
  renderAll();
}

function handleDepositAction() {
  if (state.deposit) {
    claimDeposit();
    return;
  }

  startDeposit();
}

function takeLoan() {
  if (state.loanDebt > 0) {
    showToast("Najpierw spłać obecną pożyczkę.");
    return;
  }

  const amount = Number(els.loanAmount.value);
  if (!Number.isFinite(amount) || amount < 50) {
    showToast("Minimalna pożyczka to 50 zł.");
    return;
  }
  if (amount > creditLimit()) {
    showToast(`Twoja zdolność kredytowa to ${money(creditLimit())} zł.`);
    return;
  }

  state.cash += amount;
  state.loanDebt = Math.ceil(amount * (1 + LOAN_RATE) * 100) / 100;
  addXp(2, "pożyczka z banku");
  showToast(`Pożyczono ${money(amount)} zł. Do spłaty ${money(state.loanDebt)} zł.`);
  renderAll();
}

function repayLoan() {
  if (state.loanDebt <= 0) return;
  if (state.cash < state.loanDebt) {
    showToast("Nie masz tyle złotówek na spłatę.");
    return;
  }

  state.cash -= state.loanDebt;
  state.loanDebt = 0;
  addXp(10, "spłata pożyczki");
  showToast("Pożyczka spłacona.");
  renderAll();
}

function buyEnergyDrink() {
  if (state.cash < ENERGY_DRINK_PRICE) {
    showToast("Brakuje złotówek na energetyka.");
    return;
  }

  state.cash -= ENERGY_DRINK_PRICE;
  state.inventory.energyDrink += 1;
  showToast("Kupiono energetyka 2x EXP.");
  renderAll();
}

function useEnergyDrink() {
  if (state.inventory.energyDrink <= 0) {
    showToast("Nie masz energetyka w ekwipunku.");
    return;
  }

  state.inventory.energyDrink -= 1;
  state.xpBoostUntil = Math.max(Date.now(), state.xpBoostUntil) + ENERGY_DRINK_DURATION;
  showToast("Energetyk działa: 2x EXP przez 5 minut.");
  renderAll();
}

function buyRouter() {
  if (state.cash < ROUTER_PRICE) {
    showToast("Brakuje złotówek na ruter.");
    return;
  }

  state.cash -= ROUTER_PRICE;
  state.inventory.router += 1;
  showToast("Kupiono nowy ruter 2x wydobycie.");
  renderAll();
}

function useRouter() {
  if (state.inventory.router <= 0) {
    showToast("Nie masz rutera w ekwipunku.");
    return;
  }

  state.inventory.router -= 1;
  state.miningBoostUntil = Math.max(Date.now(), state.miningBoostUntil) + ROUTER_DURATION;
  showToast("Ruter działa: 2x wydobycie przez 5 minut.");
  renderAll();
}

function buyLuckyCharm() {
  if (state.inventory.luckyCharm > 0) {
    showToast("Lucky charm jest już w ekwipunku.");
    return;
  }

  if (state.cash < LUCKY_CHARM_PRICE) {
    showToast("Brakuje złotówek na lucky charm.");
    return;
  }

  state.cash -= LUCKY_CHARM_PRICE;
  state.inventory.luckyCharm = 1;
  showToast("Kupiono lucky charm: +5% szans w kasynie.");
  renderAll();
}

function renderShop() {
  els.buyEnergyDrinkBtn.disabled = state.cash < ENERGY_DRINK_PRICE;
  els.buyRouterBtn.disabled = state.cash < ROUTER_PRICE;
  els.buyLuckyCharmBtn.disabled = state.cash < LUCKY_CHARM_PRICE || hasLuckyCharm();
  els.buyLuckyCharmBtn.textContent = hasLuckyCharm() ? "Kupiono" : "Kup za 5000 zł";
}

function renderInventory() {
  const energyCount = state.inventory.energyDrink;
  const routerCount = state.inventory.router;
  const luckyCharmCount = state.inventory.luckyCharm;
  const boostLeft = state.xpBoostUntil - Date.now();
  const miningBoostLeft = state.miningBoostUntil - Date.now();
  const isBoostActive = boostLeft > 0;
  const isMiningBoostActive = miningBoostLeft > 0;

  els.energyDrinkCount.textContent = `x${energyCount}`;
  els.useEnergyDrinkBtn.disabled = energyCount <= 0;
  els.energyInventoryCard.hidden = energyCount <= 0 && !isBoostActive;
  els.xpBoostStatus.textContent = isBoostActive
    ? `Aktywne: ${formatTime(boostLeft)}`
    : "Bonus nieaktywny";
  els.xpBoostStatus.classList.toggle("is-active", isBoostActive);

  els.routerCount.textContent = `x${routerCount}`;
  els.useRouterBtn.disabled = routerCount <= 0;
  els.routerInventoryCard.hidden = routerCount <= 0 && !isMiningBoostActive;
  els.miningBoostStatus.textContent = isMiningBoostActive
    ? `Aktywne: ${formatTime(miningBoostLeft)}`
    : "Bonus nieaktywny";
  els.miningBoostStatus.classList.toggle("is-active", isMiningBoostActive);

  els.luckyCharmCount.textContent = `x${luckyCharmCount}`;
  els.luckyCharmInventoryCard.hidden = luckyCharmCount <= 0;

  els.emptyInventoryCard.hidden = energyCount > 0 || routerCount > 0 || luckyCharmCount > 0 || isBoostActive || isMiningBoostActive;
}

function renderCoins() {
  els.coinList.innerHTML = Object.entries(coins).map(([symbol, coin]) => `
    <button class="coin-button ${symbol === state.activeCoin ? "is-active" : ""}" type="button" data-coin="${symbol}">
      <strong>${symbol}</strong>
      <span>${coin.name}</span>
      <span>${money(coin.price)} zł</span>
    </button>
  `).join("");

  document.querySelectorAll(".coin-button").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeCoin = button.dataset.coin;
      state.tickerCoin = state.activeCoin;
      renderAll();
    });
  });
}

function renderHoldings() {
  els.holdingsList.innerHTML = Object.entries(coins).map(([symbol, coin]) => `
    <div>
      <strong>${coin.holding.toFixed(6)} ${symbol}</strong>
      <span>${money(coin.holding * coin.price)} zł</span>
    </div>
  `).join("");
}

function renderMining() {
  const minerCost = minerPurchaseCost();
  const reward = totalMiningReward();

  const minerRows = state.miners.map((miner, index) => {
    const fasterCost = minerUpgradeCost(miner, "faster");
    const biggerCost = minerUpgradeCost(miner, "bigger");
    const interval = minerInterval(miner);
    const rewardEach = minerReward(miner);
    const isFirst = index === 0;
    return `
      <div class="miner-row">
        <article class="printer-card" data-miner-id="${miner.id}">
          <h3>Koparka ${index + 1}</h3>
          ${isFirst ? `
            <label for="miningCoin">Waluta do kopania</label>
            <select id="miningCoin">
              <option value="LTC" ${state.miningCoin === "LTC" ? "selected" : ""}>LTC</option>
              <option value="BTC" ${state.miningCoin === "BTC" ? "selected" : ""}>BTC</option>
              <option value="ETH" ${state.miningCoin === "ETH" ? "selected" : ""}>ETH</option>
              <option value="DOGE" ${state.miningCoin === "DOGE" ? "selected" : ""}>DOGE</option>
            </select>
          ` : ""}
          <div class="miner compact ${state.miningOn ? "is-on" : ""}">
            <div class="fan" aria-hidden="true"></div>
            <div>
              <strong>${state.miningOn ? "Kopie" : "Gotowa"}</strong>
              <span>${miner.lastReward ? `ostatnio +${miner.lastReward.toFixed(6)} ${state.miningCoin}` : `co ${interval}s, +${rewardEach.toFixed(6)} ${state.miningCoin}`}</span>
            </div>
          </div>
          <div class="printer-stats">
            <span><strong>${interval}s</strong> cykl</span>
            <span><strong>${rewardEach.toFixed(6)}</strong> zysk</span>
          </div>
          ${isFirst ? `
            <div class="controls">
              <button id="toggleMiningBtn" type="button">${state.miningOn ? "Wyłącz koparki" : "Włącz koparki"}</button>
            </div>
            <p class="quiet">${state.miners.length} koparek, +${reward.toFixed(6)} ${state.miningCoin} / cykl</p>
          ` : ""}
        </article>

        <article class="printer-card" data-shop-for="${miner.id}">
          <h3>Ulepszenia koparki</h3>
          <div class="upgrade-list">
            <button type="button" class="upgrade" data-upgrade="faster" data-miner-id="${miner.id}">
              <span>Szybsze kopanie</span>
              <strong>lvl ${miner.faster} · ${fasterCost} zł</strong>
            </button>
            <button type="button" class="upgrade" data-upgrade="bigger" data-miner-id="${miner.id}">
              <span>Większy zysk</span>
              <strong>lvl ${miner.bigger} · ${biggerCost} zł</strong>
            </button>
          </div>
        </article>
      </div>
    `;
  }).join("");

  const nextIndex = state.miners.length + 1;
  const requiredLevel = minerRequiredLevel(nextIndex);
  const hasRequiredLevel = state.level >= requiredLevel;
  const buyRow = `
    <div class="miner-row">
      <article class="printer-card miner-buy-card">
        <h3>Nowa koparka</h3>
        <button id="buyMinerBtn" type="button" class="buy-printer" ${hasRequiredLevel ? "" : "disabled"}>
          <span class="plus-box">+</span>
          <span>
            <strong>Dokup koparkę</strong>
            <small>koszt: ${minerCost} zł</small>
            <small>wymagany poziom: ${requiredLevel}</small>
          </span>
        </button>
      </article>

      <article class="printer-card is-locked">
        <h3>Ulepszenia koparki ${nextIndex}</h3>
        <p class="quiet">Kup koparkę po lewej, żeby odblokować jej osobny sklep.</p>
        <div class="upgrade-list">
          <button type="button" class="upgrade" disabled>
            <span>Szybsze kopanie</span>
            <strong>zablokowane</strong>
          </button>
          <button type="button" class="upgrade" disabled>
            <span>Większy zysk</span>
            <strong>zablokowane</strong>
          </button>
        </div>
      </article>
    </div>
  `;

  els.minersList.innerHTML = minerRows + buyRow;
}

function reelMarkup(symbols, reelIndex) {
  const distance = -(symbols.length - 1) * 100;
  const time = 900 + reelIndex * 170;
  const delay = reelIndex * 80;
  return `
    <span class="slot-reel" style="--spin-distance: ${distance}%; --spin-time: ${time}ms; --spin-delay: ${delay}ms;">
      <span class="reel-strip">
        ${symbols.map((symbol) => `<span class="reel-symbol">${symbol}</span>`).join("")}
      </span>
    </span>
  `;
}

function renderSlots(result = SLOT_SYMBOLS.slice(0, 3)) {
  els.slotReels.innerHTML = result.map((symbol, index) => reelMarkup([symbol], index)).join("");
  els.wins.textContent = state.wins;
}

function renderSpinningSlots(result) {
  renderSlots(Array.from({ length: 3 }, () => SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)]));
  clearSlotTimers();
  const reels = [...els.slotReels.querySelectorAll(".reel-symbol")];
  reels.forEach((reel, index) => {
    const timer = window.setInterval(() => {
      reel.textContent = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
    }, 70 + index * 18);
    state.slotTimers.push(timer);
  });
}

function clearSlotTimers() {
  state.slotTimers.forEach((timer) => window.clearInterval(timer));
  state.slotTimers = [];
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffleSymbols(symbols) {
  return [...symbols].sort(() => Math.random() - 0.5);
}

function losingSlotSymbols() {
  const symbols = Array.from({ length: 3 }, () => randomItem(SLOT_SYMBOLS));
  const allSame = symbols.every((symbol) => symbol === symbols[0]);
  const hasPair = new Set(symbols).size < 3;
  if (!allSame && !hasPair) return symbols;
  return losingSlotSymbols();
}

function twoSevensSymbols() {
  return shuffleSymbols(["7", "7", randomItem(SLOT_NON_SEVEN_SYMBOLS)]);
}

function pairSymbols() {
  const pair = randomItem(SLOT_NON_SEVEN_SYMBOLS);
  const others = SLOT_SYMBOLS.filter((symbol) => symbol !== pair);
  return shuffleSymbols([pair, pair, randomItem(others)]);
}

function slotOutcome() {
  const roll = Math.random() * 100;
  let cursor = SLOT_PAYOUTS.jackpot.chance;
  if (roll < cursor) {
    return { symbols: ["7", "7", "7"], ...SLOT_PAYOUTS.jackpot };
  }

  cursor += SLOT_PAYOUTS.twoSevens.chance;
  if (roll < cursor) {
    return { symbols: twoSevensSymbols(), ...SLOT_PAYOUTS.twoSevens };
  }

  cursor += SLOT_PAYOUTS.triple.chance;
  if (roll < cursor) {
    const symbol = randomItem(SLOT_NON_SEVEN_SYMBOLS);
    return { symbols: [symbol, symbol, symbol], ...SLOT_PAYOUTS.triple };
  }

  cursor += SLOT_PAYOUTS.pair.chance;
  if (roll < cursor || luckyCharmHits()) {
    return { symbols: pairSymbols(), ...SLOT_PAYOUTS.pair };
  }

  return { symbols: losingSlotSymbols(), prize: 0, xp: 0, label: "pudło" };
}

function renderAll() {
  renderWallet();
  renderLevel();
  renderShop();
  renderInventory();
  renderCoins();
  renderHoldings();
  renderMining();
  renderBank();
  drawChart();
  saveGame();
}

function spinSlots() {
  if (state.slotSpinning) return;
  if (state.cash < SLOT_COST) {
    showToast("Spin kosztuje 5 zł. Brakuje środków.");
    return;
  }

  state.slotSpinning = true;
  state.cash -= SLOT_COST;
  addXp(1);
  els.slotStatus.textContent = "Kręci się";
  const outcome = slotOutcome();
  renderSpinningSlots(outcome.symbols);
  els.slotFrame.classList.add("is-spinning");
  els.slotReels.classList.add("is-spinning");
  renderWallet();

  window.setTimeout(() => {
    clearSlotTimers();
    els.slotFrame.classList.remove("is-spinning");
    els.slotReels.classList.remove("is-spinning");
    renderSlots(outcome.symbols);
    state.slotSpinning = false;

    if (outcome.prize > 0) {
      state.cash += outcome.prize;
      state.wins += 1;
      els.slotStatus.textContent = `+${outcome.prize} zł`;
      flashElement(els.slotReels, "is-win");
      addXp(outcome.xp);
      showToast(`${outcome.label}: +${outcome.prize} zł.`);
    } else {
      els.slotStatus.textContent = "Pudło";
    }

    renderAll();
  }, 1350);
}

function resetSlots() {
  clearSlotTimers();
  state.slotSpinning = false;
  els.slotFrame.classList.remove("is-spinning");
  els.slotReels.classList.remove("is-spinning");
  els.slotStatus.textContent = "Gotowe";
  renderSlots();
}

function rouletteOutcome() {
  const number = Math.floor(Math.random() * 37);
  let outcome = number === 0
    ? { number, color: "green" }
    : { number, color: number % 2 === 0 ? "black" : "red" };

  if (outcome.color !== state.selectedRouletteColor && luckyCharmHits()) {
    if (state.selectedRouletteColor === "green") {
      outcome = { number: 0, color: "green" };
    } else if (state.selectedRouletteColor === "red") {
      outcome = { number: 1 + Math.floor(Math.random() * 18) * 2, color: "red" };
    } else {
      outcome = { number: 2 + Math.floor(Math.random() * 18) * 2, color: "black" };
    }
  }

  return outcome;
}

function rouletteBallAngle(outcome) {
  if (outcome.color === "green") {
    return -90 + ROULETTE_GREEN_SIZE / 2;
  }

  const colorIndex = outcome.color === "black"
    ? Math.floor((outcome.number - 2) / 2) % 9 * 2
    : Math.floor((outcome.number - 1) / 2) % 9 * 2 + 1;
  return -90 + ROULETTE_GREEN_SIZE + colorIndex * ROULETTE_COLOR_SIZE + ROULETTE_COLOR_SIZE / 2;
}

function spinRoulette() {
  const bet = Number(els.rouletteBet.value);
  if (!Number.isFinite(bet) || bet <= 0) {
    showToast("Podaj poprawną kwotę zakładu.");
    return;
  }
  if (bet > state.cash) {
    showToast("Nie masz tyle złotówek.");
    return;
  }

  state.cash -= bet;
  addXp(1);
  updateRouletteRadius();
  els.rouletteStatus.textContent = "Kręci się";
  els.rouletteResult.textContent = "...";
  els.rouletteResultBox.classList.remove("is-hit");
  const startAngle = -90 + Math.random() * 360;
  els.rouletteWheel.style.setProperty("--spin-start", `${startAngle}deg`);
  els.rouletteWheel.style.setProperty("--ball-angle", `${startAngle}deg`);
  els.rouletteWheel.classList.add("is-spinning");
  renderWallet();

  window.setTimeout(() => {
    const outcome = rouletteOutcome();
    const won = outcome.color === state.selectedRouletteColor;
    const multiplier = outcome.color === "green" ? 20 : 2;
    const finalBallAngle = rouletteBallAngle(outcome) + 1440;
    els.rouletteWheel.classList.remove("is-spinning");
    els.rouletteWheel.style.setProperty("--ball-angle", `${finalBallAngle}deg`);
    els.rouletteResult.textContent = `${outcome.number} ${ROULETTE_LABELS[outcome.color]}`;
    flashElement(els.rouletteResultBox, "is-hit");

    if (won) {
      const prize = bet * multiplier;
      state.cash += prize;
      els.rouletteStatus.textContent = `+${money(prize)} zł`;
      addXp(outcome.color === "green" ? 50 : 10);
      showToast(`Ruletka: wygrana ${money(prize)} zł.`);
    } else {
      els.rouletteStatus.textContent = `-${money(bet)} zł`;
      showToast("Ruletka nie siadła tym razem.");
    }

    renderAll();
  }, 950);
}

function tickPrices() {
  const symbols = Object.keys(coins);
  const forcedUp = symbols[Math.floor(Math.random() * symbols.length)];
  let forcedDown = symbols[Math.floor(Math.random() * symbols.length)];
  if (forcedDown === forcedUp) {
    forcedDown = symbols[(symbols.indexOf(forcedUp) + 1) % symbols.length];
  }

  symbols.forEach((symbol) => {
    const coin = coins[symbol];
    let sign = Math.random() > 0.5 ? 1 : -1;
    if (symbol === forcedUp) sign = 1;
    if (symbol === forcedDown) sign = -1;
    const pct = 0.4 + Math.random() * coin.volatility;
    coin.price = Math.max(0.0001, coin.price + coin.price * sign * pct / 100);
    coin.history.push(coin.price);
    coin.history = coin.history.slice(-90);
  });
  renderWallet();
  renderLevel();
  renderCoins();
  renderHoldings();
  drawChart();
}

function drawChart() {
  const canvas = els.priceChart;
  const ctx = canvas.getContext("2d");
  const coin = activeCoin();
  const prices = coin.history;
  const width = canvas.width;
  const height = canvas.height;
  const min = Math.min(...prices) * 0.995;
  const max = Math.max(...prices) * 1.005;
  const range = Math.max(max - min, 1);
  const previous = prices[prices.length - 2] || prices[0];
  const change = previous ? (coin.price - previous) / previous * 100 : 0;

  els.priceChange.textContent = `${change >= 0 ? "↑" : "↓"} ${change.toFixed(2)}%`;
  els.priceChange.style.color = change >= 0 ? "var(--accent-2)" : "var(--red)";

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#101419";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(247, 241, 230, 0.12)";
  ctx.lineWidth = 1;
  for (let i = 1; i < 5; i += 1) {
    const y = i * height / 5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.strokeStyle = change >= 0 ? "#4cc9a6" : "#f05d5e";
  ctx.lineWidth = 4;
  ctx.beginPath();
  prices.forEach((price, index) => {
    const x = prices.length === 1 ? 0 : index / (prices.length - 1) * width;
    const y = height - ((price - min) / range * (height - 24) + 12);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.fillStyle = "#f2c94c";
  ctx.font = "700 18px Arial";
  ctx.fillText(`${state.activeCoin}: ${money(coin.price)} zł`, 16, 30);
}

function getCoinAmount() {
  const amount = Number(els.coinAmount.value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function buyCoin(amount = getCoinAmount()) {
  if (!amount) {
    showToast("Podaj poprawną ilość.");
    return;
  }

  const coin = activeCoin();
  const cost = amount * coin.price;
  if (state.cash < cost) {
    showToast("Brakuje złotówek na zakup.");
    return;
  }

  state.cash -= cost;
  coin.holding += amount;
  addXp(3);
  showToast(`Kupiono ${amount.toFixed(6)} ${state.activeCoin}.`);
  renderAll();
}

function sellCoin() {
  const amount = getCoinAmount();
  if (!amount) {
    showToast("Podaj poprawną ilość.");
    return;
  }

  const coin = activeCoin();
  if (coin.holding < amount) {
    showToast(`Nie masz tyle ${state.activeCoin}.`);
    return;
  }

  coin.holding -= amount;
  state.cash += amount * coin.price;
  addXp(2);
  showToast(`Sprzedano ${amount.toFixed(6)} ${state.activeCoin}.`);
  renderAll();
}

function buyMax() {
  const coin = activeCoin();
  const amount = Math.floor(state.cash / coin.price * 1000000) / 1000000;
  if (amount <= 0) {
    showToast("Brakuje złotówek na zakup.");
    return;
  }
  els.coinAmount.value = amount.toFixed(6);
  buyCoin(amount);
}

function sellMax() {
  const coin = activeCoin();
  const amount = Math.floor(coin.holding * 1000000) / 1000000;
  if (amount <= 0) {
    showToast(`Nie masz ${state.activeCoin} do sprzedaży.`);
    return;
  }
  els.coinAmount.value = amount.toFixed(6);
  sellCoin();
}

function minerPurchaseCost() {
  return 100 * 2 ** state.miners.length;
}

function minerRequiredLevel(minerIndex) {
  return Math.max(1, (minerIndex - 1) * 2);
}

function minerUpgradeCost(miner, type) {
  const base = type === "faster" ? 20 : 30;
  return base * 2 ** miner[type];
}

function minerInterval(miner) {
  return Math.max(2, 10 - miner.faster);
}

function minerReward(miner) {
  const coin = coins[state.miningCoin];
  return coin.mineYield * (1 + miner.bigger * 0.45) * miningMultiplier();
}

function totalMiningReward() {
  return state.miners.reduce((sum, miner) => sum + minerReward(miner), 0);
}

function mineOnce() {
  if (!state.miningOn) return;

  if (state.miners.length <= 0) {
    showToast("Najpierw kup koparkę.");
    toggleMining(false);
    return;
  }

  const now = Date.now();
  let totalReward = 0;
  state.miners.forEach((miner) => {
    if (!miner.nextAt || now >= miner.nextAt) {
      const factor = 0.9 + Math.random() * 0.2;
      const reward = minerReward(miner) * factor;
      miner.lastReward = reward;
      miner.nextAt = now + minerInterval(miner) * 1000;
      totalReward += reward;
    }
  });

  if (totalReward > 0) {
    coins[state.miningCoin].holding += totalReward;
    addXp(1);
    renderWallet();
    renderHoldings();
    renderMining();
  }

  state.miningTimer = window.setTimeout(mineOnce, 1000);
}

function toggleMining(force) {
  state.miningOn = typeof force === "boolean" ? force : !state.miningOn;
  window.clearTimeout(state.miningTimer);
  if (state.miningOn) {
    const now = Date.now();
    state.miners.forEach((miner) => {
      miner.nextAt = now;
    });
  }
  renderMining();

  if (state.miningOn) {
    mineOnce();
  }
}

function buyMiner() {
  const nextIndex = state.miners.length + 1;
  const requiredLevel = minerRequiredLevel(nextIndex);
  if (state.level < requiredLevel) {
    showToast(`Koparka ${nextIndex} wymaga poziomu ${requiredLevel}.`);
    return;
  }

  const cost = minerPurchaseCost();
  if (state.cash < cost) {
    showToast("Nie stać Cię na nową koparkę.");
    return;
  }
  state.cash -= cost;
  state.miners.push({
    id: state.nextMinerId,
    faster: 0,
    bigger: 0,
    lastReward: 0,
    nextAt: 0
  });
  state.nextMinerId += 1;
  addXp(20);
  showToast("Dokupiono koparkę.");
  renderAll();
}

function buyUpgrade(minerId, type) {
  const miner = state.miners.find((item) => item.id === minerId);
  if (!miner) return;

  const cost = minerUpgradeCost(miner, type);
  if (state.cash < cost) {
    showToast("Nie stać Cię na to ulepszenie.");
    return;
  }

  state.cash -= cost;
  miner[type] += 1;
  miner.nextAt = 0;
  addXp(12);
  showToast("Ulepszenie kupione.");
  renderAll();
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => switchPanel(tab.dataset.panel));
});

document.querySelectorAll("[data-panel-target]").forEach((button) => {
  button.addEventListener("click", () => switchPanel(button.dataset.panelTarget));
});

document.querySelectorAll(".color-bet").forEach((button) => {
  button.addEventListener("click", () => {
    state.selectedRouletteColor = button.dataset.color;
    document.querySelectorAll(".color-bet").forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");
    els.selectedRouletteColor.textContent = ROULETTE_LABELS[state.selectedRouletteColor];
  });
});

$("#spinBtn").addEventListener("click", spinSlots);
$("#resetSlotsBtn").addEventListener("click", resetSlots);
$("#rouletteSpinBtn").addEventListener("click", spinRoulette);
$("#tickPriceBtn").addEventListener("click", tickPrices);
$("#buyBtn").addEventListener("click", () => buyCoin());
$("#sellBtn").addEventListener("click", sellCoin);
$("#buyMaxBtn").addEventListener("click", buyMax);
$("#sellMaxBtn").addEventListener("click", sellMax);
$("#depositActionBtn").addEventListener("click", handleDepositAction);
els.depositAmount.addEventListener("input", updateDepositOffer);
els.depositDuration.addEventListener("change", updateDepositOffer);
$("#takeLoanBtn").addEventListener("click", takeLoan);
$("#repayLoanBtn").addEventListener("click", repayLoan);
$("#buyEnergyDrinkBtn").addEventListener("click", buyEnergyDrink);
$("#useEnergyDrinkBtn").addEventListener("click", useEnergyDrink);
$("#buyRouterBtn").addEventListener("click", buyRouter);
$("#useRouterBtn").addEventListener("click", useRouter);
$("#buyLuckyCharmBtn").addEventListener("click", buyLuckyCharm);
$("#profileBtn").addEventListener("click", openProfile);
$("#profileCloseBtn").addEventListener("click", closeProfile);
$("#openAuthBtn").addEventListener("click", showAuth);
$("#authCloseBtn").addEventListener("click", hideAuth);
$("#loginBtn").addEventListener("click", loginUser);
$("#registerBtn").addEventListener("click", registerUser);
$("#resetProgressBtn").addEventListener("click", resetProgress);
$("#logoutBtn").addEventListener("click", logoutUser);
$("#deleteAccountBtn").addEventListener("click", deleteAccount);
$("#adminUnlockBtn").addEventListener("click", unlockAdminPanel);
$("#adminAddMoneyBtn").addEventListener("click", addAdminMoney);
$("#adminAddXpBtn").addEventListener("click", addAdminXp);
$("#adminAdvanceTimeBtn").addEventListener("click", advanceAdminTime);
els.adminCodeInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") unlockAdminPanel();
});
[els.loginInput, els.passwordInput].forEach((input) => {
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") loginUser();
  });
});
els.profileModal.addEventListener("click", (event) => {
  event.stopPropagation();
});
els.authModal.addEventListener("click", (event) => {
  event.stopPropagation();
});
els.profileOverlay.addEventListener("pointerdown", (event) => {
  profilePointerStartedOnOverlay = event.target === els.profileOverlay;
});
els.profileOverlay.addEventListener("click", (event) => {
  if (profilePointerStartedOnOverlay && event.target === els.profileOverlay) closeProfile();
  profilePointerStartedOnOverlay = false;
});
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !els.profileOverlay.hidden) closeProfile();
});
els.minersList.addEventListener("click", (event) => {
  if (event.target.closest("#toggleMiningBtn")) {
    toggleMining();
    return;
  }

  if (event.target.closest("#buyMinerBtn")) {
    buyMiner();
    return;
  }

  const button = event.target.closest("[data-upgrade]");
  if (!button) return;
  buyUpgrade(Number(button.dataset.minerId), button.dataset.upgrade);
});
els.minersList.addEventListener("change", (event) => {
  if (event.target.id !== "miningCoin") return;
  state.miningCoin = event.target.value;
  renderMining();
});
window.addEventListener("resize", updateRouletteRadius);

window.setInterval(tickPrices, 1000);
window.setInterval(renderBank, 1000);
window.setInterval(renderInventory, 1000);
window.setInterval(saveGame, 5000);
window.addEventListener("beforeunload", saveGame);
initAuth();
updateRouletteRadius();
renderSlots();
renderAll();
