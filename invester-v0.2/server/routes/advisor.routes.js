const express = require('express');
const { check } = require('express-validator');
const advisorController = require('../controllers/advisor.controller');
const auth = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(auth);

// @route   POST /api/advisor/advice
// @desc    Get investment advice
// @access  Private
router.post(
  '/advice',
  [
    check('message', 'Message is required').not().isEmpty()
  ],
  advisorController.getInvestmentAdvice
);

// @route   POST /api/advisor/optimize
// @desc    Get portfolio optimization advice
// @access  Private
router.post(
  '/optimize',
  [
    check('portfolioId', 'Portfolio ID is required').not().isEmpty(),
    check('riskTolerance', 'Risk tolerance is required').isIn(['low', 'moderate', 'high'])
  ],
  advisorController.getPortfolioOptimizationAdvice
);

// @route   GET /api/advisor/market-insights
// @desc    Get market insights
// @access  Private
router.get('/market-insights', advisorController.getMarketInsights);

// @route   POST /api/advisor/stock-picks
// @desc    Get personalized stock picks
// @access  Private
router.post(
  '/stock-picks',
  [
    check('criteria', 'Criteria object is required').not().isEmpty(),
    check('criteria.riskTolerance', 'Risk tolerance is required').exists(),
    check('criteria.investmentGoals', 'Investment goals are required').exists(),
    check('criteria.sector', 'Sector preference is required').optional()
  ],
  advisorController.getStockPicks
);

// @route   POST /api/advisor/tax-optimization
// @desc    Get tax optimization advice
// @access  Private
router.post(
  '/tax-optimization',
  [
    check('portfolioId', 'Portfolio ID is required').not().isEmpty()
  ],
  advisorController.getTaxOptimizationAdvice
);

// @route   POST /api/advisor/chat
// @desc    Get AI chat completion
// @access  Private
router.post(
  '/chat',
  [
    check('messages', 'Messages array is required').isArray({ min: 1 })
  ],
  advisorController.getChatCompletion
);

module.exports = router;