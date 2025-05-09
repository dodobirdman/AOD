document.addEventListener('DOMContentLoaded', () => {
    const KEY = 'appSettings';
    const els = {
      theme:    document.getElementById('themeSelect'),
      notifyT:  document.getElementById('notifyTarget'),
      notifyV:  document.getElementById('notifyV2G'),
      battery:  document.getElementById('batterySize'),
      soc:      document.getElementById('currentSoc'),
      speed:    document.getElementById('chargeSpeed'),
      region:   document.getElementById('regionToggle'),
      save:     document.getElementById('saveSettingsBtn'),
      clear:    document.getElementById('clearDataBtn'),
      export:   document.getElementById('exportDataBtn'),
      pwdForm:  document.getElementById('changePasswordForm'),
      newPwd:   document.getElementById('newPassword'),
      confirm:  document.getElementById('confirmPassword'),
    };
  
    // Load
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    if (saved.theme)   els.theme.value   = saved.theme;
    if (saved.notifyT) els.notifyT.checked = saved.notifyT;
    if (saved.notifyV) els.notifyV.checked = saved.notifyV;
    if (saved.battery) els.battery.value = saved.battery;
    if (saved.soc)     els.soc.value     = saved.soc;
    if (saved.speed)   els.speed.value   = saved.speed;
    if (saved.region)  els.region.value  = saved.region;
    applyTheme(saved.theme);
  
    // Save
    els.save.addEventListener('click', () => {
      const out = {
        theme:    els.theme.value,
        notifyT:  els.notifyT.checked,
        notifyV:  els.notifyV.checked,
        battery:  els.battery.value,
        soc:      els.soc.value,
        speed:    els.speed.value,
        region:   els.region.value,
      };
      localStorage.setItem(KEY, JSON.stringify(out));
      applyTheme(out.theme);
      alert('Settings saved!');
    });
  
    // Clear all
    els.clear.addEventListener('click', () => {
      if (confirm('Clear ALL local data?')) {
        localStorage.clear();
        location.reload();
      }
    });
  
    // Export
    els.export.addEventListener('click', () => {
      const data = {};
      for (let i=0; i<localStorage.length; i++) {
        const k = localStorage.key(i);
        data[k] = JSON.parse(localStorage.getItem(k));
      }
      const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = 'app-data.json'; a.click();
      URL.revokeObjectURL(url);
    });
  
    // PoC Change Password
    els.pwdForm.addEventListener('submit', e => {
      e.preventDefault();
      if (!els.newPwd.value || !els.confirm.value)
        return alert('Fill both fields.');
      if (els.newPwd.value !== els.confirm.value)
        return alert('Passwords do not match.');
      alert('Password changed (PoC)');
      els.pwdForm.reset();
    });
  
    function applyTheme(t) {
      document.body.classList.toggle('dark', t==='dark');
    }
  });
  