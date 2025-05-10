// battery.js
document.addEventListener('DOMContentLoaded', () => {
  //
  // ─── DOMAIN MODEL CLASSES ─────────────────────────────────────────────────────
  //
  class Elbil {
    constructor(kapacitetKWh, maxLadeeffekt, nuværendeSoC) {
      this.kapacitetKWh  = kapacitetKWh;
      this.maxLadeeffekt = maxLadeeffekt;
      this.nuværendeSoC  = nuværendeSoC;
    }
    beregnTilgaengeligKapacitet() {
      return this.kapacitetKWh * (1 - this.nuværendeSoC/100);
    }
    opdaterSoC(nySoC) {
      this.nuværendeSoC = Math.min(100, Math.max(0, nySoC));
      return this.nuværendeSoC;
    }
    erTilgaengeligTilBalancering(minSoC, maxSoC) {
      return this.nuværendeSoC >= minSoC && this.nuværendeSoC <= maxSoC;
    }
  }

  class Session {
    constructor(bil) {
      this.sessionId = `sess-${Date.now()}`;
      this.bil       = bil;
      this.startTid  = new Date();
      this.slutTid   = null;
    }
    afslutSession() {
      this.slutTid = new Date();
    }
    erAktiv() {
      return this.slutTid === null;
    }
  }

  class OpladningsSession extends Session {
    constructor(bil) {
      super(bil);
      this.opladetKWh = 0;
    }
    startLadning() {
      this.startTid = new Date();
    }
    stopLadning() {
      this.slutTid = new Date();
    }
    beregnVarighed() {
      if (!this.slutTid) return 0;
      return (this.slutTid - this.startTid)/1000/60;
    }
  }

  class BalanceOrdre {
    constructor(type, varighedMin, ønsketEffektKW) {
      this.ordreId        = `ord-${Date.now()}`;
      this.type           = type;
      this.varighedMin    = varighedMin;
      this.ønsketEffektKW = ønsketEffektKW;
    }
    erRelevantForBil(bil) {
      return true;
    }
  }

  class YdelsesEffekt {
    constructor(aflastningsEffektKW, varighedMinutter) {
      this.aflastningsEffektKW = aflastningsEffektKW;
      this.varighedMinutter    = varighedMinutter;
      this.energimaengdeKWh    = this.beregnEnergi();
    }
    beregnEnergi() {
      return this.aflastningsEffektKW * (this.varighedMinutter/60);
    }
  }

  class BalanceSession extends Session {
    constructor(bil) {
      super(bil);
      this.balanceOrdre  = [];
      this.sessionEffekt = [];
      this.aktiveret     = false;
    }
    hentBalanceOrdre(ordeliste) {
      this.balanceOrdre = ordeliste.filter(o=>o.erRelevantForBil(this.bil));
      return this.balanceOrdre;
    }
    initierBalancering() {
      this.aktiveret = true;
      this.sessionEffekt = this.balanceOrdre.map(
        o=>new YdelsesEffekt(o.ønsketEffektKW, o.varighedMin)
      );
      return this.sessionEffekt;
    }
    stopBalanceSession() {
      this.aktiveret = false;
      this.slutTid   = new Date();
    }
  }

  class Kredit {
    constructor(brugerId) {
      this.brugerId       = brugerId;
      this.kreditSaldo    = 0;
      this.samledeYdelser = [];
    }
    tilfoejYdelse(ydelse) {
      this.samledeYdelser.push(ydelse);
      this.kreditSaldo += Math.floor(ydelse.varighedMinutter/15)*5;
    }
    visSaldo() {
      return this.kreditSaldo;
    }
  }

  //
  // ─── SETUP & PERSISTENCE ───────────────────────────────────────────────────────
  //
  const appS   = JSON.parse(localStorage.getItem('appSettings') || '{}');
  const elbil  = new Elbil(
    parseFloat(appS.battery)||0,
    parseFloat(appS.speed  )||7.4,
    parseFloat(appS.soc    )||0
  );
  document.body.classList.toggle('dark', appS.theme==='dark');

  const stored = JSON.parse(localStorage.getItem('batterySettings') || '{}');

  const
    targetSl   = document.getElementById('targetSlider'),
    depIn      = document.getElementById('departureTime'),
    manStart   = document.getElementById('manualStartTime'),
    manEnd     = document.getElementById('manualEndTime'),
    bStartIn   = document.getElementById('balanceStartTime'),
    bEndIn     = document.getElementById('balanceEndTime'),
    bMin       = document.getElementById('balanceMin'),
    bMax       = document.getElementById('balanceMax'),
    bMinVal    = document.getElementById('balanceMinVal'),
    bMaxVal    = document.getElementById('balanceMaxVal'),
    smartBtn   = document.getElementById('smartBtn'),
    manualBtn  = document.getElementById('manualBtn'),
    smartCtrls = document.getElementById('smartControls'),
    manualCtrls= document.getElementById('manualControls'),
    toggleBtn  = document.getElementById('toggleV2GBtn'),
    v2gSet     = document.getElementById('v2gSettings'),
    currBar    = document.getElementById('currentBattery'),
    targBar    = document.getElementById('targetBattery'),
    minLine    = document.getElementById('v2gMinLine'),
    maxLine    = document.getElementById('v2gMaxLine'),
    startLine  = document.getElementById('startLine'),
    costLine   = document.getElementById('costLine'),
    creditLine = document.getElementById('creditLine'),
    creditEl   = document.getElementById('estimatedCredits'),
    startBtn   = document.getElementById('startChargingBtn'),
    saveBtn    = document.getElementById('saveChangesBtn');

  let v2gOn         = JSON.parse(localStorage.getItem('v2gEnabled'))  || false;
  let nowOn         = JSON.parse(localStorage.getItem('chargingNow')) || false;
  let sessionActive = JSON.parse(localStorage.getItem('sessionActive')) || false;
  let sessionInfo   = localStorage.getItem('sessionInfo') || '';
  let mode          = 'smart';

  // restore or default:
  targetSl.value    = stored.target          ?? 80;
  depIn.value       = stored.departure       || '07:00';
  manStart.value    = stored.manualStartTime || '';
  manEnd.value      = stored.manualEndTime   || '';
  bStartIn.value    = stored.balanceStartTime|| '';
  bEndIn.value      = stored.balanceEndTime  || '';
  bMin.value        = stored.minMargin       ?? 70;
  bMax.value        = stored.maxMargin       ?? 90;
  bMinVal.textContent = `${bMin.value}%`;
  bMaxVal.textContent = `${bMax.value}%`;

  function persistInputs() {
    const o = {
      target:           targetSl.value,
      departure:        depIn.value,
      manualStartTime:  manStart.value,
      manualEndTime:    manEnd.value,
      balanceStartTime: bStartIn.value,
      balanceEndTime:   bEndIn.value,
      minMargin:        bMin.value,
      maxMargin:        bMax.value
    };
    localStorage.setItem('batterySettings', JSON.stringify(o));
  }

  // fetch & cache prices
  let pricesCache = null;
  async function getPrices() {
    if (!pricesCache) {
      const d    = new Date(),
            YYYY = d.getFullYear(),
            MM   = String(d.getMonth()+1).padStart(2,'0'),
            DD   = String(d.getDate()).padStart(2,'0'),
            url  = `https://www.elprisenligenu.dk/api/v1/prices/${YYYY}/${MM}-${DD}_${appS.region||'DK2'}.json`;
      pricesCache = await fetch(url).then(r=>r.json());
    }
    return pricesCache;
  }

  // UI reflect helpers
  function reflectV2G() {
    toggleBtn.classList.toggle('active', v2gOn);
    toggleBtn.textContent = v2gOn
      ? 'Disable V2G Balancing'
      : 'Enable V2G Balancing';
    v2gSet.style.display    = v2gOn ? 'block' : 'none';
    creditLine.style.display = v2gOn ? 'block' : 'none';
  }
  function reflectNow() {
    startBtn.classList.toggle('active', nowOn);
    startBtn.textContent = nowOn ? 'Stop Charging' : 'Start Charging';
  }
  function reflectSessionBtn() {
    if (sessionActive) {
      saveBtn.classList.add('active');
      saveBtn.textContent = `Session active. Charging at ${sessionInfo}`;
    } else {
      saveBtn.classList.remove('active');
      saveBtn.textContent = 'Start Session';
    }
  }

  // initial UI state
  reflectV2G();
  reflectNow();
  reflectSessionBtn();

  //
  // ─── SMART CHARGING ─────────────────────────────────────────────────────────────
  //
  async function updateSmart() {
    persistInputs();
    const tp     = +targetSl.value,
          needP  = Math.max(0, tp - elbil.nuværendeSoC)/100,
          kWhReq = elbil.kapacitetKWh * needP,
          mins   = Math.round((kWhReq / elbil.maxLadeeffekt)*60);

    const [h,m] = depIn.value.split(':').map(Number),
          depM = h*60 + m,
          stM  = depM - mins,
          dt   = new Date();
    dt.setHours(Math.floor(stM/60), (stM%60+60)%60);
    const timeStr = dt.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
    startLine.innerHTML = `Charging starts at <strong>${timeStr}</strong>`;

    currBar.style.width = `${elbil.nuværendeSoC}%`;
    currBar.textContent = `${elbil.nuværendeSoC}%`;
    targBar.style.left  = `${elbil.nuværendeSoC}%`;
    targBar.style.width = `${Math.max(0,tp-elbil.nuværendeSoC)}%`;
    targBar.textContent = tp>elbil.nuværendeSoC?`${tp}%`:``;

    if(v2gOn) {
      minLine.style.left = `${+bMin.value}%`;
      maxLine.style.left = `${+bMax.value}%`;
      minLine.style.display = maxLine.style.display = 'block';
    } else {
      minLine.style.display = maxLine.style.display = 'none';
    }

    const prices = await getPrices();
    let rem=mins, cursor=depM-mins, total=0;
    while(rem>0){
      const hr    = ((Math.floor(cursor/60)%24)+24)%24,
            price = prices[hr].DKK_per_kWh,
            into  = (cursor%60+60)%60,
            thisM = Math.min(rem,60-into),
            kWhH  = elbil.maxLadeeffekt*(thisM/60);
      total += kWhH*price; rem-=thisM; cursor+=thisM;
    }
    costLine.innerHTML = `Est. Cost: <strong>${total.toFixed(2)} DKK</strong>`;

    // credits
    let credits=0;
    if(v2gOn){
      const [sh,sm] = bStartIn.value.split(':').map(Number),
            [eh,em] = bEndIn.value.split(':').map(Number);
      let sM=sh*60+sm, eM=eh*60+em; if(eM<=sM) eM+=24*60;
      const ordre=new BalanceOrdre('V2G', eM-sM,0),
            bs   =new BalanceSession(elbil),
            kred =new Kredit('user');
      bs.hentBalanceOrdre([ordre]);
      bs.initierBalancering();
      bs.sessionEffekt.forEach(y=>kred.tilfoejYdelse(y));
      credits = kred.visSaldo();
    }
    creditEl.textContent = credits;

    // if session is active, refresh its label
    if(sessionActive) {
      sessionInfo = timeStr;
      localStorage.setItem('sessionInfo', sessionInfo);
      reflectSessionBtn();
    }
  }

  //
  // ─── MANUAL CHARGING ────────────────────────────────────────────────────────────
  //
  async function updateManual() {
    persistInputs();
    const [sh,sm] = manStart.value.split(':').map(Number),
          [eh,em] = manEnd.value.split(':').map(Number);
    let sM=sh*60+sm, eM=eh*60+em; if(eM<=sM) eM+=24*60;
    const dur = eM-sM;

    const kWhGot = elbil.maxLadeeffekt*(dur/60),
          pctInc = (kWhGot/elbil.kapacitetKWh)*100,
          newSoc = Math.min(100, elbil.nuværendeSoC + pctInc);
    startLine.innerHTML = `Estimated SOC: <strong>${newSoc.toFixed(0)}%</strong>`;

    const prices = await getPrices();
    let rem=dur, cursor=sM, total=0;
    while(rem>0){
      const hr    = ((Math.floor(cursor/60)%24)+24)%24,
            price = prices[hr].DKK_per_kWh,
            into  = (cursor%60+60)%60,
            thisM = Math.min(rem,60-into),
            kWhH  = elbil.maxLadeeffekt*(thisM/60);
      total += kWhH*price; rem-=thisM; cursor+=thisM;
    }
    costLine.innerHTML = `Est. Cost: <strong>${total.toFixed(2)} DKK</strong>`;

    let credits=0;
    if(v2gOn){
      const [sh2,sm2] = bStartIn.value.split(':').map(Number),
            [eh2,em2] = bEndIn.value.split(':').map(Number);
      let sM2=sh2*60+sm2, eM2=eh2*60+em2; if(eM2<=sM2) eM2+=24*60;
      const ordre=new BalanceOrdre('V2G', eM2-sM2,0),
            bs   =new BalanceSession(elbil),
            kred =new Kredit('user');
      bs.hentBalanceOrdre([ordre]);
      bs.initierBalancering();
      bs.sessionEffekt.forEach(y=>kred.tilfoejYdelse(y));
      credits = kred.visSaldo();
    }
    creditEl.textContent = credits;

    if(sessionActive) {
      sessionInfo = `${newSoc.toFixed(0)}%`;
      localStorage.setItem('sessionInfo', sessionInfo);
      reflectSessionBtn();
    }
  }

  //
  // ─── EVENT HOOKS ───────────────────────────────────────────────────────────────
  //
  targetSl.addEventListener('input',   ()=>mode==='smart'  && updateSmart());
  depIn.addEventListener('change',    ()=>mode==='smart'  && updateSmart());
  manStart.addEventListener('change', ()=>mode==='manual' && updateManual());
  manEnd.addEventListener('change',   ()=>mode==='manual' && updateManual());
  bStartIn.addEventListener('change', ()=>mode==='smart'?updateSmart():updateManual());
  bEndIn.addEventListener('change',   ()=>mode==='smart'?updateSmart():updateManual());
  bMin.addEventListener('input',      ()=>{ bMinVal.textContent=`${bMin.value}%`; mode==='smart'&&updateSmart(); });
  bMax.addEventListener('input',      ()=>{ bMaxVal.textContent=`${bMax.value}%`; mode==='smart'&&updateSmart(); });

  toggleBtn.addEventListener('click', ()=>{
    v2gOn = !v2gOn;
    localStorage.setItem('v2gEnabled', JSON.stringify(v2gOn));
    reflectV2G();
    mode==='smart' ? updateSmart() : updateManual();
  });

  smartBtn.addEventListener('click', ()=>{
    mode='smart';
    smartBtn.classList.add('active');
    manualBtn.classList.remove('active');
    smartCtrls.style.display='';
    manualCtrls.style.display='none';
    updateSmart();
  });
  manualBtn.addEventListener('click', ()=>{
    mode='manual';
    manualBtn.classList.add('active');
    smartBtn.classList.remove('active');
    smartCtrls.style.display='none';
    manualCtrls.style.display='';
    updateManual();
  });

  startBtn.addEventListener('click', ()=>{
    nowOn = !nowOn;
    localStorage.setItem('chargingNow', JSON.stringify(nowOn));
    reflectNow();
  });

  saveBtn.addEventListener('click', ()=>{
    // toggle session
    sessionActive = !sessionActive;
    localStorage.setItem('sessionActive', JSON.stringify(sessionActive));

    // store the current displayed time/SOC
    const info = document.getElementById('expectedStartTime').textContent;
    sessionInfo = info;
    localStorage.setItem('sessionInfo', sessionInfo);

    reflectSessionBtn();
  });

  // kick off
  updateSmart();
});
