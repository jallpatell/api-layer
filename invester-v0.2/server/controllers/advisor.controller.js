const { validationResult } = require('express-validator');
const { OpenAI } = require('openai');
const Portfolio = require('../models/portfolio.model');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// @desc    Get investment advice
// @route   POST /api/advisor/advice
// @access  Private
exports.getInvestmentAdvice = async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { message } = req.body;

  try {
    // Use OpenAI for investment advice
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an expert financial advisor specializing in investment advice for retail investors. Provide professional, responsible, and actionable investment advice. Always include disclaimers about investment risks when appropriate. Base your advice on sound financial principles and avoid suggesting highly speculative or risky investments unless specifically asked."
        },
        {
          role: "user",
          content: message
        }
      ]
    });

    res.status(200).json({
      success: true,
      advice: completion.choices[0].message.content
    });
  } catch (err) {
    console.error('Investment advice error:', err.message);
    res.status(500).json({ message: 'Error generating investment advice', error: err.message });
  }
};

// @desc    Get portfolio optimization advice
// @route   POST /api/advisor/optimize
// @access  Private
exports.getPortfolioOptimizationAdvice = async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { portfolioId, riskTolerance } = req.body;

  try {
    // Get portfolio data
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

    // Use OpenAI for portfolio optimization
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `You are an expert portfolio manager specializing in portfolio optimization. The user has a risk tolerance of ${riskTolerance}. Provide professional, actionable advice for optimizing their portfolio. Include recommendations for rebalancing, diversification, and potential adjustments based on their risk profile.`
        },
        {
          role: "user",
          content: `Here is my current portfolio: ${JSON.stringify(portfolioData, null, 2)}. Please provide optimization recommendations based on my ${riskTolerance} risk tolerance.`
        }
      ]
    });

    res.status(200).json({
      success: true,
      optimization: completion.choices[0].message.content
    });
  } catch (err) {
    console.error('Portfolio optimization error:', err.message);
    res.status(500).json({ message: 'Error generating portfolio optimization', error: err.message });
  }
};

// @desc    Get market insights
// @route   GET /api/advisor/market-insights
// @access  Private
exports.getMarketInsights = async (req, res) => {
  try {
    // Use OpenAI for market insights
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an expert financial analyst specializing in market analysis and insights. Provide a concise but comprehensive overview of current market conditions, key trends, and potential opportunities or risks. Base your analysis on general market principles, and provide insights that would be valuable to retail investors."
        },
        {
          role: "user",
          content: "Please provide current market insights for retail investors. Focus on major indices, sectors showing strength or weakness, and any significant economic factors affecting markets. Also include any important events or data releases coming up that investors should be aware of."
        }
      ]
    });

    res.status(200).json({
      success: true,
      insights: completion.choices[0].message.content
    });
  } catch (err) {
    console.error('Market insights error:', err.message);
    res.status(500).json({ message: 'Error generating market insights', error: err.message });
  }
};

// @desc    Get personalized stock picks
// @route   POST /api/advisor/stock-picks
// @access  Private
exports.getStockPicks = async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { criteria } = req.body;

  try {
    // Use OpenAI for personalized stock picks
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an expert financial advisor specializing in stock selection for retail investors. Provide thoughtful stock suggestions based on the user's criteria. Include reasoning for each pick and relevant risk considerations. Format your response as a list of specific stocks with brief explanations, not general advice."
        },
        {
          role: "user",
          content: `Please suggest stock picks based on the following criteria: ${JSON.stringify(criteria, null, 2)}. For each suggestion, please include the ticker symbol, company name, sector, and a brief explanation of why it fits my criteria.`
        }
      ],
      response_format: { type: "json_object" }
    });

    const stockPicks = JSON.parse(completion.choices[0].message.content);

    res.status(200).json({
      success: true,
      stockPicks
    });
  } catch (err) {
    console.error('Stock picks error:', err.message);
    res.status(500).json({ message: 'Error generating stock picks', error: err.message });
  }
};

// @desc    Get tax optimization advice
// @route   POST /api/advisor/tax-optimization
// @access  Private
exports.getTaxOptimizationAdvice = async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { portfolioId } = req.body;

  try {
    // Get portfolio data
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
      shares: investment.shares,
      purchasePrice: investment.purchasePrice,
      purchaseDate: investment.purchaseDate,
      currentPrice: investment.currentPrice || investment.purchasePrice,
      gainLoss: (investment.currentPrice || investment.purchasePrice) - investment.purchasePrice
    }));

    // Use OpenAI for tax optimization advice
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an expert tax advisor specializing in investment tax optimization for retail investors. Provide actionable tax optimization strategies based on the user's portfolio, focusing on tax-loss harvesting opportunities, long-term vs. short-term capital gains considerations, and other tax-efficient investment strategies. Include appropriate disclaimers about consulting with a tax professional."
        },
        {
          role: "user",
          content: `Here is my current portfolio: ${JSON.stringify(portfolioData, null, 2)}. Please provide tax optimization advice.`
        }
      ]
    });

    res.status(200).json({
      success: true,
      taxAdvice: completion.choices[0].message.content
    });
  } catch (err) {
    console.error('Tax optimization error:', err.message);
    res.status(500).json({ message: 'Error generating tax optimization advice', error: err.message });
  }
};

// @desc    Get AI chat completion
// @route   POST /api/advisor/chat
// @access  Private
exports.getChatCompletion = async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { messages } = req.body;

  try {
    // Add system message if not present
    const systemMessage = {
      role: "system",
      content: "You are an expert financial advisor for retail investors. Provide professional, helpful, and accurate information about investing, personal finance, and financial markets. Always include appropriate disclaimers and risk warnings when discussing investment opportunities or strategies."
    };
    
    const formattedMessages = messages[0]?.role === "system" ? messages : [systemMessage, ...messages];

    // Use OpenAI for chat completion
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: formattedMessages
    });

    res.status(200).json({
      success: true,
      message: completion.choices[0].message
    });
  } catch (err) {
    console.error('Chat completion error:', err.message);
    res.status(500).json({ message: 'Error in chat completion', error: err.message });
  }
};