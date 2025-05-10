document.addEventListener('DOMContentLoaded', () => {
  // ── Load settings ───────────────────────────
  const S = JSON.parse(localStorage.getItem('appSettings')||'{}');
  document.body.classList.toggle('dark', S.theme==='dark');
  const batterySize = parseFloat(S.battery)||0,
        currentSoc  = parseFloat(S.soc)||0,
        speed       = parseFloat(S.speed)||7.4,
        region      = S.region||'DK2';

  // ── Load last session inputs ─────────────────
  const stored = JSON.parse(localStorage.getItem('batterySettings')||'{}');

  // ── Cache prices ─────────────────────────────
  let pricesCache = null;
  async function getPrices() {
    if (!pricesCache) {
      const d    = new Date(),
            YYYY = d.getFullYear(),
            MM   = String(d.getMonth()+1).padStart(2,'0'),
            DD   = String(d.getDate()).padStart(2,'0'),
            url  = `https://www.elprisenligenu.dk/api/v1/prices/${YYYY}/${MM}-${DD}_${region}.json`;
      pricesCache = await fetch(url).then(r=>r.json());
    }
    return pricesCache;
  }

  // ── DOM refs ────────────────────────────────
  const smartBtn    = document.getElementById('smartBtn'),
        manualBtn   = document.getElementById('manualBtn'),
        smartCtrls  = document.getElementById('smartControls'),
        manualCtrls = document.getElementById('manualControls'),
        targetSl    = document.getElementById('targetSlider'),
        depIn       = document.getElementById('departureTime'),
        manStart    = document.getElementById('manualStartTime'),
        manEnd      = document.getElementById('manualEndTime'),
        toggleBtn   = document.getElementById('toggleV2GBtn'),
        v2gSet      = document.getElementById('v2gSettings'),
        bStartIn    = document.getElementById('balanceStartTime'),
        bEndIn      = document.getElementById('balanceEndTime'),
        bMin        = document.getElementById('balanceMin'),
        bMax        = document.getElementById('balanceMax'),
        bMinVal     = document.getElementById('balanceMinVal'),
        bMaxVal     = document.getElementById('balanceMaxVal'),
        currBar     = document.getElementById('currentBattery'),
        targBar     = document.getElementById('targetBattery'),
        minLine     = document.getElementById('v2gMinLine'),
        maxLine     = document.getElementById('v2gMaxLine'),
        startLine   = document.getElementById('startLine'),
        costLine    = document.getElementById('costLine'),
        creditLine  = document.getElementById('creditLine'),
        creditEl    = document.getElementById('estimatedCredits'),
        startBtn    = document.getElementById('startChargingBtn'),
        saveBtn     = document.getElementById('saveChangesBtn');

  let v2gOn = JSON.parse(localStorage.getItem('v2gEnabled'))||false;
  let nowOn = JSON.parse(localStorage.getItem('chargingNow'))||false;
  let mode  = 'smart';

  // ── Restore stored inputs ────────────────────
  if (stored.target         != null) targetSl.value        = stored.target;
  if (stored.departure      ) depIn.value             = stored.departure;
  if (stored.manualStartTime) manStart.value          = stored.manualStartTime;
  if (stored.manualEndTime  ) manEnd.value            = stored.manualEndTime;
  if (stored.balanceStartTime) bStartIn.value          = stored.balanceStartTime;
  if (stored.balanceEndTime ) bEndIn.value            = stored.balanceEndTime;
  if (stored.minMargin      ) bMin.value              = stored.minMargin;
  if (stored.maxMargin      ) bMax.value              = stored.maxMargin;
  bMinVal.textContent = `${bMin.value}%`;
  bMaxVal.textContent = `${bMax.value}%`;

  // ── Persist session inputs ───────────────────
  function saveSettings() {
    const out = {
      target:           targetSl.value,
      departure:        depIn.value,
      manualStartTime:  manStart.value,
      manualEndTime:    manEnd.value,
      balanceStartTime: bStartIn.value,
      balanceEndTime:   bEndIn.value,
      minMargin:        bMin.value,
      maxMargin:        bMax.value
    };
    localStorage.setItem('batterySettings', JSON.stringify(out));
  }

  // ── Reflect V2G toggle ──────────────────────
  function reflectV2G() {
    toggleBtn.classList.toggle('active', v2gOn);
    toggleBtn.textContent = v2gOn
      ? 'Disable V2G Balancing'
      : 'Enable V2G Balancing';
    v2gSet.style.display = v2gOn ? 'block' : 'none';
    creditLine.style.display = v2gOn ? 'block' : 'none';
  }

  // ── Reflect charging button ─────────────────
  function reflectNow() {
    startBtn.classList.toggle('active', nowOn);
    startBtn.textContent = nowOn ? 'Stop Charging' : 'Start Charging';
  }

  reflectV2G();
  reflectNow();

  // ── Smart charging update ───────────────────
  async function updateSmart() {
    saveSettings();
    const tp     = +targetSl.value,
          needP  = Math.max(0, tp - currentSoc) / 100,
          kWhReq = batterySize * needP,
          mins   = Math.round((kWhReq / speed) * 60);

    // compute start time
    const [h,m] = depIn.value.split(':').map(Number),
          depM = h*60 + m,
          stM  = depM - mins,
          dt   = new Date();
    dt.setHours(Math.floor(stM/60), (stM%60+60)%60);
    const timeStr = dt.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});

    // update bottom box
    startLine.innerHTML = 
      `Charging starts at <strong><span id="expectedStartTime">${timeStr}</span></strong>`;

    // bars
    currBar.style.width   = `${currentSoc}%`;
    currBar.textContent   = `${currentSoc}%`;
    targBar.style.left    = `${currentSoc}%`;
    targBar.style.width   = `${Math.max(0,tp-currentSoc)}%`;
    targBar.textContent   = tp>currentSoc ? `${tp}%` : '';

    // V2G lines
    if (v2gOn) {
      minLine.style.left = `${+bMin.value}%`;
      maxLine.style.left = `${+bMax.value}%`;
      minLine.style.display = maxLine.style.display = 'block';
    } else {
      minLine.style.display = maxLine.style.display = 'none';
    }

    // cost
    const prices = await getPrices();
    let rem=mins, cursor=depM-mins, total=0;
    while(rem>0){
      const hr   = ((Math.floor(cursor/60)%24)+24)%24,
            price= prices[hr]?.DKK_per_kWh||0,
            into = (cursor%60+60)%60,
            thisM= Math.min(rem,60-into),
            kWhH = speed*(thisM/60);
      total+= kWhH*price;
      rem   -= thisM;
      cursor+= thisM;
    }
    costLine.innerHTML = 
      `Est. Cost: <strong><span id="estimatedCost">${total.toFixed(2)}</span> DKK</strong>`;

    // credits
    let credits=0;
    if(v2gOn){
      const [sh,sm]=bStartIn.value.split(':').map(Number),
            [eh,em]=bEndIn.value.split(':').map(Number);
      let sM=sh*60+sm, eM=eh*60+em;
      if(eM<=sM) eM+=24*60;
      const dur=eM-sM;
      credits = Math.floor(dur/15)*5;
    }
    creditEl.textContent=credits;
  }

  // ── Manual charging update ──────────────────
  async function updateManual() {
    saveSettings();
    const [sh,sm]=manStart.value.split(':').map(Number),
          [eh,em]=manEnd.value.split(':').map(Number);
    let sM=sh*60+sm, eM=eh*60+em;
    if(eM<=sM) eM+=24*60;
    const dur=eM-sM;

    // SOC
    const kWhGot = speed*(dur/60),
          pctInc = (kWhGot/batterySize)*100,
          newSoc = Math.min(100, currentSoc + pctInc);
    startLine.innerHTML = 
      `Estimated SOC: <strong><span id="expectedStartTime">${newSoc.toFixed(0)}%</span></strong>`;

    // cost
    const prices = await getPrices();
    let rem=dur, cursor=sM, total=0;
    while(rem>0){
      const hr   = ((Math.floor(cursor/60)%24)+24)%24,
            price= prices[hr]?.DKK_per_kWh||0,
            into = (cursor%60+60)%60,
            thisM= Math.min(rem,60-into),
            kWhH = speed*(thisM/60);
      total+= kWhH*price;
      rem   -= thisM;
      cursor+= thisM;
    }
    costLine.innerHTML = 
      `Est. Cost: <strong><span id="estimatedCost">${total.toFixed(2)}</span> DKK</strong>`;

    // credits
    let credits=0;
    if(v2gOn){
      const [sh2,sm2]=bStartIn.value.split(':').map(Number),
            [eh2,em2]=bEndIn.value.split(':').map(Number);
      let sM2=sh2*60+sm2, eM2=eh2*60+em2;
      if(eM2<=sM2) eM2+=24*60;
      const dur2=eM2-sM2;
      credits = Math.floor(dur2/15)*5;
    }
    creditEl.textContent=credits;
  }

  // ── Event wiring ────────────────────────────
  targetSl.addEventListener('input', () => mode==='smart'  && updateSmart());
  depIn.addEventListener('change', () => mode==='smart'  && updateSmart());
  manStart.addEventListener('change', () => mode==='manual'&& updateManual());
  manEnd.addEventListener('change', () => mode==='manual' && updateManual());
  bStartIn.addEventListener('change', () => mode==='smart'?updateSmart():updateManual());
  bEndIn.addEventListener('change',   () => mode==='smart'?updateSmart():updateManual());
  bMin.addEventListener('input',     () => { bMinVal.textContent=`${bMin.value}%`; mode==='smart'&&updateSmart(); });
  bMax.addEventListener('input',     () => { bMaxVal.textContent=`${bMax.value}%`; mode==='smart'&&updateSmart(); });

  toggleBtn.addEventListener('click', () => {
    v2gOn = !v2gOn;
    localStorage.setItem('v2gEnabled',JSON.stringify(v2gOn));
    reflectV2G();
    mode==='smart'?updateSmart():updateManual();
  });

  smartBtn.addEventListener('click',() =>{ mode='smart'; smartBtn.classList.add('active'); manualBtn.classList.remove('active'); smartCtrls.style.display=''; manualCtrls.style.display='none'; updateSmart(); });
  manualBtn.addEventListener('click',() =>{ mode='manual'; manualBtn.classList.add('active'); smartBtn.classList.remove('active'); smartCtrls.style.display='none'; manualCtrls.style.display=''; updateManual(); });

  startBtn.addEventListener('click', () => {
    nowOn = !nowOn;
    localStorage.setItem('chargingNow',JSON.stringify(nowOn));
    reflectNow();
  });

  saveBtn.addEventListener('click', () => {
    const info = document.getElementById('expectedStartTime').textContent;
    saveBtn.textContent = mode==='smart'
      ? `Charging starts at ${info}`
      : `Estimated SOC: ${info}`;
  });

  // ── Kick off ───────────────────────────────
  updateSmart();
});
