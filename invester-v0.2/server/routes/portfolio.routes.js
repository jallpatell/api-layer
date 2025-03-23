const express = require('express');
const { check } = require('express-validator');
const auth = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(auth);

// @route   GET /api/portfolio
// @desc    Get all portfolios for user
// @access  Private
router.get('/', async (req, res) => {
  try {
    const Portfolio = require('../models/portfolio.model');
    const portfolios = await Portfolio.find({ user: req.user.id });
    res.status(200).json({ success: true, data: portfolios });
  } catch (err) {
    console.error('Error fetching portfolios:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/portfolio/:id
// @desc    Get single portfolio by ID
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const Portfolio = require('../models/portfolio.model');
    const portfolio = await Portfolio.findOne({ 
      _id: req.params.id, 
      user: req.user.id 
    });
    
    if (!portfolio) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }
    
    res.status(200).json({ success: true, data: portfolio });
  } catch (err) {
    console.error('Error fetching portfolio:', err.message);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Portfolio not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/portfolio
// @desc    Create new portfolio
// @access  Private
router.post('/', [
  check('name', 'Portfolio name is required').not().isEmpty()
], async (req, res) => {
  const { validationResult } = require('express-validator');
  
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const Portfolio = require('../models/portfolio.model');
    const { name, description, isDefault } = req.body;
    
    // If creating a default portfolio, first check if user already has one
    if (isDefault) {
      const existingDefault = await Portfolio.findOne({ 
        user: req.user.id, 
        isDefault: true 
      });
      
      if (existingDefault) {
        existingDefault.isDefault = false;
        await existingDefault.save();
      }
    }
    
    const portfolio = new Portfolio({
      user: req.user.id,
      name,
      description,
      investments: [],
      isDefault: isDefault || false
    });
    
    await portfolio.save();
    
    res.status(201).json({ success: true, data: portfolio });
  } catch (err) {
    console.error('Error creating portfolio:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/portfolio/:id
// @desc    Update portfolio
// @access  Private
router.put('/:id', [
  check('name', 'Portfolio name is required').not().isEmpty()
], async (req, res) => {
  const { validationResult } = require('express-validator');
  
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const Portfolio = require('../models/portfolio.model');
    const { name, description, isDefault } = req.body;
    
    const portfolio = await Portfolio.findOne({ 
      _id: req.params.id, 
      user: req.user.id 
    });
    
    if (!portfolio) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }
    
    // If making this portfolio default, update any other default portfolios
    if (isDefault && !portfolio.isDefault) {
      await Portfolio.updateMany(
        { user: req.user.id, isDefault: true, _id: { $ne: portfolio._id } },
        { $set: { isDefault: false } }
      );
    }
    
    portfolio.name = name;
    portfolio.description = description;
    portfolio.isDefault = isDefault || portfolio.isDefault;
    
    await portfolio.save();
    
    res.status(200).json({ success: true, data: portfolio });
  } catch (err) {
    console.error('Error updating portfolio:', err.message);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Portfolio not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/portfolio/:id
// @desc    Delete portfolio
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const Portfolio = require('../models/portfolio.model');
    
    const portfolio = await Portfolio.findOne({ 
      _id: req.params.id, 
      user: req.user.id 
    });
    
    if (!portfolio) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }
    
    await portfolio.deleteOne();
    
    res.status(200).json({ success: true, message: 'Portfolio deleted' });
  } catch (err) {
    console.error('Error deleting portfolio:', err.message);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Portfolio not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/portfolio/:id/investment
// @desc    Add investment to portfolio
// @access  Private
router.post('/:id/investment', [
  check('symbol', 'Stock symbol is required').not().isEmpty(),
  check('shares', 'Number of shares is required').isNumeric(),
  check('purchasePrice', 'Purchase price is required').isNumeric()
], async (req, res) => {
  const { validationResult } = require('express-validator');
  
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const Portfolio = require('../models/portfolio.model');
    const { symbol, name, shares, purchasePrice, purchaseDate, sector, notes } = req.body;
    
    const portfolio = await Portfolio.findOne({ 
      _id: req.params.id, 
      user: req.user.id 
    });
    
    if (!portfolio) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }
    
    const yahoo = require('yahoo-finance2').default;
    
    // Get latest stock price from Yahoo Finance
    let currentPrice = purchasePrice;
    try {
      const quote = await yahoo.quote(symbol);
      currentPrice = quote.regularMarketPrice;
    } catch (err) {
      console.error(`Error fetching quote for ${symbol}:`, err.message);
      // Fallback to purchase price if real-time price not available
    }
    
    portfolio.investments.push({
      symbol: symbol.toUpperCase(),
      name: name || symbol.toUpperCase(),
      shares: parseFloat(shares),
      purchasePrice: parseFloat(purchasePrice),
      purchaseDate: purchaseDate || new Date(),
      sector,
      notes,
      currentPrice,
      lastUpdated: new Date()
    });
    
    await portfolio.save();
    
    res.status(200).json({ success: true, data: portfolio });
  } catch (err) {
    console.error('Error adding investment:', err.message);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Portfolio not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/portfolio/:id/investment/:investmentId
// @desc    Update investment in portfolio
// @access  Private
router.put('/:id/investment/:investmentId', [
  check('shares', 'Number of shares must be numeric').optional().isNumeric(),
  check('purchasePrice', 'Purchase price must be numeric').optional().isNumeric()
], async (req, res) => {
  const { validationResult } = require('express-validator');
  
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const Portfolio = require('../models/portfolio.model');
    const { shares, purchasePrice, purchaseDate, sector, notes } = req.body;
    
    const portfolio = await Portfolio.findOne({ 
      _id: req.params.id, 
      user: req.user.id 
    });
    
    if (!portfolio) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }
    
    const investment = portfolio.investments.id(req.params.investmentId);
    
    if (!investment) {
      return res.status(404).json({ message: 'Investment not found' });
    }
    
    // Update investment fields if provided
    if (shares) investment.shares = parseFloat(shares);
    if (purchasePrice) investment.purchasePrice = parseFloat(purchasePrice);
    if (purchaseDate) investment.purchaseDate = purchaseDate;
    if (sector) investment.sector = sector;
    if (notes !== undefined) investment.notes = notes;
    
    // Try to update current price if possible
    try {
      const yahoo = require('yahoo-finance2').default;
      const quote = await yahoo.quote(investment.symbol);
      investment.currentPrice = quote.regularMarketPrice;
      investment.lastUpdated = new Date();
    } catch (err) {
      console.error(`Error updating price for ${investment.symbol}:`, err.message);
    }
    
    await portfolio.save();
    
    res.status(200).json({ success: true, data: portfolio });
  } catch (err) {
    console.error('Error updating investment:', err.message);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Portfolio or investment not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/portfolio/:id/investment/:investmentId
// @desc    Delete investment from portfolio
// @access  Private
router.delete('/:id/investment/:investmentId', async (req, res) => {
  try {
    const Portfolio = require('../models/portfolio.model');
    
    const portfolio = await Portfolio.findOne({ 
      _id: req.params.id, 
      user: req.user.id 
    });
    
    if (!portfolio) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }
    
    const investment = portfolio.investments.id(req.params.investmentId);
    
    if (!investment) {
      return res.status(404).json({ message: 'Investment not found' });
    }
    
    portfolio.investments.pull(req.params.investmentId);
    
    await portfolio.save();
    
    res.status(200).json({ success: true, message: 'Investment removed', data: portfolio });
  } catch (err) {
    console.error('Error removing investment:', err.message);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Portfolio or investment not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/portfolio/:id/refresh
// @desc    Refresh all investment prices in portfolio
// @access  Private
router.post('/:id/refresh', async (req, res) => {
  try {
    const Portfolio = require('../models/portfolio.model');
    
    const portfolio = await Portfolio.findOne({ 
      _id: req.params.id, 
      user: req.user.id 
    });
    
    if (!portfolio) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }
    
    if (portfolio.investments.length === 0) {
      return res.status(200).json({ 
        success: true, 
        message: 'No investments to update',
        data: portfolio
      });
    }
    
    const yahoo = require('yahoo-finance2').default;
    
    // Get all unique symbols
    const symbols = [...new Set(portfolio.investments.map(inv => inv.symbol))];
    
    // Get quotes for all symbols
    const quotes = {};
    for (const symbol of symbols) {
      try {
        const quote = await yahoo.quote(symbol);
        quotes[symbol] = quote.regularMarketPrice;
      } catch (err) {
        console.error(`Error fetching quote for ${symbol}:`, err.message);
      }
    }
    
    // Update all investments with new prices
    for (const investment of portfolio.investments) {
      if (quotes[investment.symbol]) {
        investment.currentPrice = quotes[investment.symbol];
        investment.lastUpdated = new Date();
      }
    }
    
    await portfolio.save();
    
    res.status(200).json({ 
      success: true, 
      message: 'Portfolio prices updated',
      data: portfolio 
    });
  } catch (err) {
    console.error('Error refreshing portfolio:', err.message);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Portfolio not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;