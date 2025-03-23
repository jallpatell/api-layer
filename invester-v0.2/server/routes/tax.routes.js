const express = require('express');
const { check } = require('express-validator');
const auth = require('../middleware/auth');
const { OpenAI } = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const router = express.Router();

// All routes require authentication
router.use(auth);

// @route   POST /api/tax/calculate-gains
// @desc    Calculate capital gains for portfolio
// @access  Private
router.post('/calculate-gains', [
  check('portfolioId', 'Portfolio ID is required').not().isEmpty(),
  check('year', 'Year is required').isInt({ min: 2000, max: 2100 })
], async (req, res) => {
  const { validationResult } = require('express-validator');
  
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const { portfolioId, year } = req.body;
    
    const Portfolio = require('../models/portfolio.model');
    
    const portfolio = await Portfolio.findOne({ 
      _id: portfolioId, 
      user: req.user.id 
    });
    
    if (!portfolio) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }
    
    // Filter investments to only include those held or sold in the specified year
    const relevantInvestments = portfolio.investments.filter(inv => {
      const purchaseYear = new Date(inv.purchaseDate).getFullYear();
      return purchaseYear <= year;
    });
    
    if (relevantInvestments.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          year,
          shortTermGains: 0,
          longTermGains: 0,
          totalGains: 0,
          investments: []
        }
      });
    }
    
    // Transform investment data for capital gains calculation
    const investmentsData = relevantInvestments.map(inv => {
      const purchaseDate = new Date(inv.purchaseDate);
      const currentDate = new Date();
      const holdingPeriod = (currentDate - purchaseDate) / (1000 * 60 * 60 * 24); // in days
      const unrealizedGain = (inv.currentPrice - inv.purchasePrice) * inv.shares;
      
      return {
        symbol: inv.symbol,
        name: inv.name || inv.symbol,
        shares: inv.shares,
        purchasePrice: inv.purchasePrice,
        purchaseDate: inv.purchaseDate,
        currentPrice: inv.currentPrice,
        unrealizedGain,
        isLongTerm: holdingPeriod > 365
      };
    });
    
    // Calculate capital gains
    const shortTermGains = investmentsData
      .filter(inv => !inv.isLongTerm)
      .reduce((total, inv) => total + inv.unrealizedGain, 0);
      
    const longTermGains = investmentsData
      .filter(inv => inv.isLongTerm)
      .reduce((total, inv) => total + inv.unrealizedGain, 0);
      
    const totalGains = shortTermGains + longTermGains;
    
    res.status(200).json({
      success: true,
      data: {
        year,
        shortTermGains,
        longTermGains,
        totalGains,
        investments: investmentsData
      }
    });
  } catch (err) {
    console.error('Capital gains calculation error:', err.message);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Portfolio not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/tax/tax-loss-harvesting
// @desc    Generate tax loss harvesting recommendations
// @access  Private
router.post('/tax-loss-harvesting', [
  check('portfolioId', 'Portfolio ID is required').not().isEmpty()
], async (req, res) => {
  const { validationResult } = require('express-validator');
  
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const { portfolioId } = req.body;
    
    const Portfolio = require('../models/portfolio.model');
    
    const portfolio = await Portfolio.findOne({ 
      _id: portfolioId, 
      user: req.user.id 
    });
    
    if (!portfolio) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }
    
    // Identify investments with losses
    const investmentsWithLosses = portfolio.investments
      .filter(inv => inv.currentPrice < inv.purchasePrice)
      .map(inv => ({
        symbol: inv.symbol,
        name: inv.name || inv.symbol,
        shares: inv.shares,
        purchasePrice: inv.purchasePrice,
        currentPrice: inv.currentPrice,
        totalLoss: (inv.purchasePrice - inv.currentPrice) * inv.shares,
        purchaseDate: inv.purchaseDate,
        sector: inv.sector || 'Unknown'
      }))
      .sort((a, b) => b.totalLoss - a.totalLoss); // Sort by largest loss first
    
    if (investmentsWithLosses.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No tax loss harvesting opportunities identified',
        data: {
          opportunities: []
        }
      });
    }
    
    // Use OpenAI to generate tax loss harvesting recommendations
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a tax optimization expert specializing in tax loss harvesting for retail investors. Provide actionable recommendations for tax-loss harvesting based on the portfolio data provided. Focus on specific securities that could be sold to realize losses and suggest potential alternatives that maintain similar market exposure while avoiding wash sale rules."
        },
        {
          role: "user",
          content: `Please analyze these investment positions with unrealized losses and provide tax loss harvesting recommendations: ${JSON.stringify(investmentsWithLosses, null, 2)}`
        }
      ],
      response_format: { type: "json_object" }
    });
    
    const recommendations = JSON.parse(completion.choices[0].message.content);
    
    res.status(200).json({
      success: true,
      data: {
        opportunities: investmentsWithLosses,
        recommendations
      }
    });
  } catch (err) {
    console.error('Tax loss harvesting error:', err.message);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Portfolio not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/tax/tax-rate-info
// @desc    Get current tax rate information
// @access  Private
router.get('/tax-rate-info', async (req, res) => {
  try {
    const { country, year } = req.query;
    
    // Default to US and current year if not specified
    const targetCountry = country || 'United States';
    const targetYear = year || new Date().getFullYear();
    
    // Use OpenAI to provide current tax rate information
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a tax expert specializing in investment taxation. Provide detailed, accurate information about tax rates specifically for investments and capital gains. Format your information in a clear, structured way that's easy for retail investors to understand and apply."
        },
        {
          role: "user",
          content: `What are the investment tax rates for ${targetCountry} in ${targetYear}? Please include information on short-term capital gains, long-term capital gains, qualified dividends, ordinary dividends, and any special investment taxes. Organize this by income bracket and provide specific rate percentages.`
        }
      ],
      response_format: { type: "json_object" }
    });
    
    const taxRateInfo = JSON.parse(completion.choices[0].message.content);
    
    res.status(200).json({
      success: true,
      data: {
        country: targetCountry,
        year: targetYear,
        taxRateInfo
      }
    });
  } catch (err) {
    console.error('Tax rate info error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/tax/estimate-tax-liability
// @desc    Estimate tax liability for a portfolio
// @access  Private
router.post('/estimate-tax-liability', [
  check('portfolioId', 'Portfolio ID is required').not().isEmpty(),
  check('year', 'Year is required').isInt({ min: 2000, max: 2100 }),
  check('country', 'Country is required').not().isEmpty(),
  check('incomeLevel', 'Income level is required').not().isEmpty()
], async (req, res) => {
  const { validationResult } = require('express-validator');
  
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const { portfolioId, year, country, incomeLevel, filingStatus } = req.body;
    
    const Portfolio = require('../models/portfolio.model');
    
    const portfolio = await Portfolio.findOne({ 
      _id: portfolioId, 
      user: req.user.id 
    });
    
    if (!portfolio) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }
    
    // Transform investment data for tax liability estimation
    const investmentsData = portfolio.investments.map(inv => {
      const purchaseDate = new Date(inv.purchaseDate);
      const currentDate = new Date();
      const holdingPeriod = (currentDate - purchaseDate) / (1000 * 60 * 60 * 24); // in days
      const unrealizedGain = (inv.currentPrice - inv.purchasePrice) * inv.shares;
      
      return {
        symbol: inv.symbol,
        name: inv.name || inv.symbol,
        shares: inv.shares,
        purchasePrice: inv.purchasePrice,
        purchaseDate: inv.purchaseDate,
        currentPrice: inv.currentPrice,
        unrealizedGain,
        isLongTerm: holdingPeriod > 365
      };
    });
    
    // Use OpenAI to estimate tax liability
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a tax expert specializing in investment taxation. Provide detailed tax liability estimates based on the given portfolio data, income level, and filing status. Focus on capital gains taxes, dividend taxes, and any other relevant investment taxes."
        },
        {
          role: "user",
          content: `Please estimate the tax liability for this portfolio in ${country} for the tax year ${year} with an income level of ${incomeLevel} and filing status of ${filingStatus || 'Single'}:\n\n${JSON.stringify(investmentsData, null, 2)}`
        }
      ],
      response_format: { type: "json_object" }
    });
    
    const taxLiability = JSON.parse(completion.choices[0].message.content);
    
    res.status(200).json({
      success: true,
      data: {
        year,
        country,
        incomeLevel,
        filingStatus: filingStatus || 'Single',
        taxLiability
      }
    });
  } catch (err) {
    console.error('Tax liability estimation error:', err.message);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Portfolio not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/tax/tax-planning-advice
// @desc    Get personalized tax planning advice
// @access  Private
router.get('/tax-planning-advice', async (req, res) => {
  try {
    const { portfolioId, country, incomeLevel } = req.query;
    
    if (!portfolioId) {
      return res.status(400).json({ message: 'Portfolio ID is required' });
    }
    
    const Portfolio = require('../models/portfolio.model');
    
    const portfolio = await Portfolio.findOne({ 
      _id: portfolioId, 
      user: req.user.id 
    });
    
    if (!portfolio) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }
    
    // Use OpenAI to generate personalized tax planning advice
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a tax planning expert specializing in investment tax optimization. Provide comprehensive, personalized tax planning advice based on the given portfolio data, the investor's country, and income level. Focus on tax-efficient investment strategies, tax-advantaged accounts, and other relevant tax optimization approaches."
        },
        {
          role: "user",
          content: `Please provide personalized tax planning advice for an investor in ${country || 'the United States'} with an income level of ${incomeLevel || 'moderate'} and the following portfolio:\n\n${JSON.stringify(portfolio.investments, null, 2)}`
        }
      ]
    });
    
    res.status(200).json({
      success: true,
      data: {
        portfolioId,
        country: country || 'United States',
        incomeLevel: incomeLevel || 'moderate',
        advice: completion.choices[0].message.content
      }
    });
  } catch (err) {
    console.error('Tax planning advice error:', err.message);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Portfolio not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;