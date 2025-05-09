document.addEventListener('DOMContentLoaded', () => {
    const key = 'appSettings';
    const themeSelect   = document.getElementById('themeSelect');
    const unitSelect    = document.getElementById('unitSelect');
    const currencySelect= document.getElementById('currencySelect');
    const notifyTarget  = document.getElementById('notifyTarget');
    const notifyV2G     = document.getElementById('notifyV2G');
    const costInput     = document.getElementById('defaultCost');
    const saveBtn       = document.getElementById('saveSettingsBtn');
    const clearBtn      = document.getElementById('clearDataBtn');
    const exportBtn     = document.getElementById('exportDataBtn');
    const pwdForm       = document.getElementById('changePasswordForm');
    const newPwdInput   = document.getElementById('newPassword');
    const confirmInput  = document.getElementById('confirmPassword');
  
    // Load saved settings
    const saved = JSON.parse(localStorage.getItem(key) || '{}');
    if (saved.theme)    themeSelect.value    = saved.theme;
    if (saved.unit)     unitSelect.value     = saved.unit;
    if (saved.currency) currencySelect.value = saved.currency;
    if (typeof saved.notifyTarget === 'boolean') notifyTarget.checked = saved.notifyTarget;
    if (typeof saved.notifyV2G    === 'boolean') notifyV2G.checked    = saved.notifyV2G;
    if (saved.defaultCost) costInput.value = saved.defaultCost;
  
    // Save settings
    saveBtn.addEventListener('click', () => {
      const out = {
        theme: themeSelect.value,
        unit:  unitSelect.value,
        currency: currencySelect.value,
        notifyTarget: notifyTarget.checked,
        notifyV2G:    notifyV2G.checked,
        defaultCost:  costInput.value
      };
      localStorage.setItem(key, JSON.stringify(out));
      alert('Settings saved!');
    });
  
    // Clear all localStorage
    clearBtn.addEventListener('click', () => {
      if (confirm('Clear ALL local data? This cannot be undone.')) {
        localStorage.clear();
        alert('Local data cleared.');
        window.location.reload();
      }
    });
  
    // Export localStorage to JSON file
    exportBtn.addEventListener('click', () => {
      const data = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        try { data[k] = JSON.parse(localStorage.getItem(k)); }
        catch { data[k] = localStorage.getItem(k); }
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'charger-app-data.json';
      a.click();
      URL.revokeObjectURL(url);
    });
  
    // Change password (PoC only)
    pwdForm.addEventListener('submit', e => {
      e.preventDefault();
      const n = newPwdInput.value, c = confirmInput.value;
      if (!n || !c) return alert('Fill in both fields.');
      if (n !== c)   return alert('Passwords do not match.');
      alert('Password changed (PoC only).');
      pwdForm.reset();
    });
  });
  