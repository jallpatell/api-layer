import os
import json
from openai import OpenAI

# Get API key from environment
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
openai = OpenAI(api_key=OPENAI_API_KEY)

def get_investment_advice(user_profile, market_data=None, portfolio=None):
    """
    Get personalized investment advice based on user profile and market data
    
    Args:
        user_profile (dict): User's investment profile
        market_data (dict): Current market data
        portfolio (dict): User's current portfolio
        
    Returns:
        dict: Investment advice and recommendations
    """
    try:
        if not OPENAI_API_KEY:
            return {
                "error": "OpenAI API key not found. Please set the OPENAI_API_KEY environment variable."
            }
        
        # Construct the prompt
        prompt = f"""
        You are a financial advisor assistant. Provide personalized investment advice based on the following information:
        
        User Profile:
        - Investment Goals: {user_profile.get('investment_goals', 'Not specified')}
        - Risk Profile: {user_profile.get('risk_profile', 'Not specified')}
        - Investment Horizon: {user_profile.get('investment_horizon', 'Not specified')} years
        - Monthly Contribution: ${user_profile.get('monthly_contribution', 0)}
        
        """
        
        # Add portfolio information if available
        if portfolio:
            prompt += f"""
            Current Portfolio:
            {json.dumps(portfolio, indent=2)}
            """
        
        # Add market data if available
        if market_data:
            prompt += f"""
            Current Market Data:
            {json.dumps(market_data, indent=2)}
            """
            
        prompt += """
        Please provide detailed investment advice in JSON format with the following structure:
        {
            "summary": "Brief summary of advice",
            "strategy": "Overall investment strategy recommendation",
            "allocation": {
                "stocks": "Recommended percentage and strategy",
                "bonds": "Recommended percentage and strategy",
                "cash": "Recommended percentage"
            },
            "specific_recommendations": [
                {
                    "type": "stock/bond/etc",
                    "ticker": "If applicable",
                    "name": "Name of investment",
                    "rationale": "Why this is recommended"
                }
            ],
            "general_advice": ["Several bullet points of general advice"]
        }
        """
        
        # the newest OpenAI model is "gpt-4o" which was released May 13, 2024.
        # do not change this unless explicitly requested by the user
        response = openai.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.5,
        )
        
        # Parse the response
        advice = json.loads(response.choices[0].message.content)
        return advice
        
    except Exception as e:
        return {
            "error": f"Failed to get investment advice: {str(e)}"
        }

def analyze_stock(ticker, stock_data=None):
    """
    Analyze a specific stock and provide insights
    
    Args:
        ticker (str): Stock ticker symbol
        stock_data (dict): Data about the stock
        
    Returns:
        dict: Analysis and recommendations
    """
    try:
        if not OPENAI_API_KEY:
            return {
                "error": "OpenAI API key not found. Please set the OPENAI_API_KEY environment variable."
            }
        
        prompt = f"""
        You are a financial analyst. Provide a detailed analysis of {ticker} stock based on the following data:
        
        {json.dumps(stock_data, indent=2) if stock_data else f"The ticker symbol {ticker}"}
        
        Please provide your analysis in JSON format with the following structure:
        {{
            "summary": "Brief summary of analysis",
            "strengths": ["List of strengths"],
            "weaknesses": ["List of weaknesses"],
            "opportunities": ["List of opportunities"],
            "threats": ["List of threats"],
            "recommendation": "Buy/Sell/Hold recommendation",
            "recommendation_rationale": "Explanation for the recommendation",
            "risk_level": "Low/Medium/High",
            "price_target": {"low": number, "medium": number, "high": number},
            "confidence_score": number (0-1)
        }}
        """
        
        # the newest OpenAI model is "gpt-4o" which was released May 13, 2024.
        # do not change this unless explicitly requested by the user
        response = openai.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.5,
        )
        
        # Parse the response
        analysis = json.loads(response.choices[0].message.content)
        return analysis
        
    except Exception as e:
        return {
            "error": f"Failed to analyze stock: {str(e)}"
        }

def get_tax_advice(portfolio_data, user_profile=None):
    """
    Get tax advice based on portfolio and user profile
    
    Args:
        portfolio_data (dict): Data about user's portfolio
        user_profile (dict): User's investment profile
        
    Returns:
        dict: Tax insights and recommendations
    """
    try:
        if not OPENAI_API_KEY:
            return {
                "error": "OpenAI API key not found. Please set the OPENAI_API_KEY environment variable."
            }
        
        prompt = f"""
        You are a tax advisor for investors. Provide tax insights and recommendations based on the following information:
        
        Portfolio Data:
        {json.dumps(portfolio_data, indent=2)}
        """
        
        if user_profile:
            prompt += f"""
            User Profile:
            {json.dumps(user_profile, indent=2)}
            """
            
        prompt += """
        Please provide your tax advice in JSON format with the following structure:
        {
            "summary": "Brief summary of tax implications",
            "tax_optimization_strategies": [
                {
                    "strategy": "Name of strategy",
                    "description": "Description of strategy",
                    "estimated_benefit": "Estimated tax savings or benefit"
                }
            ],
            "tax_considerations": ["List of tax considerations"],
            "general_recommendations": ["List of general tax recommendations"]
        }
        """
        
        # the newest OpenAI model is "gpt-4o" which was released May 13, 2024.
        # do not change this unless explicitly requested by the user
        response = openai.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.5,
        )
        
        # Parse the response
        advice = json.loads(response.choices[0].message.content)
        return advice
        
    except Exception as e:
        return {
            "error": f"Failed to get tax advice: {str(e)}"
        }

def explain_regulation(regulation_name=None, regulation_text=None):
    """
    Explain financial regulations in simple terms
    
    Args:
        regulation_name (str): Name of the regulation
        regulation_text (str): Text of the regulation
        
    Returns:
        dict: Simplified explanation of the regulation
    """
    try:
        if not OPENAI_API_KEY:
            return {
                "error": "OpenAI API key not found. Please set the OPENAI_API_KEY environment variable."
            }
        
        prompt = "You are a financial regulations expert. Explain the following regulation in simple terms an average retail investor can understand:\n\n"
        
        if regulation_name and regulation_text:
            prompt += f"Regulation: {regulation_name}\n\n{regulation_text}"
        elif regulation_name:
            prompt += f"Please explain the {regulation_name} regulation."
        else:
            prompt += "Please provide a general overview of key financial regulations that retail investors should be aware of."
            
        prompt += """
        
        Please provide your explanation in JSON format with the following structure:
        {
            "title": "Title of the regulation",
            "simple_explanation": "Simple explanation in 2-3 sentences",
            "key_points": ["List of key points"],
            "investor_implications": ["How this affects investors"],
            "compliance_requirements": ["What investors need to do to comply"],
            "common_misconceptions": ["Common misconceptions about this regulation"]
        }
        """
        
        # the newest OpenAI model is "gpt-4o" which was released May 13, 2024.
        # do not change this unless explicitly requested by the user
        response = openai.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.5,
        )
        
        # Parse the response
        explanation = json.loads(response.choices[0].message.content)
        return explanation
        
    except Exception as e:
        return {
            "error": f"Failed to explain regulation: {str(e)}"
        }
