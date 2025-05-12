// battery.js
document.addEventListener('DOMContentLoaded', () => {
  console.log('battery.js: DOMContentLoaded event fired.');
  class Elbil {
    constructor(kapacitetKWh, maxLadeeffekt, nuværendeSoC) {
      this.kapacitetKWh = kapacitetKWh;
      this.maxLadeeffekt = maxLadeeffekt;
      this.nuværendeSoC = nuværendeSoC;
    }
    beregnTilgaengeligKapacitet() { return this.kapacitetKWh * (1 - this.nuværendeSoC / 100); }
    opdaterSoC(nySoC) { this.nuværendeSoC = Math.min(100, Math.max(0, nySoC)); return this.nuværendeSoC; }
  }

  const elbil = new Elbil(80, 11, 25);
  let appS = {};

  function refreshElbilFromSettings() {
    console.log('battery.js: refreshElbilFromSettings CALLED');
    const currentAppSettingsRaw = localStorage.getItem('appSettings');
    if (!currentAppSettingsRaw) {
      console.error("battery.js: appSettings not found in localStorage. Using hardcoded defaults for elbil & appS.");
      elbil.kapacitetKWh = 60;
      elbil.maxLadeeffekt = 7.4;
      elbil.nuværendeSoC = 25;
      appS = { battery: "60", speed: "7.4", soc: "25", region: "DK2" }; // Fjernet theme
      // document.body.classList.remove('dark'); document.body.classList.add('light'); // FJERNET
      return appS;
    }
    appS = JSON.parse(currentAppSettingsRaw);
    elbil.kapacitetKWh = parseFloat(appS.battery) || 60;
    elbil.maxLadeeffekt = parseFloat(appS.speed) || 7.4;
    elbil.nuværendeSoC = parseFloat(appS.soc) || 0;
    console.log('battery.js: Elbil refreshed:', elbil, 'appS refreshed:', appS);
    // document.body.classList.toggle('dark', appS.theme === 'dark'); // FJERNET
    return appS;
  }

  refreshElbilFromSettings();

  const BALANCE_SETTINGS_KEY = 'balanceSettings';
  const BATTERY_PAGE_SETTINGS_KEY = 'batteryPageSettings';
  const storedBatteryPageSettings = JSON.parse(localStorage.getItem(BATTERY_PAGE_SETTINGS_KEY) || '{}');

  const targetSl = document.getElementById('targetSlider');
  const depIn = document.getElementById('departureTime');
  const manStart = document.getElementById('manualStartTime');
  const manEnd = document.getElementById('manualEndTime');
  const smartBtn = document.getElementById('smartBtn');
  const manualBtn = document.getElementById('manualBtn');
  const smartCtrls = document.getElementById('smartControls');
  const manualCtrls = document.getElementById('manualControls');
  const currBar = document.getElementById('currentBattery');
  const targBar = document.getElementById('targetBattery');
  const minLine = document.getElementById('v2gMinLine');
  const maxLine = document.getElementById('v2gMaxLine');
  const startLine = document.getElementById('startLine');
  const costLine = document.getElementById('costLine');
  const startBtn = document.getElementById('startChargingBtn');
  const saveBtn = document.getElementById('saveChangesBtn');

  let nowOn = JSON.parse(localStorage.getItem('chargingNow')) || false;
  let sessionActive = JSON.parse(localStorage.getItem('sessionActive')) || false;
  let sessionInfo = localStorage.getItem('sessionInfo') || '';
  let mode = storedBatteryPageSettings.mode || 'smart';

  targetSl.value = storedBatteryPageSettings.target || 80;
  depIn.value = storedBatteryPageSettings.departure || '07:00';
  manStart.value = storedBatteryPageSettings.manualStartTime || '';
  manEnd.value = storedBatteryPageSettings.manualEndTime || '';

  if (mode === 'manual') {
    manualBtn.classList.add('active'); smartBtn.classList.remove('active');
    smartCtrls.style.display = 'none'; manualCtrls.style.display = '';
  } else {
    smartBtn.classList.add('active'); manualBtn.classList.remove('active');
    smartCtrls.style.display = ''; manualCtrls.style.display = 'none';
  }

  function persistBatteryPageInputs() {
    const o = { target: targetSl.value, departure: depIn.value, manualStartTime: manStart.value, manualEndTime: manEnd.value, mode: mode };
    localStorage.setItem(BATTERY_PAGE_SETTINGS_KEY, JSON.stringify(o));
  }

  let pricesCache = null;
  async function getPrices() {
    // ... (getPrices logic as before, den er uafhængig af tema) ...
    console.log('battery.js: getPrices CALLED');
    const currentAppSettingsForRegion = JSON.parse(localStorage.getItem('appSettings') || '{}');
    const region = currentAppSettingsForRegion.region || 'DK2';

    if (!pricesCache) {
      const d = new Date(), YYYY = d.getFullYear(), MM = String(d.getMonth() + 1).padStart(2, '0'), DD = String(d.getDate()).padStart(2, '0');
      const url = `https://www.elprisenligenu.dk/api/v1/prices/${YYYY}/${MM}-${DD}_${region}.json`;
      console.log('battery.js: Fetching prices for region:', region, 'URL:', url);
      try {
        const response = await fetch(url);
        if (!response.ok) {
          console.error(`battery.js: Failed to fetch prices. Status: ${response.status}, URL: ${url}`);
          pricesCache = Array(24).fill({ DKK_per_kWh: 0.5 });
          return pricesCache;
        }
        pricesCache = await response.json();
        console.log('battery.js: Prices fetched successfully:', pricesCache);
        if (!Array.isArray(pricesCache) || pricesCache.length === 0) {
          console.warn('battery.js: Price data is empty or not in expected format. Using fallback.');
          pricesCache = Array(24).fill({ DKK_per_kWh: 0.5 });
        } else if (pricesCache.length < 24) {
          console.warn(`battery.js: Price data has only ${pricesCache.length} hours. Padding with fallback.`);
          const fallbackPrice = pricesCache.length > 0 ? pricesCache[pricesCache.length - 1].DKK_per_kWh : 0.5;
          while (pricesCache.length < 24) {
            pricesCache.push({ DKK_per_kWh: fallbackPrice });
          }
        }
      } catch (error) {
        console.error('battery.js: Error fetching or parsing prices:', error);
        pricesCache = Array(24).fill({ DKK_per_kWh: 0.5 });
      }
    } else {
      console.log('battery.js: Using cached prices.');
    }
    return pricesCache;
  }

  function reflectNow() {
    startBtn.classList.toggle('active', nowOn);
    startBtn.textContent = nowOn ? 'Stop Opladning' : 'Start Opladning';
  }
  function reflectSessionBtn() {
    if (sessionActive) {
      saveBtn.classList.add('active');
      const currentInfoText = localStorage.getItem('sessionInfo') || (mode === 'smart' ?
        document.getElementById('startLine')?.querySelector('strong')?.textContent :
        document.getElementById('startLine')?.querySelector('strong')?.textContent);
      saveBtn.textContent = `Session aktiv. ${currentInfoText || 'Detaljer utilgængelige'}`;
    } else {
      saveBtn.classList.remove('active');
      saveBtn.textContent = 'Start Session'; // "Start Session" beholdes ofte, men kan ændres
    }
  }

  reflectNow();
  reflectSessionBtn();

  async function updateSmart() {
    // ... (updateSmart logic as before, men uden creditLine og creditEl) ...
    console.log('battery.js: updateSmart CALLED');
    refreshElbilFromSettings();
    persistBatteryPageInputs();

    const tp = parseFloat(targetSl.value) || 80;
    const currentSoC = elbil.nuværendeSoC;
    console.log(`battery.js (smart): Current SoC: ${currentSoC}, Target SoC: ${tp}`);

    const needP = Math.max(0, tp - currentSoC) / 100;
    const kWhReq = elbil.kapacitetKWh > 0 ? elbil.kapacitetKWh * needP : 0;
    const mins = elbil.maxLadeeffekt > 0 ? Math.round((kWhReq / elbil.maxLadeeffekt) * 60) : Infinity;
    console.log(`battery.js (smart): kWhReq: ${kWhReq.toFixed(2)}, Mins to charge: ${mins}`);

    if (mins === Infinity && kWhReq > 0) {
      console.warn("battery.js: Max charging power is 0 or not set, cannot calculate charging time.");
      startLine.innerHTML = `Opladning starter kl. <strong>--:--</strong> (tjek ladehastighed i indstillinger)`;
      costLine.innerHTML = `Est. Pris: <strong>--.-- DKK</strong>`;
    } else if (mins === 0 && kWhReq === 0 && currentSoC >= tp) {
      startLine.innerHTML = `Allerede ved eller over målet (<strong>${currentSoC.toFixed(0)}%</strong>).`;
      costLine.innerHTML = `Est. Pris: <strong>0.00 DKK</strong>`;
    } else if (mins === Infinity && kWhReq === 0) {
      startLine.innerHTML = `Allerede ved eller over målet. Ladehastighed er 0.`;
      costLine.innerHTML = `Est. Pris: <strong>0.00 DKK</strong>`;
    } else {
      const [h, m] = depIn.value.split(':').map(Number);
      const depM = h * 60 + m;
      const stM = depM - mins;
      const dt = new Date();
      dt.setHours(Math.floor(stM / 60), (stM % 60 + 60) % 60);
      const timeStr = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      startLine.innerHTML = `Opladning starter kl. <strong>${timeStr}</strong>`;

      const prices = await getPrices();
      console.log('battery.js: Prices for cost calculation (smart):', prices);
      if (!prices || prices.length < 24) {
        console.error("battery.js: Insufficient price data for cost calculation (smart).");
        costLine.innerHTML = `Est. Pris: <strong>Prisdata utilgængelig</strong>`;
      } else {
        let rem = mins, cursor = stM, total = 0;
        console.log(`battery.js (smart): Cost calc. Mins: ${mins}, StartM: ${stM}, DepM: ${depM}`);
        while (rem > 0 && cursor < depM + (12 * 60)) {
          const hr = ((Math.floor(cursor / 60) % 24) + 24) % 24;
          const priceData = prices[hr];
          const price = (priceData && typeof priceData.DKK_per_kWh === 'number') ? priceData.DKK_per_kWh : 0.5;
          const into = (cursor % 60 + 60) % 60;
          const chargeThisHourMax = 60 - into;
          const thisM = Math.min(rem, chargeThisHourMax);
          const kWhH = elbil.maxLadeeffekt > 0 ? elbil.maxLadeeffekt * (thisM / 60) : 0;

          // console.log(`battery.js (smart): hr=${hr}, price=${price.toFixed(3)}, thisM=${thisM}, kWhH=${kWhH.toFixed(3)}, remMins=${rem-thisM}, totalCostSoFar=${total.toFixed(3)}`); // For meget log
          total += kWhH * price;
          rem -= thisM;
          cursor += thisM;
        }
        costLine.innerHTML = `Est. Pris: <strong>${total.toFixed(2)} DKK</strong>`;
        console.log('battery.js (smart): Final Est. Cost:', total.toFixed(2));
      }
    }

    console.log(`battery.js (smart): Updating UI. currentSoC: ${currentSoC}, tp: ${tp}`);
    currBar.style.width = `${currentSoC}%`;
    currBar.textContent = `${currentSoC.toFixed(0)}%`;
    targBar.style.left = `${currentSoC}%`;
    const targetWidth = Math.max(0, tp - currentSoC);
    targBar.style.width = `${targetWidth}%`;
    targBar.textContent = targetWidth > 0 ? `${tp.toFixed(0)}%` : ``;

    const currentBalanceSettings = JSON.parse(localStorage.getItem(BALANCE_SETTINGS_KEY) || '{}');
    const v2gOverallEnabled = currentBalanceSettings.v2gOverallEnabled || false;

    if (v2gOverallEnabled) {
      const minSoCBal = parseFloat(currentBalanceSettings.minSoCForBalancing) || 0;
      const maxSoCBal = parseFloat(currentBalanceSettings.maxSoCForBalancing) || 100;
      console.log(`battery.js (smart): V2G Lines. Min: ${minSoCBal}%, Max: ${maxSoCBal}%`);
      minLine.style.left = `${minSoCBal}%`;
      maxLine.style.left = `${maxSoCBal}%`;
      minLine.style.display = 'block'; maxLine.style.display = 'block';
    } else {
      minLine.style.display = 'none'; maxLine.style.display = 'none';
    }

    if (sessionActive) {
      sessionInfo = startLine?.querySelector('strong')?.textContent || sessionInfo;
      localStorage.setItem('sessionInfo', sessionInfo);
      reflectSessionBtn();
    }
  }

  async function updateManual() {
    // ... (updateManual logic as before, men uden creditLine og creditEl) ...
    console.log('battery.js: updateManual CALLED');
    refreshElbilFromSettings();
    persistBatteryPageInputs();

    const currentBalanceSettings = JSON.parse(localStorage.getItem(BALANCE_SETTINGS_KEY) || '{}');
    const v2gOverallEnabled = currentBalanceSettings.v2gOverallEnabled || false;
    if (v2gOverallEnabled) {
      const minSoCBal = parseFloat(currentBalanceSettings.minSoCForBalancing) || 0;
      const maxSoCBal = parseFloat(currentBalanceSettings.maxSoCForBalancing) || 100;
      console.log(`battery.js (manual): V2G Lines. Min: ${minSoCBal}%, Max: ${maxSoCBal}%`);
      minLine.style.left = `${minSoCBal}%`; maxLine.style.left = `${maxSoCBal}%`;
      minLine.style.display = 'block'; maxLine.style.display = 'block';
    } else {
      minLine.style.display = 'none'; maxLine.style.display = 'none';
    }

    const currentSoC = elbil.nuværendeSoC;
    console.log(`battery.js (manual): Current SoC: ${currentSoC}`);
    currBar.style.width = `${currentSoC}%`; currBar.textContent = `${currentSoC.toFixed(0)}%`;
    targBar.style.width = `0%`; targBar.textContent = ``;

    const [sh, sm_man] = manStart.value ? manStart.value.split(':').map(Number) : [0, 0];
    const [eh, em_man] = manEnd.value ? manEnd.value.split(':').map(Number) : [0, 0];
    let sM = sh * 60 + sm_man, eM = eh * 60 + em_man;
    let dur = 0;
    if (manStart.value && manEnd.value) {
      if (eM <= sM) eM += 24 * 60;
      dur = eM - sM;
    } else {
      startLine.innerHTML = `Indstil start- og sluttid for manuel opladning.`;
      costLine.innerHTML = `Est. Pris: <strong>--.-- DKK</strong>`;
      if (sessionActive) { reflectSessionBtn(); }
      return;
    }
    console.log(`battery.js (manual): Duration: ${dur} mins`);

    const kWhGot = elbil.maxLadeeffekt > 0 ? elbil.maxLadeeffekt * (dur / 60) : 0;
    const pctInc = elbil.kapacitetKWh > 0 ? (kWhGot / elbil.kapacitetKWh) * 100 : 0;
    const newSoc = Math.min(100, currentSoC + pctInc);
    // mirror the Smart‐mode bar update here too
    const current = elbil.nuværendeSoC;
    currBar.style.width = `${current}%`;
    currBar.textContent = `${current}%`;
    targBar.style.left = `${current}%`;
    const predPct = Math.max(0, newSoc - current);
    targBar.style.width = `${predPct}%`;
    targBar.textContent = `${newSoc.toFixed(0)}%`;

    startLine.innerHTML = `Oplad fra ${manStart.value || '--:--'} til ${manEnd.value || '--:--'}. Est. ny SOC: <strong>${newSoc.toFixed(0)}%</strong>`;

    const prices = await getPrices();
    console.log('battery.js: Prices for cost calculation (manual):', prices);
    if (!prices || prices.length < 24) {
      console.error("battery.js: Insufficient price data for cost calculation (manual).");
      costLine.innerHTML = `Est. Pris: <strong>Prisdata utilgængelig</strong>`;
    } else {
      let rem = dur, cursor = sM, total = 0;
      console.log(`battery.js (manual): Cost calc. Duration: ${dur}, StartM: ${sM}`);
      while (rem > 0) {
        const hr = ((Math.floor(cursor / 60) % 24) + 24) % 24;
        const priceData = prices[hr];
        const price = (priceData && typeof priceData.DKK_per_kWh === 'number') ? priceData.DKK_per_kWh : 0.5;
        const into = (cursor % 60 + 60) % 60;
        const chargeThisHourMax = 60 - into;
        const thisM = Math.min(rem, chargeThisHourMax);
        const kWhH = elbil.maxLadeeffekt > 0 ? elbil.maxLadeeffekt * (thisM / 60) : 0;
        // console.log(`battery.js (manual): hr=${hr}, price=${price.toFixed(3)}, thisM=${thisM}, kWhH=${kWhH.toFixed(3)}, remMins=${rem-thisM}, totalCostSoFar=${total.toFixed(3)}`); // For meget log
        total += kWhH * price;
        rem -= thisM;
        cursor += thisM;
      }
      costLine.innerHTML = `Est. Pris: <strong>${total.toFixed(2)} DKK</strong>`;
      console.log('battery.js (manual): Final Est. Cost:', total.toFixed(2));
    }

    if (sessionActive) {
      sessionInfo = `${newSoc.toFixed(0)}%`; localStorage.setItem('sessionInfo', sessionInfo);
      reflectSessionBtn();
    }
  }

  targetSl.addEventListener('input', () => { if (mode === 'smart') updateSmart(); });
  depIn.addEventListener('change', () => { if (mode === 'smart') updateSmart(); });
  manStart.addEventListener('change', () => { if (mode === 'manual') updateManual(); });
  manEnd.addEventListener('change', () => { if (mode === 'manual') updateManual(); });
  smartBtn.addEventListener('click', () => {
    mode = 'smart'; smartBtn.classList.add('active'); manualBtn.classList.remove('active');
    smartCtrls.style.display = ''; manualCtrls.style.display = 'none';
    updateSmart(); persistBatteryPageInputs();
  });
  manualBtn.addEventListener('click', () => {
    mode = 'manual'; manualBtn.classList.add('active'); smartBtn.classList.remove('active');
    smartCtrls.style.display = 'none'; manualCtrls.style.display = '';
    updateManual(); persistBatteryPageInputs();
  });
  startBtn.addEventListener('click', () => {
    nowOn = !nowOn; localStorage.setItem('chargingNow', JSON.stringify(nowOn));
    reflectNow();
  });
  saveBtn.addEventListener('click', () => {
    sessionActive = !sessionActive; localStorage.setItem('sessionActive', JSON.stringify(sessionActive));
    if (sessionActive) {
      if (mode === 'smart') {
        const timeStrElement = startLine?.querySelector('strong');
        sessionInfo = timeStrElement ? timeStrElement.textContent : 'I/T'; // I/T for Ikke Tilgængelig
      } else {
        const socStrElement = startLine?.querySelector('strong');
        sessionInfo = socStrElement ? socStrElement.textContent : 'I/T'; // I/T for Ikke Tilgængelig
      }
      localStorage.setItem('sessionInfo', sessionInfo);
    } else {
      localStorage.removeItem('sessionInfo'); sessionInfo = '';
    }
    reflectSessionBtn();
  });

  window.addEventListener('storage', (event) => {
    if (event.key === 'appSettings' || event.key === BALANCE_SETTINGS_KEY) {
      console.log(`battery.js: ${event.key} changed. Refreshing battery page data.`);
      refreshElbilFromSettings();
      if (mode === 'manual') {
        updateManual();
      } else {
        updateSmart();
      }
    }
  });

  console.log('battery.js: Initializing page. Current mode:', mode);
  if (mode === 'manual') {
    updateManual();
  } else {
    updateSmart();
  }
});