const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const app = express();

// Configure CORS
app.use(cors({
    origin: '*',
    methods: ['GET'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());

/**
 * Get all instruments from NSE
 */
app.get("/instruments", async (req, res) => {
    try {
        // Using NSE's public API to get instrument data
        const response = await axios.get('https://archives.nseindia.com/content/equities/EQUITY_L.csv');
        
        // Parse CSV data
        const lines = response.data.split('\n');
        const headers = lines[0].split(',');
        const instruments = lines.slice(1).map(line => {
            const values = line.split(',');
            return {
                symbol: values[0],
                name: values[1],
                series: values[2],
                dateOfListing: values[3],
                paidUpValue: values[4],
                marketLot: values[5],
                isinNumber: values[6],
                faceValue: values[7]
            };
        });

        res.json({
            success: true,
            data: instruments
        });
    } catch (error) {
        console.error("❌ Failed to fetch instruments:", error);
        res.status(500).json({ 
            success: false,
            error: "Failed to fetch instruments", 
            details: error.message 
        });
    }
});

/**
 * Get instruments filtered by symbol
 */
app.get("/instruments/search", async (req, res) => {
    try {
        const { query } = req.query;
        
        if (!query) {
            return res.status(400).json({ 
                success: false,
                error: "Search query is required" 
            });
        }

        const response = await axios.get('https://archives.nseindia.com/content/equities/EQUITY_L.csv');
        const lines = response.data.split('\n');
        const headers = lines[0].split(',');
        
        const instruments = lines.slice(1)
            .map(line => {
                const values = line.split(',');
                return {
                    symbol: values[0],
                    name: values[1],
                    series: values[2],
                    dateOfListing: values[3],
                    paidUpValue: values[4],
                    marketLot: values[5],
                    isinNumber: values[6],
                    faceValue: values[7]
                };
            })
            .filter(inst => 
                inst.symbol.toLowerCase().includes(query.toLowerCase()) ||
                inst.name.toLowerCase().includes(query.toLowerCase())
            );

        res.json({
            success: true,
            data: instruments
        });
    } catch (error) {
        console.error("❌ Failed to search instruments:", error);
        res.status(500).json({ 
            success: false,
            error: "Failed to search instruments", 
            details: error.message 
        });
    }
});

/**
 * Get instrument details by symbol
 */
app.get("/instruments/:symbol", async (req, res) => {
    try {
        const { symbol } = req.params;
        
        if (!symbol) {
            return res.status(400).json({ 
                success: false,
                error: "Symbol is required" 
            });
        }

        const response = await axios.get('https://archives.nseindia.com/content/equities/EQUITY_L.csv');
        const lines = response.data.split('\n');
        const headers = lines[0].split(',');
        
        const instrument = lines.slice(1)
            .map(line => {
                const values = line.split(',');
                return {
                    symbol: values[0],
                    name: values[1],
                    series: values[2],
                    dateOfListing: values[3],
                    paidUpValue: values[4],
                    marketLot: values[5],
                    isinNumber: values[6],
                    faceValue: values[7]
                };
            })
            .find(inst => inst.symbol.toLowerCase() === symbol.toLowerCase());

        if (!instrument) {
            return res.status(404).json({ 
                success: false,
                error: "Instrument not found" 
            });
        }

        res.json({
            success: true,
            data: instrument
        });
    } catch (error) {
        console.error("❌ Failed to fetch instrument:", error);
        res.status(500).json({ 
            success: false,
            error: "Failed to fetch instrument", 
            details: error.message 
        });
    }
});

/**
 * Start the server
 */
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, (error) => {
    if (error) {
        console.error('❌ Error starting server:', error);
        process.exit(1);
    }
    console.log(`🚀 Server running on http://${HOST}:${PORT}`);
    console.log(`📝 Available endpoints:`);
    console.log(`   - GET /instruments - Get all instruments`);
    console.log(`   - GET /instruments/search?query=RELIANCE - Search instruments`);
    console.log(`   - GET /instruments/RELIANCE - Get specific instrument`);
});
