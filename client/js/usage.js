// usage.js

document.addEventListener('DOMContentLoaded', () => {
    // Example values for demonstration
    const exampleTotalCharged = 150;    // Total kWh charged this month
    const exampleTotalFedBack = 30;     // Total kWh fed back to the grid this month
    const pricePerKWh = 0.77;           // Fixed example rate (DKK per kWh)
    const exampleTotalCost = exampleTotalCharged * pricePerKWh;
  
    // Populate the HTML elements with the example values
    document.getElementById('totalCharged').textContent = exampleTotalCharged + ' kWh';
    document.getElementById('totalFedBack').textContent = exampleTotalFedBack + ' kWh';
    document.getElementById('totalCost').textContent = exampleTotalCost.toFixed(2) + ' DKK';
  });
  