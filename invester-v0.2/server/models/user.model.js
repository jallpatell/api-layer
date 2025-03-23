const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ],
    lowercase: true
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'light'
    },
    language: {
      type: String,
      default: 'en'
    },
    currency: {
      type: String,
      default: 'usd'
    },
    dateFormat: {
      type: String,
      default: 'mm-dd-yyyy'
    },
  },
  notifications: {
    email: {
      portfolioUpdates: {
        type: Boolean,
        default: true
      },
      marketAlerts: {
        type: Boolean,
        default: true
      },
      newsUpdates: {
        type: Boolean,
        default: true
      },
      taxAlerts: {
        type: Boolean,
        default: true
      }
    },
    push: {
      portfolioUpdates: {
        type: Boolean,
        default: true
      },
      marketAlerts: {
        type: Boolean,
        default: true
      },
      newsUpdates: {
        type: Boolean,
        default: true
      },
      taxAlerts: {
        type: Boolean,
        default: true
      }
    }
  },
  privacySettings: {
    dataAnalytics: {
      type: Boolean,
      default: true
    },
    dataPersonalization: {
      type: Boolean,
      default: true
    },
    dataResearch: {
      type: Boolean,
      default: false
    },
    accountVisibility: {
      type: String,
      enum: ['private', 'advisors', 'public'],
      default: 'private'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Encrypt password using bcrypt
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  this.updatedAt = Date.now();
});

// Sign JWT and return
UserSchema.methods.getSignedJwtToken = function() {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
};

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);