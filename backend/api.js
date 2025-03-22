const express = require("express");
const { KiteConnect } = require("kiteconnect");
require("dotenv").config();

const app = express();
app.use(express.json());

const API_KEY = process.env.KITE_API_KEY;
const API_SECRET = process.env.KITE_API_SECRET;
const kite = new KiteConnect({ api_key: API_KEY });

let access_token = null; // Store session token after authentication

/**
 * Authenticate and get access token
 */
app.post("/authenticate", async (req, res) => {
    const { request_token } = req.body;
    try {
        const session = await kite.generateSession(request_token, API_SECRET);
        access_token = session.access_token;
        kite.setAccessToken(access_token);
        res.send({ message: "Authenticated successfully", session });
    } catch (error) {
        res.status(400).send({ error: "Authentication failed", details: error.message });
    }
});

/**
 * Get all instruments
 */
app.get("/instruments", async (req, res) => {
    try {
        const instruments = await kite.getInstruments();
        res.json(instruments);
    } catch (error) {
        res.status(400).send({ error: "Failed to fetch instruments", details: error.message });
    }
});

/**
 * Get instruments filtered by exchange (e.g., NSE, BSE)
 */
app.get("/instruments/:exchange", async (req, res) => {
    try {
        const exchange = req.params.exchange.toUpperCase();
        const allInstruments = await kite.getInstruments();
        const filteredInstruments = allInstruments.filter(inst => inst.exchange === exchange);
        res.json(filteredInstruments);
    } catch (error) {
        res.status(400).send({ error: "Failed to fetch instruments", details: error.message });
    }
});

/**
 * Get details of a specific instrument by trading symbol
 */
app.get("/instrument/:symbol", async (req, res) => {
    try {
        const symbol = req.params.symbol.toUpperCase();
        const allInstruments = await kite.getInstruments();
        const instrument = allInstruments.find(inst => inst.tradingsymbol === symbol);
        
        if (!instrument) {
            return res.status(404).send({ error: "Instrument not found" });
        }

        res.json(instrument);
    } catch (error) {
        res.status(400).send({ error: "Failed to fetch instrument data", details: error.message });
    }
});

/**
 * Start the server
 */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
