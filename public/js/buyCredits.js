document.getElementById('purchase-credits-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const credits = document.getElementById('credits').value;
  console.log(`Attempting to purchase ${credits} credits.`);
  try {
    const response = await fetch('/purchase-credits', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ credits })
    });
    const data = await response.json();
    if (data.url) {
      console.log('Redirecting to Stripe checkout page.');
      window.location.href = data.url;
    } else {
      console.error('Failed to redirect to Stripe checkout page.');
    }
  } catch (error) {
    console.error('Error purchasing credits:', error.message, error.stack);
  }
});