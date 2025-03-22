const { KiteConnect } = require("kiteconnect");
require("dotenv").config();

class RealtimeDataHandler {
    constructor(apiKey, accessToken) {
        this.kite = new KiteConnect({
            api_key: apiKey,
            access_token: accessToken,
            debug: true
        });
        this.subscriptions = new Map();
    }

    /**
     * Subscribe to real-time stock data
     * @param {Array} symbols - Array of stock symbols to subscribe to
     * @param {Function} callback - Callback function to handle the data
     */
    async subscribeToStocks(symbols, callback) {
        try {
            // Format symbols for subscription (e.g., "NSE:RELIANCE")
            const formattedSymbols = symbols.map(symbol => `NSE:${symbol}`);
            
            // Subscribe to the symbols
            await this.kite.subscribe(formattedSymbols, this.kite.modeFull, true);
            
            // Set up WebSocket connection
            this.kite.on('ticks', (ticks) => {
                callback(ticks);
            });

            // Store subscription for later reference
            this.subscriptions.set('stocks', {
                symbols: formattedSymbols,
                callback: callback
            });

            console.log(`✅ Subscribed to stocks: ${symbols.join(', ')}`);
        } catch (error) {
            console.error('❌ Error subscribing to stocks:', error);
            throw error;
        }
    }

    /**
     * Subscribe to mutual fund data
     * @param {Array} fundIds - Array of mutual fund IDs to subscribe to
     * @param {Function} callback - Callback function to handle the data
     */
    async subscribeToMutualFunds(fundIds, callback) {
        try {
            // Format fund IDs for subscription
            const formattedFundIds = fundIds.map(id => `MF:${id}`);
            
            // Subscribe to the funds
            await this.kite.subscribe(formattedFundIds, this.kite.modeFull, true);
            
            // Set up WebSocket connection
            this.kite.on('ticks', (ticks) => {
                callback(ticks);
            });

            // Store subscription for later reference
            this.subscriptions.set('mutualFunds', {
                symbols: formattedFundIds,
                callback: callback
            });

            console.log(`✅ Subscribed to mutual funds: ${fundIds.join(', ')}`);
        } catch (error) {
            console.error('❌ Error subscribing to mutual funds:', error);
            throw error;
        }
    }

    /**
     * Get SIP details for a mutual fund
     * @param {string} fundId - Mutual fund ID
     * @returns {Promise} SIP details
     */
    async getSIPDetails(fundId) {
        try {
            const sipDetails = await this.kite.getMFInfo(fundId);
            return sipDetails;
        } catch (error) {
            console.error('❌ Error fetching SIP details:', error);
            throw error;
        }
    }

    /**
     * Get historical data for a symbol
     * @param {string} symbol - Stock or fund symbol
     * @param {string} from - Start date (YYYY-MM-DD)
     * @param {string} to - End date (YYYY-MM-DD)
     * @param {string} interval - Data interval (minute, hour, day)
     * @returns {Promise} Historical data
     */
    async getHistoricalData(symbol, from, to, interval = 'day') {
        try {
            const historicalData = await this.kite.getHistoricalData(
                symbol,
                from,
                to,
                interval
            );
            return historicalData;
        } catch (error) {
            console.error('❌ Error fetching historical data:', error);
            throw error;
        }
    }

    /**
     * Unsubscribe from all subscriptions
     */
    async unsubscribeAll() {
        try {
            const allSymbols = Array.from(this.subscriptions.values())
                .map(sub => sub.symbols)
                .flat();
            
            if (allSymbols.length > 0) {
                await this.kite.unsubscribe(allSymbols);
                this.subscriptions.clear();
                console.log('✅ Unsubscribed from all symbols');
            }
        } catch (error) {
            console.error('❌ Error unsubscribing:', error);
            throw error;
        }
    }

    /**
     * Get current market status
     * @returns {Promise} Market status
     */
    async getMarketStatus() {
        try {
            const marketStatus = await this.kite.getMarketStatus();
            return marketStatus;
        } catch (error) {
            console.error('❌ Error fetching market status:', error);
            throw error;
        }
    }
}

// Example usage:
/*
const realtimeHandler = new RealtimeDataHandler(process.env.KITE_API_KEY, accessToken);

// Subscribe to stocks
realtimeHandler.subscribeToStocks(['RELIANCE', 'TCS'], (ticks) => {
    console.log('Stock data:', ticks);
});

// Subscribe to mutual funds
realtimeHandler.subscribeToMutualFunds(['123456', '789012'], (ticks) => {
    console.log('Mutual fund data:', ticks);
});

// Get SIP details
realtimeHandler.getSIPDetails('123456')
    .then(details => console.log('SIP details:', details))
    .catch(error => console.error('Error:', error));

// Get historical data
realtimeHandler.getHistoricalData('NSE:RELIANCE', '2023-01-01', '2023-12-31')
    .then(data => console.log('Historical data:', data))
    .catch(error => console.error('Error:', error));
*/

module.exports = RealtimeDataHandler; 