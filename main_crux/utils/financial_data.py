import yfinance as yf
import pandas as pd
import time
import datetime
import numpy as np
from datetime import timedelta

def get_stock_data(ticker, period="1y", interval="1d"):
    """
    Retrieves historical stock data for the specified ticker.
    
    Args:
        ticker (str): Stock ticker symbol
        period (str): Time period (e.g., '1d', '1mo', '1y')
        interval (str): Time interval (e.g., '1d', '1h', '15m')
        
    Returns:
        pd.DataFrame: DataFrame containing stock data
    """
    try:
        stock = yf.Ticker(ticker)
        data = stock.history(period=period, interval=interval)
        return data
    except Exception as e:
        print(f"Error retrieving data for {ticker}: {e}")
        return pd.DataFrame()

def get_stock_info(ticker):
    """
    Retrieves detailed information about a stock.
    
    Args:
        ticker (str): Stock ticker symbol
        
    Returns:
        dict: Dictionary containing stock information
    """
    try:
        stock = yf.Ticker(ticker)
        info = stock.info
        return info
    except Exception as e:
        print(f"Error retrieving info for {ticker}: {e}")
        return {}

def get_market_summary():
    """
    Retrieves summary of major market indices.
    
    Returns:
        dict: Dictionary containing market summary data
    """
    indices = {
        "sp500": "^GSPC",
        "nasdaq": "^IXIC",
        "dow": "^DJI"
    }
    
    result = {}
    
    for index_name, ticker in indices.items():
        try:
            stock = yf.Ticker(ticker)
            data = stock.history(period="2d")
            
            if len(data) < 2:
                # If we don't have 2 days of data, calculate change differently
                current_price = data['Close'].iloc[-1]
                previous_price = data['Open'].iloc[-1]
            else:
                current_price = data['Close'].iloc[-1]
                previous_price = data['Close'].iloc[-2]
            
            change_pct = ((current_price - previous_price) / previous_price) * 100
            
            result[index_name] = {
                "price": current_price,
                "change": change_pct,
                "history": data
            }
        except Exception as e:
            print(f"Error retrieving data for {index_name}: {e}")
            # Provide some fallback data to prevent dashboard errors
            result[index_name] = {
                "price": 0.0,
                "change": 0.0,
                "history": pd.DataFrame()
            }
    
    return result

def get_trending_stocks(count=10):
    """
    Retrieves trending stocks based on volume and price movement.
    
    Args:
        count (int): Number of trending stocks to return
        
    Returns:
        list: List of dictionaries containing trending stock data
    """
    try:
        # List of popular stocks to check
        popular_tickers = [
            "AAPL", "MSFT", "AMZN", "GOOGL", "META", 
            "TSLA", "NVDA", "JPM", "V", "PG",
            "DIS", "NFLX", "PYPL", "INTC", "AMD"
        ]
        
        results = []
        
        for ticker in popular_tickers:
            stock = yf.Ticker(ticker)
            data = stock.history(period="2d")
            
            if data.empty:
                continue
                
            if len(data) < 2:
                # If we don't have 2 days of data, calculate change differently
                current_price = data['Close'].iloc[-1]
                previous_price = data['Open'].iloc[-1]
            else:
                current_price = data['Close'].iloc[-1]
                previous_price = data['Close'].iloc[-2]
            
            change_pct = ((current_price - previous_price) / previous_price) * 100
            
            # Get some basic information
            info = stock.info
            
            results.append({
                "ticker": ticker,
                "name": info.get("shortName", ticker),
                "price": current_price,
                "change_percent": change_pct,
                "volume": data['Volume'].iloc[-1]
            })
        
        # Sort by absolute change percentage to find trending stocks
        results = sorted(results, key=lambda x: abs(x["change_percent"]), reverse=True)
        return results[:count]
        
    except Exception as e:
        print(f"Error retrieving trending stocks: {e}")
        return []

