document.addEventListener('DOMContentLoaded', function() {
    const flashMessages = document.querySelectorAll('.alert');
    flashMessages.forEach(flashMessage => {
        if (flashMessage) {
            setTimeout(() => {
                flashMessage.style.display = 'none';
            }, 5000); // Hide the flash message after 5 seconds
        }
    });
});