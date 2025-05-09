// battery.js
document.addEventListener('DOMContentLoaded', () => {
  // ── Load settings ───────────────────────────
  const s = JSON.parse(localStorage.getItem('appSettings') || '{}');
  document.body.classList.toggle('dark', s.theme==='dark');

  const batterySize  = parseFloat(s.battery) || 0;    // kWh
  const currentSoc   = parseFloat(s.soc)     || 0;    // %
  const speed        = parseFloat(s.speed)   || 7.4;  // kW
  const region       = s.region              || 'DK2';// DK1/DK2

  // ── DOM refs ────────────────────────────────
  const targetSlider   = document.getElementById('targetSlider');
  const departureInput = document.getElementById('departureTime');
  const toggleV2GBtn   = document.getElementById('toggleV2GBtn');
  const v2gSettings    = document.getElementById('v2gSettings');
  const balanceMin     = document.getElementById('balanceMin');
  const balanceMax     = document.getElementById('balanceMax');
  const balanceMinVal  = document.getElementById('balanceMinVal');
  const balanceMaxVal  = document.getElementById('balanceMaxVal');
  const currentBattery = document.getElementById('currentBattery');
  const targetBattery  = document.getElementById('targetBattery');
  const v2gMinLine     = document.getElementById('v2gMinLine');
  const v2gMaxLine     = document.getElementById('v2gMaxLine');
  const expectedEl     = document.getElementById('expectedStartTime');
  const costEl         = document.getElementById('estimatedCost');
  const immediateBtn   = document.getElementById('immediateBtn');

  let v2gEnabled  = JSON.parse(localStorage.getItem('v2gEnabled'))  || false;
  let chargingNow = JSON.parse(localStorage.getItem('chargingNow')) || false;

  // ── Initialize V2G toggle & labels ──────────
  toggleV2GBtn.classList.toggle('active', v2gEnabled);
  toggleV2GBtn.textContent = v2gEnabled
    ? 'Disable V2G Balancing'
    : 'Enable V2G Balancing';
  v2gSettings.style.display = v2gEnabled ? 'block' : 'none';

  balanceMinVal.textContent = `${balanceMin.value}%`;
  balanceMaxVal.textContent = `${balanceMax.value}%`;

  immediateBtn.classList.toggle('active', chargingNow);
  immediateBtn.textContent = chargingNow
    ? 'Stop Charging'
    : 'Charge Immediately';

  // ── Core update function ────────────────────
  async function updateDisplay() {
    // % → fraction
    const targetPct = +targetSlider.value;
    const needPct   = Math.max(0, targetPct - currentSoc) / 100;
    const kWhNeeded = batterySize * needPct;           // kWh
    const totalHrs  = kWhNeeded / speed;               // float hours
    const totalMins = Math.round(totalHrs * 60);

    // ─ time calc ─
    const [h,m]   = departureInput.value.split(':').map(Number);
    const depMin  = h*60 + m;
    const startMin= depMin - totalMins;
    const sh      = Math.floor(startMin/60);
    const sm      = (startMin % 60 + 60) % 60;
    const dt      = new Date();
    dt.setHours(sh, sm);
    expectedEl.textContent = dt.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});

    // ─ bars ─
    currentBattery.style.width = `${currentSoc}%`;
    currentBattery.textContent = `${currentSoc}%`;
    targetBattery.style.left  = `${currentSoc}%`;
    targetBattery.style.width = `${Math.max(0, targetPct - currentSoc)}%`;
    targetBattery.textContent = targetPct>currentSoc ? `${targetPct}%` : '';

    // ─ V2G ─
    if (v2gEnabled) {
      v2gSettings.style.display = 'block';
      v2gMinLine.style.left     = `${+balanceMin.value}%`;
      v2gMaxLine.style.left     = `${+balanceMax.value}%`;
      v2gMinLine.style.display  =
      v2gMaxLine.style.display  = 'block';
    } else {
      v2gSettings.style.display = 'none';
      v2gMinLine.style.display  =
      v2gMaxLine.style.display  = 'none';
    }

    // ─ fetch prices ─
    const today = new Date();
    const YYYY  = today.getFullYear();
    const MM    = String(today.getMonth()+1).padStart(2,'0');
    const DD    = String(today.getDate()).padStart(2,'0');
    const url   = `https://www.elprisenligenu.dk/api/v1/prices/${YYYY}/${MM}-${DD}_${region}.json`;

    const resp   = await fetch(url);
    const prices = await resp.json();

    // ─ cost calc ─
    let remMins    = totalMins;
    let cursorMin  = startMin;
    let totalDKK   = 0;

    while (remMins > 0) {
      const hourIdx      = ((Math.floor(cursorMin/60)%24)+24)%24;
      const pricePerKWh  = prices[hourIdx]?.DKK_per_kWh || 0;
      const minsThisHour = Math.min(
        remMins,
        60 - ((cursorMin%60+60)%60)
      );
      const kWhThisHour  = speed * (minsThisHour/60);
      totalDKK += kWhThisHour * pricePerKWh;
      remMins   -= minsThisHour;
      cursorMin += minsThisHour;
    }

    costEl.textContent = `${totalDKK.toFixed(2)}`;
  }

  // ── Event listeners ────────────────────────
  toggleV2GBtn.addEventListener('click', () => {
    v2gEnabled = !v2gEnabled;
    localStorage.setItem('v2gEnabled', JSON.stringify(v2gEnabled));
    toggleV2GBtn.classList.toggle('active', v2gEnabled);
    toggleV2GBtn.textContent = v2gEnabled
      ? 'Disable V2G Balancing'
      : 'Enable V2G Balancing';
    updateDisplay();
  });

  balanceMin.addEventListener('input', () => {
    balanceMinVal.textContent = `${balanceMin.value}%`;
    updateDisplay();
  });
  balanceMax.addEventListener('input', () => {
    balanceMaxVal.textContent = `${balanceMax.value}%`;
    updateDisplay();
  });

  targetSlider.addEventListener('input', updateDisplay);
  departureInput.addEventListener('change', updateDisplay);

  immediateBtn.addEventListener('click', () => {
    chargingNow = !chargingNow;
    localStorage.setItem('chargingNow', JSON.stringify(chargingNow));
    immediateBtn.classList.toggle('active', chargingNow);
    immediateBtn.textContent = chargingNow
      ? 'Stop Charging'
      : 'Charge Immediately';
  });

  // ── Kick off ───────────────────────────────
  updateDisplay();
});