def get_stock_forecast(ticker, days=30):
    """
    Creates a simple forecast for a stock based on historical volatility.
    This is a very simplified model for demonstration purposes.
    
    Args:
        ticker (str): Stock ticker symbol
        days (int): Number of days to forecast
        
    Returns:
        dict: Dictionary containing forecast data
    """
    try:
        # Get historical data
        stock = yf.Ticker(ticker)
        data = stock.history(period="1y")
        
        if data.empty:
            return {"error": "No data available for this stock"}
        
        # Calculate log returns
        data['returns'] = np.log(data['Close'] / data['Close'].shift(1))
        
        # Calculate mean and standard deviation of returns
        mu = data['returns'].mean()
        sigma = data['returns'].std()
        
        # Generate forecast
        last_price = data['Close'].iloc[-1]
        forecast_days = pd.date_range(
            start=data.index[-1] + timedelta(days=1),
            periods=days,
            freq='B'  # Business days
        )
        
        # Monte Carlo simulation
        num_simulations = 100
        simulations = []
        
        for i in range(num_simulations):
            prices = [last_price]
            for j in range(days):
                # Generate random returns based on historical volatility
                random_return = np.random.normal(mu, sigma)
                next_price = prices[-1] * np.exp(random_return)
                prices.append(next_price)
            
            simulations.append(prices[1:])  # Skip the initial price
        
        # Convert to numpy array for easier calculations
        sim_array = np.array(simulations)
        
        # Calculate statistics
        mean_forecast = np.mean(sim_array, axis=0)
        upper_bound = np.percentile(sim_array, 95, axis=0)
        lower_bound = np.percentile(sim_array, 5, axis=0)
        
        return {
            "ticker": ticker,
            "last_price": last_price,
            "forecast_dates": forecast_days,
            "mean_forecast": mean_forecast,
            "upper_bound": upper_bound,
            "lower_bound": lower_bound
        }
        
    except Exception as e:
        print(f"Error generating forecast for {ticker}: {e}")
        return {"error": str(e)}

def calculate_portfolio_value(portfolio):
    """
    Calculates the current value of a portfolio.
    
    Args:
        portfolio (dict): Portfolio containing stocks and quantities
        
    Returns:
        dict: Dictionary containing portfolio valuation data
    """
    try:
        total_value = 0
        portfolio_data = []
        
        # Process stocks
        for ticker, shares in portfolio.get("stocks", {}).items():
            stock = yf.Ticker(ticker)
            data = stock.history(period="2d")
            
            if data.empty:
                continue
                
            current_price = data['Close'].iloc[-1]
            value = current_price * shares
            
            # Get change percentage
            if len(data) < 2:
                previous_price = data['Open'].iloc[-1]
            else:
                previous_price = data['Close'].iloc[-2]
                
            change_pct = ((current_price - previous_price) / previous_price) * 100
            
            info = stock.info
            
            portfolio_data.append({
                "ticker": ticker,
                "name": info.get("shortName", ticker),
                "shares": shares,
                "price": current_price,
                "value": value,
                "change_percent": change_pct,
                "type": "stock"
            })
            
            total_value += value
        
        # Process bonds (simplified)
        for bond_id, bond_info in portfolio.get("bonds", {}).items():
            value = bond_info.get("face_value", 0) * bond_info.get("quantity", 0)
            portfolio_data.append({
                "ticker": bond_id,
                "name": bond_info.get("name", bond_id),
                "shares": bond_info.get("quantity", 0),
                "price": bond_info.get("face_value", 0),
                "value": value,
                "change_percent": 0,  # Simplified
                "type": "bond"
            })
            
            total_value += value
        
        # Add cash
        cash_value = portfolio.get("cash", 0)
        if cash_value > 0:
            portfolio_data.append({
                "ticker": "CASH",
                "name": "Cash",
                "shares": 1,
                "price": cash_value,
                "value": cash_value,
                "change_percent": 0,
                "type": "cash"
            })
            
            total_value += cash_value
        
        # Calculate allocation percentages
        for item in portfolio_data:
            item["allocation"] = (item["value"] / total_value * 100) if total_value > 0 else 0
        
        return {
            "total_value": total_value,
            "items": portfolio_data
        }
        
    except Exception as e:
        print(f"Error calculating portfolio value: {e}")
        return {
            "total_value": 0,
            "items": [],
            "error": str(e)
        }
