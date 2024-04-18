document.addEventListener("DOMContentLoaded", function() {
  setInterval(refreshDashboardData, 30000); // Refresh data every 30 seconds

  function refreshDashboardData() {
    fetch('/dashboard/data', {
      credentials: 'include' // Ensure cookies are sent with the request for session management
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        if(data.user && data.creditsUsed) {
          // Update DOM elements with new data
          if(document.getElementById('apiKey')) {
            document.getElementById('apiKey').innerText = data.user.apiKey;
          } else {
            console.error('API Key element not found');
          }
          document.getElementById('creditsUsedLastDay').innerText = data.creditsUsed.lastDay;
          document.getElementById('creditsUsedLastWeek').innerText = data.creditsUsed.lastWeek;
          document.getElementById('creditsUsedLastMonth').innerText = data.creditsUsed.lastMonth;
          document.getElementById('currentCreditsValue').innerText = data.user.credits; // Update current credits
        }
      })
      .catch(error => {
        console.error('Error refreshing dashboard data:', error.message, error.stack);
      });
  }

  const decreaseCreditsForm = document.getElementById('decreaseCreditsForm');
  const decreaseCreditsInput = document.getElementById('decreaseCreditsInput');

  decreaseCreditsForm.addEventListener('submit', function(event) {
    event.preventDefault();
    const amount = decreaseCreditsInput.value;
    fetch('/decrease-credits', { // Updated endpoint to match backend expectations
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount: amount }), // Send the amount to decrease as specified by the user
      credentials: 'include' // Ensure cookies are sent with the request for session management
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      if(data.success) {
        document.getElementById('currentCreditsValue').textContent = data.newCredits; // Update displayed credits
        refreshDashboardData(); // Refresh dashboard data to reflect the updated credits immediately
      } else {
        console.error('Failed to decrease credits:', data.message);
      }
    })
    .catch(error => {
      console.error('Error decreasing credits:', error.message, error.stack);
    });
  });
});