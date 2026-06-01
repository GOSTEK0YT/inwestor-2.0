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
};

const SLOT_COST = 5;
const SLOT_SYMBOLS = ["7", "★", "◆", "●", "L"];
const ROULETTE_GREEN_SIZE = 9.73;
const ROULETTE_COLOR_SIZE = (360 - ROULETTE_GREEN_SIZE) / 18;
const ROULETTE_LABELS = {
  red: "Czerwony",
  black: "Czarny",
  green: "Zielony"
};

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
  minersList: $("#minersList")
};

let lastCash = state.cash;
let lastPortfolio = portfolioValue();

function money(value) {
  if (value >= 1000) return value.toLocaleString("pl-PL", { maximumFractionDigits: 2 });
  return value.toFixed(2);
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

function addXp(amount, reason) {
  if (amount <= 0) return;

  state.xp += amount;
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
    showToast(`+${amount} EXP: ${reason}`);
  }
}

function renderLevel() {
  const next = xpForNextLevel();
  els.playerLevel.textContent = state.level;
  els.xpText.textContent = `${state.xp} / ${next} EXP`;
  els.xpFill.style.width = `${Math.min(100, state.xp / next * 100)}%`;
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
  const buyRow = `
    <div class="miner-row">
      <article class="printer-card miner-buy-card">
        <h3>Nowa koparka</h3>
        <button id="buyMinerBtn" type="button" class="buy-printer">
          <span class="plus-box">+</span>
          <span>
            <strong>Dokup koparkę</strong>
            <small>koszt: ${minerCost} zł</small>
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

function renderAll() {
  renderWallet();
  renderLevel();
  renderCoins();
  renderHoldings();
  renderMining();
  drawChart();
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
  const result = Array.from({ length: 3 }, () => SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)]);
  renderSpinningSlots(result);
  els.slotFrame.classList.add("is-spinning");
  els.slotReels.classList.add("is-spinning");
  renderWallet();

  window.setTimeout(() => {
    clearSlotTimers();
    els.slotFrame.classList.remove("is-spinning");
    els.slotReels.classList.remove("is-spinning");
    renderSlots(result);
    state.slotSpinning = false;

    const allSame = result.every((symbol) => symbol === result[0]);
    const twoSevens = result.filter((symbol) => symbol === "7").length === 2;
    if (allSame) {
      const prize = result[0] === "7" ? 250 : 90;
      state.cash += prize;
      state.wins += 1;
      els.slotStatus.textContent = `+${prize} zł`;
      flashElement(els.slotReels, "is-win");
      addXp(result[0] === "7" ? 30 : 12);
      showToast(`Sloty wypłaciły ${prize} zł.`);
    } else if (twoSevens) {
      state.cash += 25;
      els.slotStatus.textContent = "+25 zł";
      flashElement(els.slotReels, "is-win");
      addXp(6);
      showToast("Dwie siódemki: +25 zł.");
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
  if (number === 0) return { number, color: "green" };
  return { number, color: number % 2 === 0 ? "black" : "red" };
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

function minerPurchaseCost() {
  return 100 * 2 ** state.miners.length;
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
  return coin.mineYield * (1 + miner.bigger * 0.45);
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
$("#infiniteMoneyBtn").addEventListener("click", () => {
  state.cash = 999999999;
  renderWallet();
  showToast("Tryb testowy: kasa bez limitu.");
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
updateRouletteRadius();
renderSlots();
renderAll();
