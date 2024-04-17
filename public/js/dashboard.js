document.addEventListener("DOMContentLoaded", function() {
  setInterval(refreshDashboardData, 30000); // Refresh data every 30 seconds

  function refreshDashboardData() {
    fetch('/dashboard/data')
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        if(data.user && data.creditsUsed) {
          // Update DOM elements with new data
          document.getElementById('apiKey').innerText = data.user.apiKey;
          document.getElementById('creditsUsedLastDay').innerText = data.creditsUsed.lastDay;
          document.getElementById('creditsUsedLastWeek').innerText = data.creditsUsed.lastWeek;
          document.getElementById('creditsUsedLastMonth').innerText = data.creditsUsed.lastMonth;
        }
      })
      .catch(error => {
        console.error('Error refreshing dashboard data:', error.message, error.stack);
      });
  }
});