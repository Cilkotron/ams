document.addEventListener("DOMContentLoaded", function() {
  const decreaseCreditsForm = document.getElementById('decreaseCreditsForm');
  const decreaseCreditsInput = document.getElementById('decreaseCreditsInput');
  const creditsUsedLastDay = document.getElementById('creditsUsedLastDay');
  const creditsUsedLastWeek = document.getElementById('creditsUsedLastWeek');
  const creditsUsedLastMonth = document.getElementById('creditsUsedLastMonth');
  const currentCreditsValue = document.getElementById('currentCreditsValue');

  // Establish WebSocket connection
  const socket = io(); 

  socket.on('connect', () => {
    console.log('WebSocket connection established');
  });

  // Listen for credit updates from the server
  socket.on('creditUpdate', (data) => {
    console.log('Received credit update via WebSocket', data);
    if(data && data.credits !== undefined) {
      currentCreditsValue.textContent = data.credits;
      updateDashboard(); // Refresh dashboard data to reflect the new credits balance
    }
  });

  decreaseCreditsForm.addEventListener('submit', function(event) {
    event.preventDefault();
    const amount = decreaseCreditsInput.value;
    fetch('/decrease-credits', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount: amount }),
      credentials: 'include'
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      if(data.success) {
        // Update the current credits value directly from the response
        currentCreditsValue.textContent = data.newCredits;
        console.log('Credits successfully decreased. New balance: ' + data.newCredits);
        // Trigger dashboard update to reflect the new credits balance
        updateDashboard();
      } else {
        console.error('Failed to decrease credits:', data.message);
      }
    })
    .catch(error => {
      console.error('Error decreasing credits:', error.message, error.stack);
    });
  });

  function updateDashboard() {
    fetch('/dashboard/data', {
      credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
      console.log(data)
      if(data && data.creditsUsed) {
        creditsUsedLastDay.textContent = data.creditsUsed.lastDay;
        creditsUsedLastWeek.textContent = data.creditsUsed.lastWeek;
        creditsUsedLastMonth.textContent = data.creditsUsed.lastMonth;
        currentCreditsValue.textContent = data.user.credits;
      }
    })
    .catch(error => {
      console.error('Error updating dashboard:', error.message, error.stack);
    });
  }

  // Call updateDashboard to ensure the dashboard is updated on page load
  updateDashboard();

  // Set an interval to periodically update the dashboard data
  setInterval(updateDashboard, 10000); // Update every 10 seconds
});