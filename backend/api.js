const express = require("express");
const cors = require("cors");
const { KiteConnect } = require("kiteconnect");
const RealtimeDataHandler = require("./realtimeData");
require("dotenv").config();

const app = express();

// Configure CORS with specific options
app.use(cors({
    origin: '*', // Allow all origins in development. In production, specify your frontend URL
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json());

const API_KEY = process.env.KITE_API_KEY;
const API_SECRET = process.env.KITE_API_SECRET;

if (!API_KEY || !API_SECRET) {
    console.error("❌ ERROR: Missing API_KEY or API_SECRET in .env file");
    process.exit(1); // Stop execution if credentials are missing
}

// Initialize KiteConnect with proper configuration
const kite = new KiteConnect({
    api_key: API_KEY,
    debug: true // Enable debug mode to see detailed logs
});

let access_token = null; // Store session token after authentication
let realtimeHandler = null;

/**
 * Get login URL (Step 1)
 */
app.get("/login", (req, res) => {
    try {
        // Generate login URL with proper redirect URL and required scopes
        const loginUrl = kite.getLoginURL({
            redirect_url: process.env.REDIRECT_URL || 'http://localhost:3000/callback',
            state: 'random_state',
            skip_session_check: true,
            scopes: ['profile', 'orders', 'positions', 'holdings', 'market_data']
        });
        
        console.log('Generated login URL:', loginUrl); // Debug log
        res.json({ 
            success: true,
            login_url: loginUrl,
            api_key: API_KEY // Send API key to frontend for WebSocket connection
        });
    } catch (error) {
        console.error('Error generating login URL:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to generate login URL',
            details: error.message 
        });
    }
});

/**
 * Callback endpoint to handle the redirect after login
 */
app.get("/callback", async (req, res) => {
    try {
        const { action, status, request_token, error } = req.query;
        
        if (action === 'login' && status === 'success') {
            // Redirect to frontend with request token
            res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth-success?request_token=${request_token}`);
        } else {
            // Handle error case
            res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth-error?error=${error || 'Authentication failed'}`);
        }
    } catch (error) {
        console.error('Error in callback:', error);
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth-error?error=${error.message}`);
    }
});

/**
 * Authenticate and get access token (Step 2)
 */
app.post("/authenticate", async (req, res) => {
    const { request_token } = req.body;

    if (!request_token) {
        return res.status(400).json({ 
            success: false,
            error: "Missing request_token" 
        });
    }

    try {
        console.log('Attempting to generate session with request token:', request_token);
        const session = await kite.generateSession(request_token, API_SECRET);
        
        if (!session || !session.access_token) {
            throw new Error('Invalid session data received');
        }

        access_token = session.access_token;
        kite.setAccessToken(access_token);

        // Initialize real-time handler
        realtimeHandler = new RealtimeDataHandler(API_KEY, access_token);

        res.json({ 
            success: true,
            message: "Authenticated successfully", 
            access_token,
            session
        });
    } catch (error) {
        console.error("❌ Authentication failed:", error);
        res.status(400).json({ 
            success: false,
            error: "Authentication failed", 
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

/**
 * Get all instruments
 */
app.get("/instruments", async (req, res) => {
    try {
        if (!access_token) {
            return res.status(403).json({ 
                error: "Unauthorized. Please authenticate first.",
                details: "No access token found. Please complete the authentication process."
            });
        }

        const instruments = await kite.getInstruments();
        res.json({
            success: true,
            data: instruments
        });
    } catch (error) {
        console.error("❌ Failed to fetch instruments:", error);
        res.status(500).json({ 
            error: "Failed to fetch instruments", 
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

/**
 * Get instruments filtered by exchange (e.g., NSE, BSE)
 */
app.get("/instruments/:exchange", async (req, res) => {
    try {
        if (!access_token) {
            return res.status(403).json({ 
                error: "Unauthorized. Please authenticate first.",
                details: "No access token found. Please complete the authentication process."
            });
        }

        const exchange = req.params.exchange.toUpperCase();
        const allInstruments = await kite.getInstruments();
        const filteredInstruments = allInstruments.filter(inst => inst.exchange === exchange);

        if (filteredInstruments.length === 0) {
            return res.status(404).json({ 
                error: `No instruments found for exchange: ${exchange}`,
                details: "The specified exchange does not have any instruments available."
            });
        }

        res.json({
            success: true,
            data: filteredInstruments
        });
    } catch (error) {
        console.error(`❌ Failed to fetch instruments for exchange ${req.params.exchange}:`, error);
        res.status(500).json({ 
            error: "Failed to fetch instruments", 
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

/**
 * Get details of a specific instrument by trading symbol
 */
app.get("/instrument/:symbol", async (req, res) => {
    try {
        if (!access_token) {
            return res.status(403).json({ error: "Unauthorized. Please authenticate first." });
        }

        const symbol = req.params.symbol.toUpperCase();
        const allInstruments = await kite.getInstruments();
        const instrument = allInstruments.find(inst => inst.tradingsymbol === symbol);

        if (!instrument) {
            return res.status(404).json({ error: "Instrument not found" });
        }

        res.json(instrument);
    } catch (error) {
        console.error(`❌ Failed to fetch instrument ${req.params.symbol}:`, error);
        res.status(500).json({ error: "Failed to fetch instrument data", details: error.message });
    }
});

/**
 * Subscribe to real-time stock data
 */
app.post("/subscribe/stocks", async (req, res) => {
    try {
        if (!realtimeHandler) {
            return res.status(403).json({ error: "Please authenticate first" });
        }

        const { symbols } = req.body;
        if (!symbols || !Array.isArray(symbols)) {
            return res.status(400).json({ error: "Invalid symbols array" });
        }

        await realtimeHandler.subscribeToStocks(symbols, (ticks) => {
            // Handle real-time data updates
            console.log('Received stock data:', ticks);
        });

        res.json({ message: "Successfully subscribed to stocks", symbols });
    } catch (error) {
        console.error("❌ Failed to subscribe to stocks:", error);
        res.status(500).json({ error: "Failed to subscribe to stocks", details: error.message });
    }
});

/**
 * Subscribe to mutual fund data
 */
app.post("/subscribe/mutual-funds", async (req, res) => {
    try {
        if (!realtimeHandler) {
            return res.status(403).json({ error: "Please authenticate first" });
        }

        const { fundIds } = req.body;
        if (!fundIds || !Array.isArray(fundIds)) {
            return res.status(400).json({ error: "Invalid fund IDs array" });
        }

        await realtimeHandler.subscribeToMutualFunds(fundIds, (ticks) => {
            // Handle real-time data updates
            console.log('Received mutual fund data:', ticks);
        });

        res.json({ message: "Successfully subscribed to mutual funds", fundIds });
    } catch (error) {
        console.error("❌ Failed to subscribe to mutual funds:", error);
        res.status(500).json({ error: "Failed to subscribe to mutual funds", details: error.message });
    }
});

/**
 * Get SIP details for a mutual fund
 */
app.get("/mutual-funds/:fundId/sip", async (req, res) => {
    try {
        if (!realtimeHandler) {
            return res.status(403).json({ error: "Please authenticate first" });
        }

        const { fundId } = req.params;
        const sipDetails = await realtimeHandler.getSIPDetails(fundId);
        res.json(sipDetails);
    } catch (error) {
        console.error("❌ Failed to fetch SIP details:", error);
        res.status(500).json({ error: "Failed to fetch SIP details", details: error.message });
    }
});

/**
 * Get historical data
 */
app.get("/historical/:symbol", async (req, res) => {
    try {
        if (!realtimeHandler) {
            return res.status(403).json({ error: "Please authenticate first" });
        }

        const { symbol } = req.params;
        const { from, to, interval } = req.query;

        if (!from || !to) {
            return res.status(400).json({ error: "Missing from or to date" });
        }

        const historicalData = await realtimeHandler.getHistoricalData(
            symbol,
            from,
            to,
            interval || 'day'
        );

        res.json(historicalData);
    } catch (error) {
        console.error("❌ Failed to fetch historical data:", error);
        res.status(500).json({ error: "Failed to fetch historical data", details: error.message });
    }
});

/**
 * Get market status
 */
app.get("/market-status", async (req, res) => {
    try {
        if (!realtimeHandler) {
            return res.status(403).json({ error: "Please authenticate first" });
        }

        const marketStatus = await realtimeHandler.getMarketStatus();
        res.json(marketStatus);
    } catch (error) {
        console.error("❌ Failed to fetch market status:", error);
        res.status(500).json({ error: "Failed to fetch market status", details: error.message });
    }
});

/**
 * Start the server
 */
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all available network interfaces

app.listen(PORT, HOST, (error) => {
    if (error) {
        console.error('❌ Error starting server:', error);
        process.exit(1);
    }
    console.log(`🚀 Server running on http://${HOST}:${PORT}`);
    console.log(`📝 Access the API at:`);
    console.log(`   - Login URL: http://${HOST}:${PORT}/login`);
    console.log(`   - Instruments: http://${HOST}:${PORT}/instruments`);
});

// Add error handling middleware
app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        details: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
    });
});
