// login.js

document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
  
    // Store in localStorage (fake "account" data)
    localStorage.setItem('user', JSON.stringify({ username, password }));
  
    // After login, go to the Battery (Home) page
    window.location.href = 'battery.html';
  });
  
  document.getElementById('setupBtn').addEventListener('click', function() {
    const username = prompt("Indtast nyt brugernavn:");
    const password = prompt("Indtast ny adgangskode:");
  
    if (username && password) {
      localStorage.setItem('user', JSON.stringify({ username, password }));
      alert("Konto oprettet! Log venligst ind nu.");
    }
  });
  