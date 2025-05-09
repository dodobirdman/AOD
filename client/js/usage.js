document.addEventListener('DOMContentLoaded', () => {
  // ── Load settings ───────────────────────────
  const settings = JSON.parse(localStorage.getItem('appSettings')||'{}');
  document.body.classList.toggle('dark', settings.theme==='dark');
  const pricePerKWh = parseFloat(settings.defaultCost) || 2.90;
  const currency    = settings.currency || 'DKK';

  // ── Monthly summary ─────────────────────────
  const totalCharged = 220;
  const totalFedBack = 45;
  const totalCost    = (totalCharged - totalFedBack) * pricePerKWh;

  document.getElementById('totalCharged').textContent = `${totalCharged} kWh`;
  document.getElementById('totalFedBack').textContent = `${totalFedBack} kWh`;
  document.getElementById('totalCost').textContent    = `${totalCost.toFixed(2)} ${currency}`;

  // ── Recent sessions ──────────────────────────
  const sessions = [
    { date:'Apr 12, 2025', charged:35, fedBack:5 },
    { date:'Apr 11, 2025', charged:30, fedBack:0 },
    { date:'Apr 10, 2025', charged:40, fedBack:10 },
    { date:'Apr 08, 2025', charged:25, fedBack:0 },
    { date:'Apr 05, 2025', charged:20, fedBack:2 },
    { date:'Apr 02, 2025', charged:35, fedBack:8 },
    { date:'Apr 01, 2025', charged:28, fedBack:0 }
  ];

  const listEl = document.getElementById('sessionList');
  sessions.forEach(s => {
    const netCost = (s.charged - s.fedBack) * pricePerKWh;
    const card = document.createElement('div');
    card.className = 'session-card';
    card.innerHTML = `
      <h3>${s.date}</h3>
      <p>Charged: ${s.charged} kWh</p>
      <p>Fed Back: ${s.fedBack} kWh</p>
      <p>Session Cost: ${netCost.toFixed(2)} ${currency}</p>
    `;
    listEl.appendChild(card);
  });
});
