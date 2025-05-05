// battery.js

document.addEventListener('DOMContentLoaded', () => {
  const targetSlider = document.getElementById('targetSlider');
  const targetBattery = document.getElementById('targetBattery');
  const departureInput = document.getElementById('departureTime');
  const balCheckbox = document.getElementById('enableBalancing');
  const v2gBlock = document.getElementById('v2gSettings');
  const balStart = document.getElementById('balanceStartTime');
  const balEnd = document.getElementById('balanceEndTime');
  const balMargin = document.getElementById('balanceMargin');
  const balMarginVal = document.getElementById('balanceMarginValue');
  const expectedEl = document.getElementById('expectedStartTime');
  const costEl = document.getElementById('estimatedCost');
  const saveBtn = document.getElementById('saveChangesBtn');
  const startBtn = document.getElementById('startNowBtn');

  const current = 43;    // fixed current battery %
  const chargeRate = 5;  // minutes per %
  const costRate = 2.90; // DKK per kWh

  function updateOverlayAndCost() {
    const tgt = +targetSlider.value;
    const extra = Math.max(0, tgt - current);
    targetBattery.style.left = current + '%';
    targetBattery.style.width = extra + '%';
    targetBattery.textContent = extra > 0 ? tgt + '%' : '';

    // estimate cost: 1% → 1 kWh
    const cost = (tgt - current) * costRate;
    costEl.textContent = cost.toFixed(2);

    recalcTime();
  }

  function recalcTime() {
    const dep = departureInput.value.split(':').map(Number);
    if (!dep.length) { expectedEl.textContent = '--:--'; return; }
    let depMin = dep[0] * 60 + dep[1];
    const tgt = +targetSlider.value;
    const neededMin = Math.max(0, (tgt - current) * chargeRate);
    const extraOff = balCheckbox.checked ? 15 : 0;
    let startMin = depMin - neededMin - extraOff;
    startMin = Math.max(0, startMin);
    const h = Math.floor(startMin / 60), m = startMin % 60;
    expectedEl.textContent =
      `${(h % 12 || 12)}:${m.toString().padStart(2,'0')} ${h<12? 'AM':'PM'}`;
  }

  // Toggle V2G settings visibility
  balCheckbox.addEventListener('change', () => {
    v2gBlock.style.display = balCheckbox.checked ? 'block' : 'none';
    recalcTime();
  });

  // Balancing margin text update
  balMargin.addEventListener('input', () => {
    balMarginVal.textContent = balMargin.value + '%';
  });

  // Main listeners
  targetSlider.addEventListener('input', updateOverlayAndCost);
  departureInput.addEventListener('change', recalcTime);

  // Initialize
  balMarginVal.textContent = balMargin.value + '%';
  updateOverlayAndCost();

  saveBtn.addEventListener('click', () => {
    const cfg = {
      target: targetSlider.value,
      departure: departureInput.value,
      v2gEnabled: balCheckbox.checked,
      balanceStartTime: balStart.value,
      balanceEndTime: balEnd.value,
      v2gMargin: balMargin.value,
      startTime: expectedEl.textContent,
      estCost: costEl.textContent
    };
    localStorage.setItem('batterySettings', JSON.stringify(cfg));
    alert('Changes saved!');
  });

  startBtn.addEventListener('click', () => alert('Charging started now!'));
});