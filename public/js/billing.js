document.addEventListener('DOMContentLoaded', function() {
    fetch('/billing/invoices')
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        const invoicesList = document.getElementById('transactions-list');
        if (!invoicesList) {
            console.error('Invoices list element not found');
            return;
        }
        if (data && data.length > 0) {
            data.forEach(invoice => {
                const listItem = document.createElement('li');
                listItem.innerHTML = `Date: ${new Date(invoice.created * 1000).toLocaleDateString()} - Amount: ${invoice.amount / 100} USD <a href="${invoice.receipt_url}" target="_blank">View Invoice</a>`;
                invoicesList.appendChild(listItem);
            });
        } else {
            invoicesList.innerHTML = '<li>No invoices found.</li>';
        }
    })
    .catch(error => {
        console.error('Error fetching invoices:', error);
        const invoicesList = document.getElementById('transactions-list');
        if (!invoicesList) {
            console.error('Invoices list element not found');
            return;
        }
        invoicesList.innerHTML = '<li>Error fetching invoices. Please try again later.</li>';
    });
});