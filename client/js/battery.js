// battery.js

document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements for interaction
    const targetSlider = document.getElementById('targetSlider');
    const targetValueDisplay = document.getElementById('targetValue');
    const targetBattery = document.getElementById('targetBattery');
    
    const departureTimeInput = document.getElementById('departureTime');
    const enableBalancingCheckbox = document.getElementById('enableBalancing');
    const expectedStartTimeEl = document.getElementById('expectedStartTime');
    
    const saveChangesBtn = document.getElementById('saveChangesBtn');
    const startNowBtn = document.getElementById('startNowBtn');
    
    // Current battery status fixed at 43%
    const currentBatteryStatus = 43;
    
    // Function to update the target display and recalc expected start time
    function updateTargetDisplay() {
      const target = parseInt(targetSlider.value);
      targetValueDisplay.textContent = target + '%';
      
      // Compute only the additional charge beyond the current level
      let additionalCharge = target - currentBatteryStatus;
      if (additionalCharge < 0) additionalCharge = 0;
      
      // Set the target battery overlay:
      // - Its left position equals the current battery percentage.
      // - Its width equals the additional charge in percent.
      targetBattery.style.left = currentBatteryStatus + '%';
      targetBattery.style.width = additionalCharge + '%';
      
      // Optionally, set the text to show the target if there's an overlay:
      targetBattery.textContent = additionalCharge > 0 ? target + '%' : '';
      
      recalcStartTime();
    }
    
    // Recalculate expected charging start time based on:
    // - User-specified departure time (HH:MM)
    // - Charging time: (target - currentBatteryStatus) * 5 minutes (if target > current)
    // - Extra offset of 15 minutes if grid balancing is enabled
    function recalcStartTime() {
      const departureTimeStr = departureTimeInput.value; // "HH:MM"
      if (!departureTimeStr) {
        expectedStartTimeEl.textContent = '--:--';
        return;
      }
      
      const [depHour, depMinute] = departureTimeStr.split(':').map(Number);
      const departureMinutes = depHour * 60 + depMinute;
      
      const target = parseInt(targetSlider.value);
      let requiredMinutes = 0;
      if (target > currentBatteryStatus) {
        requiredMinutes = (target - currentBatteryStatus) * 5;
      }
      
      const extraOffset = enableBalancingCheckbox.checked ? 15 : 0;
      let startTimeMinutes = departureMinutes - requiredMinutes - extraOffset;
      if (startTimeMinutes < 0) startTimeMinutes = 0;
      
      const startHour = Math.floor(startTimeMinutes / 60);
      const startMinute = startTimeMinutes % 60;
      const formattedTime = 
        (startHour < 10 ? '0' + startHour : startHour) + ':' +
        (startMinute < 10 ? '0' + startMinute : startMinute);
      
      expectedStartTimeEl.textContent = formattedTime;
    }
    
    // Event listeners for real-time interactivity
    targetSlider.addEventListener('input', updateTargetDisplay);
    departureTimeInput.addEventListener('change', recalcStartTime);
    enableBalancingCheckbox.addEventListener('change', recalcStartTime);
    
    // Initialize display values on page load
    updateTargetDisplay();
    recalcStartTime();
    
    // Save settings in localStorage and notify the user
    saveChangesBtn.addEventListener('click', () => {
      const settings = {
        targetCharge: targetSlider.value,
        departureTime: departureTimeInput.value,
        balancingEnabled: enableBalancingCheckbox.checked,
        expectedStartTime: expectedStartTimeEl.textContent
      };
      localStorage.setItem('batterySettings', JSON.stringify(settings));
      alert('Changes saved!');
    });
    
    // Override schedule to start charging immediately
    startNowBtn.addEventListener('click', () => {
      alert('Charging started now!');
    });
  });
  