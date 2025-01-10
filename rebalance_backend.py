from flask import Flask, request, jsonify, render_template
import nbimporter
import app_rebalance
from tqdm import tqdm
from dotenv import load_dotenv
import os

load_dotenv()
APIKEY = os.getenv('API_KEY')

app = Flask(__name__, template_folder='frontend/templates')

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/current_prices', methods=['GET'])
def current_prices():
    btc_prices = app_rebalance.fetch_data('bitcoin', APIKEY)
    eth_prices = app_rebalance.fetch_data('ethereum', APIKEY)
    current_btc_price = round(btc_prices[-1], 3)  # Latest BTC price
    current_eth_price = round(eth_prices[-1], 3)  # Latest ETH price
    return jsonify({"btc_price": current_btc_price, "eth_price": current_eth_price})

@app.route('/rebalance', methods=['POST'])
def rebalance():
    data = request.json
    current_allocation = data['current_allocation']
    target_allocation = data['target_allocation']

   # Fetching data from CoinGecko API
    btc_prices = app_rebalance.fetch_data('bitcoin', APIKEY)
    eth_prices = app_rebalance.fetch_data('ethereum', APIKEY)

   # Preprocessing data
    btc_sequences, btc_targets, btc_scaler = app_rebalance.data_preprocessing_without_split(btc_prices)
    eth_sequences, eth_targets, eth_scaler = app_rebalance.data_preprocessing_without_split(eth_prices)

    # Build and train model
    btc_model = app_rebalance.ANN_Model((btc_sequences.shape[1], btc_sequences.shape[2]))
    eth_model = app_rebalance.ANN_Model((eth_sequences.shape[1], eth_sequences.shape[2]))

   # Training BTC model with progress bar
    for epoch in tqdm(range(10), desc="Training BTC Model"):
        btc_model.fit(btc_sequences, btc_targets, epochs=50, batch_size=32, verbose=0)

   # Training ETH model with progress bar
    for epoch in tqdm(range(10), desc="Training ETH Model"):
        eth_model.fit(eth_sequences, eth_targets, epochs=50, batch_size=32, verbose=0)

   # Predict prices using the trained models
    btc_predicted_price = app_rebalance.predict_price(btc_model, btc_sequences, btc_scaler)
    eth_predicted_price = app_rebalance.predict_price(eth_model, eth_sequences, eth_scaler)

   # Log the predicted prices to ensure they're being generated
    print(f"Predicted BTC Price: {btc_predicted_price}")
    print(f"Predicted ETH Price: {eth_predicted_price}")
    predicted_prices = [btc_predicted_price, eth_predicted_price]

   # Rebalance portfolio
    adjustments, rounded_predicted_prices = app_rebalance.rebalance_portfolio(current_allocation, predicted_prices, target_allocation)
    return jsonify({"adjustments": adjustments, "predicted_prices": rounded_predicted_prices})

@app.errorhandler(404)
def not_found_error(error):
    return jsonify({"error": "Resource not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500

if __name__ == '__main__':

    app.run(debug=True)