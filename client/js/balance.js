// js/balance.js
document.addEventListener('DOMContentLoaded', function () {
    console.log('balance.js: DOMContentLoaded event fired.');

    // START: DOMAIN MODEL CLASSES 
    class Elbil { 
        constructor(kapacitetKWh, nuværendeSoC) {
            this.kapacitetKWh = kapacitetKWh; 
            this.nuværendeSoC = nuværendeSoC; 
        }
    }
    class Session { 
        constructor(bil) {
            this.sessionId = `sess-${Date.now()}`; this.bil = bil; 
            this.startTid = new Date(); this.slutTid = null;
        }
        afslutSession() { this.slutTid = new Date(); }
        erAktiv() { return this.slutTid === null; }
    }
    class BalanceOrdre {
        constructor(type, varighedMin, ønsketEffektKW) {
            this.ordreId = `ord-${Date.now()}`; this.type = type;
            this.varighedMin = varighedMin; this.ønsketEffektKW = ønsketEffektKW; 
        }
        erRelevantForBil(bil) { return true; } 
    }
    class YdelsesEffekt {
        constructor(aflastningsEffektKW, varighedMinutter) {
            this.aflastningsEffektKW = aflastningsEffektKW; 
            this.varighedMinutter = varighedMinutter; 
        }
    }
    class BalanceSession extends Session {
        constructor(bil) {
            super(bil); this.balanceOrdre = [];
            this.sessionEffekt = []; this.aktiveret = false;
        }
        hentBalanceOrdre(ordeliste) {
            this.balanceOrdre = ordeliste.filter(o => o.erRelevantForBil(this.bil));
            return this.balanceOrdre;
        }
        initierBalancering() {
            this.aktiveret = true;
            this.sessionEffekt = this.balanceOrdre.map(
                o => new YdelsesEffekt(o.ønsketEffektKW, o.varighedMin) 
            );
            return this.sessionEffekt;
        }
        stopBalanceSession() { this.aktiveret = false; this.slutTid = new Date(); }
    }
    class Kredit {
        constructor(brugerId) {
            this.brugerId = brugerId; this.kreditSaldo = 0;
            this.samledeYdelser = []; 
        }
        tilfoejYdelse(ydelse) { 
            // console.log('Kredit.tilfoejYdelse CALLED with ydelse:', ydelse); 
            if (ydelse && typeof ydelse.varighedMinutter === 'number' && ydelse.varighedMinutter > 0) {
                this.samledeYdelser.push(ydelse);
                const creditsForThisYdelse = Math.floor(ydelse.varighedMinutter / 15) * 5;
                this.kreditSaldo += creditsForThisYdelse;
                // console.log(`Kredit.tilfoejYdelse: varighedMinutter=${ydelse.varighedMinutter.toFixed(0)}, creditsAdded=${creditsForThisYdelse}, newSaldo=${this.kreditSaldo}`);
            } else {
                // console.warn('Kredit.tilfoejYdelse: Invalid ydelse or varighedMinutter (<=0). Ydelse:', ydelse);
            }
        }
        visSaldo() { return this.kreditSaldo; }
    }
    // SLUT: DOMAIN MODEL CLASSES

    const radioButtons = document.getElementsByName('balanceMode');
    const timedSettingsDiv = document.getElementById('timedSettings');
    const balanceStartTimeInput = document.getElementById('balanceStartTime');
    const balanceEndTimeInput = document.getElementById('balanceEndTime');     
    const toggleV2GOverallBtn = document.getElementById('toggleV2GOverallBtn');
    const v2gSoCLimitsSettingsDiv = document.getElementById('v2gSoCLimitsSettings');
    const balanceMinSoCInput = document.getElementById('balanceMinSoC');
    const balanceMinSoCValDisplay = document.getElementById('balanceMinSoCVal');
    const balanceMaxSoCInput = document.getElementById('balanceMaxSoC');
    const balanceMaxSoCValDisplay = document.getElementById('balanceMaxSoCVal');
    const saveBalanceSettingsBtn = document.getElementById('saveBalanceSettingsBtn');
    const currentBatteryBalanceEl = document.getElementById('currentBatteryBalancePage');
    const targetBatteryBalanceEl = document.getElementById('targetBatteryBalancePage');
    const v2gMinLineBalanceEl = document.getElementById('v2gMinLineBalancePage');
    const v2gMaxLineBalanceEl = document.getElementById('v2gMaxLineBalancePage');
    const v2gCreditLineEl = document.getElementById('v2gCreditLine'); 
    const estimatedV2GCreditsEl = document.getElementById('estimatedV2GCredits');
    const creditsDisplaySectionEl = document.querySelector('.credits-display-section');

    const BALANCE_SETTINGS_KEY = 'balanceSettings';
    const APP_SETTINGS_KEY = 'appSettings'; 
    
    console.log('balance.js: DOM elements identified.');

    function updateV2GCreditsDisplay() {
        console.log('balance.js: updateV2GCreditsDisplay CALLED');
        const appSettingsRaw = localStorage.getItem(APP_SETTINGS_KEY);
        // const balanceSettingsRaw = localStorage.getItem(BALANCE_SETTINGS_KEY); // Ikke nødvendig her, da vi bruger input.value direkte

        if (!appSettingsRaw) { // Vi behøver kun appSettings for SoC og kapacitet
            console.error("balance.js: appSettings not found in localStorage for credit calculation.");
            if (estimatedV2GCreditsEl) estimatedV2GCreditsEl.textContent = "N/A";
            if (creditsDisplaySectionEl) creditsDisplaySectionEl.style.display = 'none';
            return;
        }
        const appSettings = JSON.parse(appSettingsRaw);
        // const currentBalanceSettings = JSON.parse(balanceSettingsRaw); 

        const tempElbil = new Elbil( 
            parseFloat(appSettings.battery) || 60,
            parseFloat(appSettings.soc) || 0
        );
        // console.log('balance.js: tempElbil for credits:', tempElbil); // Kan genaktiveres

        let credits = 0;
        const v2gEnabled = toggleV2GOverallBtn.classList.contains('active'); 
        const selectedModeRadio = document.querySelector('input[name="balanceMode"]:checked');
        const selectedMode = selectedModeRadio ? selectedModeRadio.value : 'always'; 
        console.log('balance.js: updateV2GCreditsDisplay - v2gEnabled:', v2gEnabled, 'selectedMode:', selectedMode);

        if (v2gEnabled && creditsDisplaySectionEl) {
            creditsDisplaySectionEl.style.display = 'block'; 
            let durationMinutes = 0;

            if (selectedMode === 'timed') {
                // console.log('balance.js: Credit calculation for TIMED mode.'); // Kan genaktiveres
                if (balanceStartTimeInput.value && balanceEndTimeInput.value) {
                    const [sh, sm] = balanceStartTimeInput.value.split(':').map(Number);
                    const [eh, em] = balanceEndTimeInput.value.split(':').map(Number);
                    let balanceStartMinutes = sh * 60 + sm;
                    let balanceEndMinutes = eh * 60 + em;
                    if (balanceEndMinutes <= balanceStartMinutes) { 
                        balanceEndMinutes += 24 * 60; 
                    }
                    durationMinutes = balanceEndMinutes - balanceStartMinutes;
                    // console.log(`balance.js: Timed - durationMinutes: ${durationMinutes}`); // Kan genaktiveres
                } else {
                    // console.log('balance.js: Timed mode, but start or end time is missing.'); // Kan genaktiveres
                }
            } else if (selectedMode === 'always') {
                // console.log('balance.js: Credit calculation for ALWAYS mode.'); // Kan genaktiveres
                const currentSoC = parseFloat(appSettings.soc) || 0;
                const minSoCForBalancing = parseFloat(balanceMinSoCInput.value) || 0; 
                const maxSoCForBalancing = parseFloat(balanceMaxSoCInput.value) || 100;
                const batteryCapacitykWh = parseFloat(appSettings.battery) || 60;
                const assumedV2GPowerKW = parseFloat(appSettings.speed) || 3.7; 

                let effectiveUpperSoC = Math.min(currentSoC, maxSoCForBalancing);
                const availableSoCPercent = Math.max(0, effectiveUpperSoC - minSoCForBalancing);
                
                // console.log(`balance.js: Always - currentSoC: ${currentSoC}, minSoCSet: ${minSoCForBalancing}, maxSoCSet: ${maxSoCForBalancing}, effectiveUpperSoC: ${effectiveUpperSoC}`);
                // console.log(`balance.js: Always - availableSoCPercent for V2G: ${availableSoCPercent}`);

                const availableKWh = (availableSoCPercent / 100) * batteryCapacitykWh;
                
                if (assumedV2GPowerKW > 0 && availableKWh > 0) {
                    durationMinutes = (availableKWh / assumedV2GPowerKW) * 60;
                } else {
                    durationMinutes = 0;
                }
                // console.log(`balance.js: Always - batteryCap: ${batteryCapacitykWh}kWh, availableKWh: ${availableKWh.toFixed(2)}, assumedV2GPower: ${assumedV2GPowerKW}kW`);
                // console.log(`balance.js: Always - calculated durationMinutes: ${durationMinutes.toFixed(0)}`);
            }

            if (durationMinutes > 0) {
                const ordre = new BalanceOrdre(`V2G_${selectedMode}`, durationMinutes, 0);
                const bs = new BalanceSession(tempElbil); 
                const kred = new Kredit('user-balancepage');
                bs.hentBalanceOrdre([ordre]);
                bs.initierBalancering(); 
                bs.sessionEffekt.forEach(y => {
                    kred.tilfoejYdelse(y);
                });
                credits = kred.visSaldo();
            } else {
                 // console.log(`balance.js: Duration for ${selectedMode} is not positive (${durationMinutes.toFixed(0)} mins), no credits.`); // Kan genaktiveres
                 credits = 0; 
            }
        } else if (creditsDisplaySectionEl) {
            creditsDisplaySectionEl.style.display = 'none'; 
            // console.log('balance.js: V2G not enabled or credits section not found. Hiding credits.'); // Kan genaktiveres
            credits = 0; 
        }

        if (estimatedV2GCreditsEl) {
            estimatedV2GCreditsEl.textContent = credits;
        }
        console.log('balance.js: FINAL V2G Credits display updated. Credits:', credits);
    }

    function updateBatteryDisplayOnBalancePage() {
        // console.log('balance.js: updateBatteryDisplayOnBalancePage CALLED'); 
        const appSettingsRaw = localStorage.getItem(APP_SETTINGS_KEY);
        if (!appSettingsRaw) {
            console.error("balance.js: appSettings not found for battery display.");
            if (currentBatteryBalanceEl) currentBatteryBalanceEl.textContent = "N/A";
            if (v2gMinLineBalanceEl) v2gMinLineBalanceEl.style.display = 'none';
            if (v2gMaxLineBalanceEl) v2gMaxLineBalanceEl.style.display = 'none';
            updateV2GCreditsDisplay(); 
            return;
        }
        const appSettings = JSON.parse(appSettingsRaw);
        const currentSoC = parseFloat(appSettings.soc) || 0;

        if (currentBatteryBalanceEl) {
            currentBatteryBalanceEl.style.width = `${currentSoC}%`;
            currentBatteryBalanceEl.textContent = `${currentSoC.toFixed(0)}%`;
        }
        if (targetBatteryBalanceEl) {
            targetBatteryBalanceEl.style.width = '0%'; 
            targetBatteryBalanceEl.textContent = '';
        }
        const v2gEnabled = toggleV2GOverallBtn.classList.contains('active');
        if (v2gEnabled) {
            const minSoCVal = parseFloat(balanceMinSoCInput.value) || 0;
            const maxSoCVal = parseFloat(balanceMaxSoCInput.value) || 100;
            if (v2gMinLineBalanceEl) {
                v2gMinLineBalanceEl.style.left = `${minSoCVal}%`;
                v2gMinLineBalanceEl.style.display = 'block';
            }
            if (v2gMaxLineBalanceEl) {
                v2gMaxLineBalanceEl.style.left = `${maxSoCVal}%`;
                v2gMaxLineBalanceEl.style.display = 'block';
            }
        } else {
            if (v2gMinLineBalanceEl) v2gMinLineBalanceEl.style.display = 'none';
            if (v2gMaxLineBalanceEl) v2gMaxLineBalanceEl.style.display = 'none';
        }
        // console.log('balance.js: Battery display on balance page updated. Current SoC:', currentSoC); 
        updateV2GCreditsDisplay(); 
    }

    balanceMinSoCInput.addEventListener('input', function() {
        balanceMinSoCValDisplay.textContent = balanceMinSoCInput.value + '%';
        if (parseInt(balanceMinSoCInput.value) > parseInt(balanceMaxSoCInput.value)) {
            balanceMaxSoCInput.value = balanceMinSoCInput.value;
            balanceMaxSoCValDisplay.textContent = balanceMaxSoCInput.value + '%';
        }
        if (v2gMinLineBalanceEl) v2gMinLineBalanceEl.style.left = `${balanceMinSoCInput.value}%`; // Direkte UI opdatering af linje
        updateV2GCreditsDisplay(); 
    });
    balanceMaxSoCInput.addEventListener('input', function() {
        balanceMaxSoCValDisplay.textContent = balanceMaxSoCInput.value + '%';
        if (parseInt(balanceMaxSoCInput.value) < parseInt(balanceMinSoCInput.value)) {
            balanceMinSoCInput.value = balanceMaxSoCInput.value;
            balanceMinSoCValDisplay.textContent = balanceMinSoCInput.value + '%';
        }
        if (v2gMaxLineBalanceEl) v2gMaxLineBalanceEl.style.left = `${balanceMaxSoCInput.value}%`; // Direkte UI opdatering af linje
        updateV2GCreditsDisplay(); 
    });

    balanceStartTimeInput.addEventListener('change', updateV2GCreditsDisplay);
    balanceEndTimeInput.addEventListener('change', updateV2GCreditsDisplay);

    function updateV2GOverallUI(isV2GEnabled) {
        // console.log('balance.js: updateV2GOverallUI CALLED with isV2GEnabled:', isV2GEnabled); 
        const gridModeSection = document.querySelector('.grid-mode-section');
        if (isV2GEnabled) {
            toggleV2GOverallBtn.classList.add('active');
            toggleV2GOverallBtn.textContent = 'Disable V2G Balancing';
            v2gSoCLimitsSettingsDiv.style.display = 'block';
            if(gridModeSection) gridModeSection.style.opacity = '1';
            radioButtons.forEach(rb => rb.disabled = false);
        } else {
            toggleV2GOverallBtn.classList.remove('active');
            toggleV2GOverallBtn.textContent = 'Enable V2G Balancing';
            v2gSoCLimitsSettingsDiv.style.display = 'none';
            timedSettingsDiv.style.display = 'none'; 
            if(gridModeSection) gridModeSection.style.opacity = '0.5';
            radioButtons.forEach(rb => { rb.disabled = true; });
        }
        checkBalanceMode(); 
        updateBatteryDisplayOnBalancePage(); 
        // console.log('balance.js: V2G Overall UI updated.'); 
    }
    
    toggleV2GOverallBtn.addEventListener('click', function() {
        const isCurrentlyEnabled = toggleV2GOverallBtn.classList.contains('active');
        // console.log('balance.js: toggleV2GOverallBtn clicked. Was enabled:', isCurrentlyEnabled, 'New state will be:', !isCurrentlyEnabled); 
        updateV2GOverallUI(!isCurrentlyEnabled);
    });

    function checkBalanceMode() {
        // console.log('balance.js: checkBalanceMode CALLED'); 
        const isV2GEnabled = toggleV2GOverallBtn.classList.contains('active');
        if (!isV2GEnabled) {
            // console.log('balance.js: checkBalanceMode - V2G is OFF, hiding timed settings and ensuring credits are updated.'); 
            timedSettingsDiv.style.display = 'none';
            if(creditsDisplaySectionEl) creditsDisplaySectionEl.style.display = 'none'; 
            updateV2GCreditsDisplay(); 
            return;
        }
        
        let selectedModeRadio = document.querySelector('input[name="balanceMode"]:checked');
        if (!selectedModeRadio && radioButtons.length > 0) {
             radioButtons[0].checked = true;
             selectedModeRadio = radioButtons[0];
             // console.log('balance.js: checkBalanceMode - No radio selected, defaulted to first option.'); 
        }
        const selectedModeValue = selectedModeRadio ? selectedModeRadio.value : 'always';

        if (selectedModeValue === 'timed') {
            timedSettingsDiv.style.display = 'block';
        } else {
            timedSettingsDiv.style.display = 'none';
        }
        updateV2GCreditsDisplay(); 
        // console.log('balance.js: Balance mode checked. Selected:', selectedModeValue, '. Timed settings display:', timedSettingsDiv.style.display); 
    }

    radioButtons.forEach(function (radio) {
        radio.addEventListener('change', checkBalanceMode);
    });

    saveBalanceSettingsBtn.addEventListener('click', function () {
        // console.log('balance.js: saveBalanceSettingsBtn CLICKED'); 
        const selectedModeRadio = document.querySelector('input[name="balanceMode"]:checked');
        const settings = {
            v2gOverallEnabled: toggleV2GOverallBtn.classList.contains('active'),
            gridBalanceMode: selectedModeRadio ? selectedModeRadio.value : 'always', 
            timedModeStartTime: balanceStartTimeInput.value || null,
            timedModeEndTime: balanceEndTimeInput.value || null,
            minSoCForBalancing: balanceMinSoCInput.value,
            maxSoCForBalancing: balanceMaxSoCInput.value,
        };
        localStorage.setItem(BALANCE_SETTINGS_KEY, JSON.stringify(settings));
        alert('Balance settings saved!');
        // console.log('balance.js: Settings saved:', settings); 
        updateV2GCreditsDisplay(); 
    });

    function loadAndApplySettings() {
        console.log('balance.js: loadAndApplySettings CALLED');
        const savedSettingsRaw = localStorage.getItem(BALANCE_SETTINGS_KEY);
        // console.log('balance.js: Raw data from localStorage (balanceSettings):', savedSettingsRaw); 
        if (savedSettingsRaw) {
            try {
                const parsedSettings = JSON.parse(savedSettingsRaw);
                // console.log('balance.js: Parsed balanceSettings:', parsedSettings); 
                
                balanceMinSoCInput.value = parsedSettings.minSoCForBalancing || '20';
                balanceMinSoCValDisplay.textContent = balanceMinSoCInput.value + '%';
                balanceMaxSoCInput.value = parsedSettings.maxSoCForBalancing || '80';
                balanceMaxSoCValDisplay.textContent = balanceMaxSoCInput.value + '%';

                updateV2GOverallUI(parsedSettings.v2gOverallEnabled === true); 
                
                if (parsedSettings.gridBalanceMode) {
                     const targetRadio = document.querySelector(`input[name="balanceMode"][value="${parsedSettings.gridBalanceMode}"]`);
                     if (targetRadio) targetRadio.checked = true;
                     else if (radioButtons.length > 0) radioButtons[0].checked = true;
                } else if (radioButtons.length > 0) {
                    radioButtons[0].checked = true;
                }
                if (parsedSettings.v2gOverallEnabled === true && parsedSettings.gridBalanceMode === 'timed') {
                    balanceStartTimeInput.value = parsedSettings.timedModeStartTime || '';
                    balanceEndTimeInput.value = parsedSettings.timedModeEndTime || '';
                }
                // console.log('balance.js: Balance settings loaded and applied.'); 
            } catch(e) {
                console.error('balance.js: Error parsing saved balance settings:', e);
                updateV2GOverallUI(false);
                if (radioButtons.length > 0) radioButtons[0].checked = true;
                balanceMinSoCInput.value = '20'; balanceMinSoCValDisplay.textContent = '20%';
                balanceMaxSoCInput.value = '80'; balanceMaxSoCValDisplay.textContent = '80%';
            }
        } else {
            // console.log('balance.js: No saved balance settings found. Applying default UI state.'); 
            updateV2GOverallUI(false); 
            if (radioButtons.length > 0) radioButtons[0].checked = true; 
            balanceMinSoCValDisplay.textContent = balanceMinSoCInput.value + '%'; 
            balanceMaxSoCValDisplay.textContent = balanceMaxSoCInput.value + '%';
        }
        checkBalanceMode(); 
        updateBatteryDisplayOnBalancePage();
    }

    loadAndApplySettings();

    window.addEventListener('storage', (event) => {
        if (event.key === APP_SETTINGS_KEY) {
            // console.log('balance.js: appSettings changed by another page. Refreshing relevant displays.'); 
            updateBatteryDisplayOnBalancePage(); 
        }
        if (event.key === BALANCE_SETTINGS_KEY) {
            // console.log('balance.js: balanceSettings changed by another page. Reloading and applying settings.'); 
            loadAndApplySettings(); 
        }
    });
});