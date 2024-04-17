document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.querySelector('#loginForm'); // Use a more specific selector to target the login form
    loginForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const username = document.querySelector('#loginForm input[name="username"]').value;
        const password = document.querySelector('#loginForm input[name="password"]').value;
        const loginData = { username, password };

        fetch('/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(loginData),
            credentials: 'include' // Ensure credentials are included with the request for cookie handling
        })
        .then(response => {
            if (!response.ok) {
                console.error('Login request failed with status:', response.status);
                throw new Error('Login failed');
            }
            return response.json();
        })
        .then(data => {
            console.log('Login successful', data);
            window.location.href = '/'; // Redirect to the homepage or dashboard upon successful login
        })
        .catch(error => {
            console.error('Error during login:', error.message, error.stack);
            alert('Login failed. Please check your credentials and try again.'); // Display a simple error message to the user
        });
    });
});