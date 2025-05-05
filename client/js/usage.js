// usage.js

document.addEventListener('DOMContentLoaded', () => {
  // Monthly summary values
  const pricePerKWh = 2.45; // DKK
  const totalCharged = 220;  // example
  const totalFedBack = 45;   // example
  const totalCost = (totalCharged - totalFedBack) * pricePerKWh;

  document.getElementById('totalCharged').textContent = `${totalCharged} kWh`;
  document.getElementById('totalFedBack').textContent = `${totalFedBack} kWh`;
  document.getElementById('totalCost').textContent = `${totalCost.toFixed(3)} DKK`;

  // Example sessions
  const sessions = [
    { date: 'Apr 12, 2025', charged: 35, fedBack: 5 },
    { date: 'Apr 11, 2025', charged: 30, fedBack: 0 },
    { date: 'Apr 10, 2025', charged: 40, fedBack: 10 },
    { date: 'Apr 08, 2025', charged: 25, fedBack: 0 },
    { date: 'Apr 05, 2025', charged: 20, fedBack: 2 },
    { date: 'Apr 02, 2025', charged: 35, fedBack: 8 },
    { date: 'Apr 01, 2025', charged: 28, fedBack: 0 }
  ];

  const listEl = document.getElementById('sessionList');
  sessions.forEach(s => {
    const net = (s.charged - s.fedBack) * pricePerKWh;
    const card = document.createElement('div');
    card.className = 'session-card';
    card.innerHTML = `
      <h3>${s.date}</h3>
      <p>Charged: ${s.charged} kWh</p>
      <p>Fed Back: ${s.fedBack} kWh</p>
      <p>Session Cost: ${net.toFixed(2)} DKK</p>
    `;
    listEl.appendChild(card);
  });
});