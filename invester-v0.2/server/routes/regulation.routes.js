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

// @route   GET /api/regulation/search
// @desc    Search regulations
// @access  Private
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    // Use OpenAI to retrieve relevant regulations based on query
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an expert in financial regulations and compliance for retail investors. Provide accurate, up-to-date information about financial regulations, laws, and compliance requirements. Focus on practical implications for retail investors."
        },
        {
          role: "user",
          content: `I need information about financial regulations related to: ${query}. Include relevant laws, regulatory bodies, compliance requirements, and practical implications for retail investors.`
        }
      ]
    });
    
    res.status(200).json({
      success: true,
      results: completion.choices[0].message.content
    });
  } catch (err) {
    console.error('Regulation search error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/regulation/sec-filings
// @desc    Get SEC filing information
// @access  Private
router.get('/sec-filings', async (req, res) => {
  try {
    const { symbol } = req.query;
    
    if (!symbol) {
      return res.status(400).json({ message: 'Stock symbol is required' });
    }
    
    // Use OpenAI to provide information about SEC filings for the symbol
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a financial expert specializing in SEC filings and corporate disclosures. Provide comprehensive information about various SEC filings, their purposes, and where to find them."
        },
        {
          role: "user",
          content: `I need information about SEC filings for the company with ticker symbol ${symbol}. What are the important SEC filings I should look at, what can I learn from each type of filing, and how do I access them?`
        }
      ],
      response_format: { type: "json_object" }
    });
    
    const filingInfo = JSON.parse(completion.choices[0].message.content);
    
    res.status(200).json({
      success: true,
      symbol: symbol.toUpperCase(),
      filingInfo
    });
  } catch (err) {
    console.error('SEC filings error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/regulation/compliance-check
// @desc    Check portfolio for compliance issues
// @access  Private
router.get('/compliance-check', async (req, res) => {
  try {
    const { portfolioId } = req.query;
    
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
    
    // Format portfolio data for OpenAI
    const portfolioData = portfolio.investments.map(investment => ({
      symbol: investment.symbol,
      name: investment.name || investment.symbol,
      shares: investment.shares,
      value: investment.shares * (investment.currentPrice || investment.purchasePrice),
      sector: investment.sector || 'Unknown'
    }));
    
    // Use OpenAI to analyze portfolio for compliance issues
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a financial compliance expert specializing in regulatory compliance for retail investors. Analyze the given portfolio for potential compliance issues, conflicts, regulatory concerns, or risk exposures that could affect a retail investor."
        },
        {
          role: "user",
          content: `Please analyze this portfolio for compliance issues or regulatory concerns a retail investor should be aware of: ${JSON.stringify(portfolioData, null, 2)}`
        }
      ]
    });
    
    res.status(200).json({
      success: true,
      portfolioId,
      complianceAnalysis: completion.choices[0].message.content
    });
  } catch (err) {
    console.error('Compliance check error:', err.message);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Portfolio not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/regulation/insider-trading
// @desc    Get insider trading information
// @access  Private
router.get('/insider-trading', async (req, res) => {
  try {
    const { symbol } = req.query;
    
    if (!symbol) {
      return res.status(400).json({ message: 'Stock symbol is required' });
    }
    
    // Use OpenAI to provide information about insider trading
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a financial expert specializing in insider trading regulations and filings. Provide comprehensive information about insider trading rules, Form 4 filings, and what they mean for retail investors."
        },
        {
          role: "user",
          content: `I need information about insider trading regulations and where to find insider trading data for ${symbol}. What are the insider trading regulations retail investors should be aware of, and how do I track and interpret insider trading activity for this company?`
        }
      ]
    });
    
    res.status(200).json({
      success: true,
      symbol: symbol.toUpperCase(),
      insiderTradingInfo: completion.choices[0].message.content
    });
  } catch (err) {
    console.error('Insider trading info error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/regulation/country-restrictions
// @desc    Get country-specific investment restrictions
// @access  Private
router.get('/country-restrictions', async (req, res) => {
  try {
    const { country } = req.query;
    
    if (!country) {
      return res.status(400).json({ message: 'Country is required' });
    }
    
    // Use OpenAI to provide information about country-specific investment restrictions
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a global financial regulations expert specializing in international investment law. Provide accurate information about investment restrictions, regulations, and compliance requirements for different countries."
        },
        {
          role: "user",
          content: `What are the specific investment regulations, restrictions, and compliance requirements for retail investors in ${country}? Include information about any unique rules, tax implications, reporting requirements, or limitations that retail investors should be aware of.`
        }
      ]
    });
    
    res.status(200).json({
      success: true,
      country,
      restrictions: completion.choices[0].message.content
    });
  } catch (err) {
    console.error('Country restrictions error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;