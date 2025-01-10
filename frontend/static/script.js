// Constants for API endpoints
const API_ENDPOINTS = {
    CURRENT_PRICES: '/current_prices',
    REBALANCE: '/rebalance'
};

// Utility functions
const formatCurrency = (value) => `$${parseFloat(value).toFixed(2)}`;
const getElement = (id) => document.getElementById(id);
const parseFormValue = (id) => parseFloat(getElement(id).value);

// UI State Management
const UIElements = {
    loading: getElement('loading'),
    results: getElement('results'),
    progressBar: getElement('progress-bar'),
    form: getElement('rebalance-form'),
    btcPrice: getElement('current-btc-price'),
    ethPrice: getElement('current-eth-price')
};

// Error handling wrapper for fetch calls
async function fetchWithErrorHandling(url, options = {}) {
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Fetch error:', error);
        showError('An error occurred while processing your request. Please try again.');
        throw error;
    }
}

// Show error message in the results div
function showError(message) {
    UIElements.results.innerHTML = `
        <div style="color: #dc2626; padding: 1rem; background: #fee2e2; border-radius: 0.5rem; margin-top: 1rem;">
            <h3 style="color: #dc2626; margin: 0 0 0.5rem 0;">Error</h3>
            <p style="margin: 0;">${message}</p>
        </div>
    `;
}

// Update the progress bar with smooth animation
function updateProgressBar(progress) {
    UIElements.progressBar.style.width = `${progress}%`;
    UIElements.progressBar.style.transition = 'width 0.3s ease-in-out';
}

// Simulate progress for the progress bar
async function simulateProgress() {
    for (let i = 0; i <= 90; i += 10) {
        updateProgressBar(i);
        await new Promise(resolve => setTimeout(resolve, 200));
    }
}

// Display the rebalancing results
function displayResults(adjustments, predicted_prices) {
    const [btcAdjustment, ethAdjustment] = adjustments;
    const [btcPredicted, ethPredicted] = predicted_prices;

    UIElements.results.innerHTML = `
        <div style="background: #f8fafc; padding: 1.5rem; border-radius: 0.75rem;">
            <h3 style="margin: 0 0 1rem 0; color: #1e293b;">Rebalancing Suggestions</h3>
            <div style="margin-bottom: 1.5rem;">
                <p style="margin: 0.5rem 0; color: ${btcAdjustment >= 0 ? '#059669' : '#dc2626'};">
                    Bitcoin: ${btcAdjustment >= 0 ? 'Buy' : 'Sell'} ${formatCurrency(Math.abs(btcAdjustment))}
                </p>
                <p style="margin: 0.5rem 0; color: ${ethAdjustment >= 0 ? '#059669' : '#dc2626'};">
                    Ethereum: ${ethAdjustment >= 0 ? 'Buy' : 'Sell'} ${formatCurrency(Math.abs(ethAdjustment))}
                </p>
            </div>
            <h3 style="margin: 1rem 0; color: #1e293b;">Predicted Prices</h3>
            <div>
                <p style="margin: 0.5rem 0;">BTC: ${formatCurrency(btcPredicted)}</p>
                <p style="margin: 0.5rem 0;">ETH: ${formatCurrency(ethPredicted)}</p>
            </div>
        </div>
    `;
}

// Handle form submission
async function handleFormSubmit(event) {
    event.preventDefault();

    // Reset UI state
    UIElements.loading.style.display = 'block';
    UIElements.results.innerHTML = '';
    updateProgressBar(0);

    try {
        // Start progress simulation
        simulateProgress();

        // Get form values
        const btcAllocation = parseFormValue('btc-allocation');
        const ethAllocation = parseFormValue('eth-allocation');
        const targetBTC = parseFormValue('target-btc') / 100;
        const targetETH = parseFormValue('target-eth') / 100;

        // Validate inputs
        if (targetBTC + targetETH !== 1) {
            throw new Error('Target allocations must sum to 100%');
        }

        // Make API call
        const result = await fetchWithErrorHandling(API_ENDPOINTS.REBALANCE, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                current_allocation: [btcAllocation, ethAllocation],
                target_allocation: [targetBTC, targetETH],
            }),
        });

        // Update UI with results
        updateProgressBar(100);
        displayResults(result.adjustments, result.predicted_prices);
    } catch (error) {
        showError(error.message);
    } finally {
        UIElements.loading.style.display = 'none';
    }
}

// Initialize current prices
async function initializePrices() {
    try {
        const data = await fetchWithErrorHandling(API_ENDPOINTS.CURRENT_PRICES);
        UIElements.btcPrice.innerText = `${formatCurrency(data.btc_price)}`;
        UIElements.ethPrice.innerText = `${formatCurrency(data.eth_price)}`;
    } catch (error) {
        UIElements.btcPrice.innerText = 'Failed to load';
        UIElements.ethPrice.innerText = 'Failed to load';
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', initializePrices);
UIElements.form.addEventListener('submit', handleFormSubmit);

// Add input validation
document.querySelectorAll('input[type="number"]').forEach(input => {
    input.addEventListener('input', function() {
        if (this.value < 0) {
            this.value = 0;
        }
    });
});