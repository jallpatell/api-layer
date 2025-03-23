const mongoose = require('mongoose');

const InvestmentSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: [true, 'Please provide a stock symbol'],
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    trim: true
  },
  shares: {
    type: Number,
    required: [true, 'Please provide the number of shares'],
    min: [0, 'Shares cannot be negative']
  },
  purchasePrice: {
    type: Number,
    required: [true, 'Please provide the purchase price per share'],
    min: [0, 'Purchase price cannot be negative']
  },
  purchaseDate: {
    type: Date,
    required: [true, 'Please provide the purchase date'],
    default: Date.now
  },
  sector: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  currentPrice: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

const PortfolioSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Please provide a portfolio name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  description: {
    type: String,
    trim: true
  },
  investments: [InvestmentSchema],
  totalValue: {
    type: Number,
    default: 0
  },
  totalCost: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  isDefault: {
    type: Boolean,
    default: false
  }
});

// Update portfolio value and cost when saving
PortfolioSchema.pre('save', function(next) {
  // Calculate total cost
  this.totalCost = this.investments.reduce((total, investment) => {
    return total + (investment.purchasePrice * investment.shares);
  }, 0);

  // Calculate total value
  this.totalValue = this.investments.reduce((total, investment) => {
    const currentPrice = investment.currentPrice || investment.purchasePrice;
    return total + (currentPrice * investment.shares);
  }, 0);

  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Portfolio', PortfolioSchema);