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
    const username = prompt("Enter new username:");
    const password = prompt("Enter new password:");
  
    if (username && password) {
      localStorage.setItem('user', JSON.stringify({ username, password }));
      alert("Account created! Please log in now.");
    }
  });
  