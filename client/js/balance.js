// balance.js

document.addEventListener('DOMContentLoaded', function () {
    const balanceSlider = document.getElementById('balanceSlider');
    const balanceValueDisplay = document.getElementById('balanceValue');
    const radioButtons = document.getElementsByName('balanceMode');
    const timedSettingsDiv = document.getElementById('timedSettings');
    const saveBalanceSettingsBtn = document.getElementById('saveBalanceSettingsBtn');
    const balanceStartTime = document.getElementById('balanceStartTime');
    const balanceEndTime = document.getElementById('balanceEndTime');
  
    // Update the slider value display when changed
    balanceSlider.addEventListener('input', function () {
      balanceValueDisplay.textContent = balanceSlider.value + '%';
    });
  
    // Function to check selected radio button and show/hide timed settings
    function checkBalanceMode() {
      const selectedMode = document.querySelector('input[name="balanceMode"]:checked').value;
      if (selectedMode === 'timed') {
        timedSettingsDiv.style.display = 'block';
      } else {
        timedSettingsDiv.style.display = 'none';
      }
    }
  
    // Listen for changes in the radio buttons
    radioButtons.forEach(function (radio) {
      radio.addEventListener('change', checkBalanceMode);
    });
  
    // Save the current settings when the button is clicked
    saveBalanceSettingsBtn.addEventListener('click', function () {
      const settings = {
        batteryOffer: balanceSlider.value,
        mode: document.querySelector('input[name="balanceMode"]:checked').value,
        startTime: balanceStartTime.value || null,
        endTime: balanceEndTime.value || null,
      };
      localStorage.setItem('balanceSettings', JSON.stringify(settings));
      alert('Balance settings saved!');
    });
  
    // Load any previously saved settings on page load
    const savedSettings = localStorage.getItem('balanceSettings');
    if (savedSettings) {
      const parsedSettings = JSON.parse(savedSettings);
      balanceSlider.value = parsedSettings.batteryOffer;
      balanceValueDisplay.textContent = parsedSettings.batteryOffer + '%';
  
      // Set the radio button state based on saved settings
      document.querySelector(`input[name="balanceMode"][value="${parsedSettings.mode}"]`).checked = true;
      if (parsedSettings.mode === 'timed') {
        timedSettingsDiv.style.display = 'block';
        balanceStartTime.value = parsedSettings.startTime;
        balanceEndTime.value = parsedSettings.endTime;
      } else {
        timedSettingsDiv.style.display = 'none';
      }
    }
  });
  