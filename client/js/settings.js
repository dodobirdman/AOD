//settings.js
document.addEventListener('DOMContentLoaded', () => {
    console.log('settings.js: DOMContentLoaded event fired.');
    const KEY = 'appSettings'; 

    // Hender elementer fra DOM
    const els = {
      notifyT:  document.getElementById('notifyTarget'),
      notifyV:  document.getElementById('notifyV2G'),
      battery:  document.getElementById('batterySize'),
      soc:      document.getElementById('currentSoc'),
      speed:    document.getElementById('chargeSpeed'),
      region:   document.getElementById('regionToggle'),
      save:     document.getElementById('saveSettingsBtn'),
      clear:    document.getElementById('clearDataBtn'),
      exportBtn:document.getElementById('exportDataBtn'),
      pwdForm:  document.getElementById('changePasswordForm'),
      newPwd:   document.getElementById('newPassword'),
      confirm:  document.getElementById('confirmPassword'),
    };
    console.log('settings.js: DOM elements identified:', els);
  
    // Henter indstillinger fra localStorage og anvender dem på formularfelterne
    function loadSettings() {
      console.log('settings.js: Attempting to load settings from localStorage with KEY:', KEY);
      const savedSettingsRaw = localStorage.getItem(KEY);
      console.log('settings.js: Raw data from localStorage:', savedSettingsRaw);

      if (savedSettingsRaw) {
        try {
          const saved = JSON.parse(savedSettingsRaw);
          console.log('settings.js: Parsed settings:', saved);
          
          // if (els.theme && saved.theme !== undefined) els.theme.value = saved.theme; // FJERNET
          if (els.notifyT && saved.notifyT !== undefined) els.notifyT.checked = saved.notifyT;
          if (els.notifyV && saved.notifyV !== undefined) els.notifyV.checked = saved.notifyV;
          if (els.battery && saved.battery !== undefined) els.battery.value = saved.battery;
          if (els.soc && saved.soc !== undefined) els.soc.value = saved.soc;
          if (els.speed && saved.speed !== undefined) els.speed.value = saved.speed;
          if (els.region && saved.region !== undefined) els.region.value = saved.region;
          
          console.log('settings.js: Settings loaded and applied to form fields.');
        } catch (e) {
          console.error('settings.js: Error parsing saved settings from localStorage:', e);
        }
      } else {
        console.log('settings.js: No saved settings found in localStorage.');
      }
    }

    function saveSettings() {
      console.log('settings.js: saveSettings function called.');
      const settingsToSave = {
        
        notifyT:  els.notifyT ? els.notifyT.checked : false,
        notifyV:  els.notifyV ? els.notifyV.checked : false,
        battery:  els.battery ? els.battery.value : '', 
        soc:      els.soc ? els.soc.value : '',       
        speed:    els.speed ? els.speed.value : '',     
        region:   els.region ? els.region.value : 'DK2', 
      };
      
      // Fjerner temaindstillingen, da den ikke længere er relevant
      if (settingsToSave.hasOwnProperty('theme')) {
          delete settingsToSave.theme;
      }
      console.log('settings.js: Settings to save:', settingsToSave);

      // Gemmer indstillingerne i localStorage
      try {
        localStorage.setItem(KEY, JSON.stringify(settingsToSave));
        console.log('settings.js: Settings successfully saved to localStorage with KEY:', KEY);
        window.location.href = 'battery.html';
      } catch (e) {
        console.error('settings.js: Error saving settings to localStorage:', e);
        alert('Fejl: Kunne ikke gemme indstillinger. LocalStorage er muligvis fuld eller utilgængelig.');
      }
    }

    if (els.save) {
      els.save.addEventListener('click', saveSettings);
      console.log('settings.js: Event listener attached to save button.');
    } else {
      console.warn('settings.js: Save button (saveSettingsBtn) not found in HTML.');
    }
  
    if (els.clear) { 
        els.clear.addEventListener('click', () => {
            if (confirm('Er du sikker på, at du vil slette ALLE lokale data? Dette kan ikke fortrydes.')) {
            localStorage.clear();
            alert('Alle lokale data er blevet slettet. Siden genindlæses nu.');
            location.reload();
            }
        });
        console.log('settings.js: Event listener attached to clear button.');
    } else {
        console.log('settings.js: Clear button (clearDataBtn) not found in HTML. Listener not attached.');
    }
  
    // Irrelevant kode brugt til at eksportere data
    if (els.exportBtn) { 
        els.exportBtn.addEventListener('click', () => {
            const dataToExport = {};
            for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k) { 
                try {
                dataToExport[k] = JSON.parse(localStorage.getItem(k));
                } catch (e) {
                dataToExport[k] = localStorage.getItem(k); 
                }
            }
            }
            const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'vehicle-charger-prototype-data.json';
            document.body.appendChild(a); 
            a.click();
            document.body.removeChild(a); 
            URL.revokeObjectURL(url);
            alert('Data eksporteret som vehicle-charger-prototype-data.json');
        });
        console.log('settings.js: Event listener attached to export button.');
    } else {
        console.log('settings.js: Export button (exportDataBtn) not found in HTML. Listener not attached.');
    }
    
    if (els.pwdForm) { 
        els.pwdForm.addEventListener('submit', e => {
            e.preventDefault();
            if (!els.newPwd || !els.confirm) return; 

            const newPasswordValue = els.newPwd.value;
            const confirmPasswordValue = els.confirm.value;

            if (!newPasswordValue || !confirmPasswordValue) {
            alert('Udfyld venligst begge adgangskodefelter.');
            return;
            }
            if (newPasswordValue !== confirmPasswordValue) {
            alert('Adgangskoderne stemmer ikke overens.');
            return;
            }
            alert('Adgangskode ændret succesfuldt (Prototype - gemmes ikke sikkert).');
            els.pwdForm.reset();
        });
        console.log('settings.js: Event listener attached to password form.');
    } else {
      console.log('settings.js: Password form (changePasswordForm) not found in HTML. Listener not attached.');
    }
    loadSettings();
});