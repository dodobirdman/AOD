// battery.js

document.addEventListener('DOMContentLoaded', () => {
  const current = 43;
  const chargeRate = 5;
  const costRate = 2.90;

  const targetSlider = document.getElementById('targetSlider');
  const departureInput = document.getElementById('departureTime');
  const toggleV2GBtn = document.getElementById('toggleV2GBtn');
  const v2gSettings = document.getElementById('v2gSettings');
  const balanceMin = document.getElementById('balanceMin');
  const balanceMax = document.getElementById('balanceMax');
  const balanceMinVal = document.getElementById('balanceMinVal');
  const balanceMaxVal = document.getElementById('balanceMaxVal');
  const currentBattery = document.getElementById('currentBattery');
  const targetBattery = document.getElementById('targetBattery');
  const v2gMinLine = document.getElementById('v2gMinLine');
  const v2gMaxLine = document.getElementById('v2gMaxLine');
  const expectedEl = document.getElementById('expectedStartTime');
  const costEl = document.getElementById('estimatedCost');
  const immediateBtn = document.getElementById('immediateBtn');
  const saveBtn = document.getElementById('saveChangesBtn');

  let v2gEnabled = JSON.parse(localStorage.getItem('v2gEnabled')) || false;
  let chargingNow = JSON.parse(localStorage.getItem('chargingNow')) || false;

  // Initialize toggles
  toggleV2GBtn.classList.toggle('active', v2gEnabled);
  toggleV2GBtn.textContent = v2gEnabled
    ? 'Disable V2G Balancing'
    : 'Enable V2G Balancing';
  v2gSettings.style.display = v2gEnabled ? 'block' : 'none';
  immediateBtn.classList.toggle('active', chargingNow);
  immediateBtn.textContent = chargingNow
    ? 'Stop Charging'
    : 'Charge Immediately';

  function updateBatteryDisplay() {
    const target = +targetSlider.value;
    const extra = Math.max(0, target - current);

    // Current & target bars
    currentBattery.style.width = `${current}%`;
    targetBattery.style.left = `${current}%`;
    targetBattery.style.width = `${extra}%`;
    targetBattery.textContent = extra > 0 ? `${target}%` : '';

    // V2G lines
    if (v2gEnabled) {
      const minVal = +balanceMin.value;
      const maxVal = +balanceMax.value;
      v2gMinLine.style.left = `${minVal}%`;
      v2gMinLine.style.display = 'block';
      v2gMaxLine.style.left = `${maxVal}%`;
      v2gMaxLine.style.display = 'block';
    } else {
      v2gMinLine.style.display = 'none';
      v2gMaxLine.style.display = 'none';
    }

    // Cost & time
    costEl.textContent = ((target - current) * costRate).toFixed(2);
    recalcTime();
  }

  function recalcTime() {
    const [h, m] = departureInput.value.split(':').map(Number);
    const departureMin = h * 60 + m;
    const target = +targetSlider.value;
    const neededMin = Math.max(0, (target - current) * chargeRate);
    const offset = v2gEnabled ? 15 : 0;
    let startMin = departureMin - neededMin - offset;
    startMin = Math.max(0, startMin);

    const sh = Math.floor(startMin / 60);
    const sm = startMin % 60;
    const ampm = sh < 12 ? 'AM' : 'PM';
    const displayH = ((sh + 11) % 12) + 1;
    expectedEl.textContent = `${displayH}:${String(sm).padStart(2,'0')} ${ampm}`;
  }

  toggleV2GBtn.addEventListener('click', () => {
    v2gEnabled = !v2gEnabled;
    localStorage.setItem('v2gEnabled', JSON.stringify(v2gEnabled));
    toggleV2GBtn.classList.toggle('active', v2gEnabled);
    toggleV2GBtn.textContent = v2gEnabled
      ? 'Disable V2G Balancing'
      : 'Enable V2G Balancing';
    v2gSettings.style.display = v2gEnabled ? 'block' : 'none';
    updateBatteryDisplay();
  });

  balanceMin.addEventListener('input', () => {
    balanceMinVal.textContent = `${balanceMin.value}%`;
    updateBatteryDisplay();
  });

  balanceMax.addEventListener('input', () => {
    balanceMaxVal.textContent = `${balanceMax.value}%`;
    updateBatteryDisplay();
  });

  targetSlider.addEventListener('input', updateBatteryDisplay);
  departureInput.addEventListener('change', recalcTime);

  immediateBtn.addEventListener('click', () => {
    chargingNow = !chargingNow;
    localStorage.setItem('chargingNow', JSON.stringify(chargingNow));
    immediateBtn.classList.toggle('active', chargingNow);
    immediateBtn.textContent = chargingNow
      ? 'Stop Charging'
      : 'Charge Immediately';
  });

  // Init
  balanceMinVal.textContent = `${balanceMin.value}%`;
  balanceMaxVal.textContent = `${balanceMax.value}%`;
  updateBatteryDisplay();

  saveBtn.addEventListener('click', () => {
    const cfg = {
      target: targetSlider.value,
      departure: departureInput.value,
      v2gEnabled,
      balanceStartTime: balanceStart.value,
      balanceEndTime: balanceEnd.value,
      minMargin: balanceMin.value,
      maxMargin: balanceMax.value,
      startTime: expectedEl.textContent,
      estCost: costEl.textContent,
      chargingNow
    };
    localStorage.setItem('batterySettings', JSON.stringify(cfg));
    alert('Changes saved!');
  });
});