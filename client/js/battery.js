// battery.js

document.addEventListener('DOMContentLoaded', () => {
    const chargeSlider = document.getElementById('chargeSlider');
    const batteryLevel = document.getElementById('batteryLevel');
    const estimatedPriceEl = document.getElementById('estimatedPrice');
    const saveTimeBtn = document.getElementById('saveTimeBtn');
    const startNowBtn = document.getElementById('startNowBtn');
    const departureTimeInput = document.getElementById('departureTime');
    
    const maxBatteryKWh = 100; // hypothetical max capacity
    const pricePerKWh = 0.77;  // example price in DKK
  
    // Update battery display whenever the slider changes
    chargeSlider.addEventListener('input', () => {
      const percentage = chargeSlider.value;
      batteryLevel.style.width = percentage + '%';
      batteryLevel.textContent = percentage + '%';
      
      // Calculate estimated price
      const kWhNeeded = (percentage / 100) * maxBatteryKWh;
      const estimatedPrice = kWhNeeded * pricePerKWh;
      estimatedPriceEl.textContent = 
        `Est. Price: ${estimatedPrice.toFixed(2)} DKK`;
    });
    
    // Handle "Save Time"
    saveTimeBtn.addEventListener('click', () => {
      const departureTime = departureTimeInput.value;
      if (departureTime) {
        localStorage.setItem('departureTime', departureTime);
        alert(`Departure time saved: ${departureTime}`);
      } else {
        alert('Please select a valid time.');
      }
    });
  
    // Handle "Start Charging" action
    startNowBtn.addEventListener('click', () => {
      alert('Charging started now!');
    });
  });
  