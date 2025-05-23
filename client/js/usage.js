document.addEventListener('DOMContentLoaded', () => {
  // Hent gemte app-indstillinger fra localStorage. Hvis ingen findes, bruges et tomt objekt.
  const settings = JSON.parse(localStorage.getItem('appSettings')||'{}');
  // Udtræk standardpris pr. kWh fra indstillingerne, eller brug en fallback-værdi (2.90 DKK).
  const pricePerKWh = parseFloat(settings.defaultCost) || 2.90; // Antager at defaultCost stadig kan være i settings
  const currency    = settings.currency || 'DKK';

  // Koden herunder er til at vise brugerens energiforbrug og omkostninger.
  // Da det er en prototype er dataene hardkodet, med mulighed for at de senere kan hentes fra en server.
  
  const totalCharged = 220;
  const totalFedBack = 45;
  const totalCost    = (totalCharged - totalFedBack) * pricePerKWh;

  document.getElementById('totalCharged').textContent = `${totalCharged} kWh`;
  document.getElementById('totalFedBack').textContent = `${totalFedBack} kWh`;
  document.getElementById('totalCost').textContent    = `${totalCost.toFixed(2)} ${currency}`;

  // ── Recent sessions ──────────────────────────
  const sessions = [
    
    { dateString:'2025-04-12', charged:35, fedBack:5 },
    { dateString:'2025-04-11', charged:30, fedBack:0 },
    { dateString:'2025-04-10', charged:40, fedBack:10 },
    { dateString:'2025-04-08', charged:25, fedBack:0 },
    { dateString:'2025-04-05', charged:20, fedBack:2 },
    { dateString:'2025-04-02', charged:35, fedBack:8 },
    { dateString:'2025-04-01', charged:28, fedBack:0 }
  ];

  const listEl = document.getElementById('sessionList');
  sessions.forEach(s => {
    const netCost = (s.charged - s.fedBack) * pricePerKWh;
    const dateObj = new Date(s.dateString);
    const formattedDate = dateObj.toLocaleDateString('da-DK', {
      day: 'numeric',
      month: 'short', 
      year: 'numeric'
    });

    const card = document.createElement('div');
    card.className = 'session-card';
    card.innerHTML = `
      <h3>${formattedDate}</h3>
      <p>Opladt: ${s.charged} kWh</p>
      <p>Leveret tilbage: ${s.fedBack} kWh</p>
      <p>Pris for session: ${netCost.toFixed(2)} ${currency}</p>
    `;
    listEl.appendChild(card);
  });
});
