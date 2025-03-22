def calculate_capital_gains(purchase_price, current_price, quantity, holding_period_days):
    """
    Calculate capital gains tax for an investment
    
    Args:
        purchase_price (float): Original purchase price per share
        current_price (float): Current price per share
        quantity (float): Number of shares
        holding_period_days (int): Days the investment has been held
        
    Returns:
        dict: Capital gains tax information
    """
    # Calculate gain or loss
    initial_investment = purchase_price * quantity
    current_value = current_price * quantity
    total_gain_loss = current_value - initial_investment
    
    # Determine if long-term or short-term
    is_long_term = holding_period_days >= 365
    
    # Tax rates (simplified for demonstration)
    # These would need to be adjusted based on actual tax brackets
    short_term_rate = 0.24  # Approximate for middle income
    long_term_rates = {
        "rate_0": 0.0,    # 0% bracket
        "rate_15": 0.15,  # 15% bracket
        "rate_20": 0.20   # 20% bracket
    }
    
    # For demonstration, we'll use the 15% rate for long-term
    long_term_rate = long_term_rates["rate_15"]
    
    # Calculate estimated tax
    if is_long_term:
        tax_rate = long_term_rate
        tax_type = "Long-term Capital Gains"
    else:
        tax_rate = short_term_rate
        tax_type = "Short-term Capital Gains"
    
    estimated_tax = max(0, total_gain_loss * tax_rate)
    
    return {
        "initial_investment": initial_investment,
        "current_value": current_value,
        "total_gain_loss": total_gain_loss,
        "is_long_term": is_long_term,
        "tax_type": tax_type,
        "tax_rate": tax_rate * 100,  # Convert to percentage
        "estimated_tax": estimated_tax,
        "net_after_tax": current_value - estimated_tax if total_gain_loss > 0 else current_value
    }

def estimate_dividend_tax(annual_dividends, income_bracket):
    """
    Estimate tax on dividend income
    
    Args:
        annual_dividends (float): Total annual dividend income
        income_bracket (str): Income tax bracket
        
    Returns:
        dict: Dividend tax information
    """
    # Tax rates for qualified dividends by income bracket (simplified)
    qualified_dividend_rates = {
        "low": 0.0,      # 0% bracket
        "medium": 0.15,  # 15% bracket
        "high": 0.20     # 20% bracket
    }
    
    # Tax rates for non-qualified dividends - taxed as ordinary income
    ordinary_income_rates = {
        "low": 0.10,     # 10% bracket
        "medium": 0.22,  # 22% bracket
        "high": 0.35     # 35% bracket
    }
    
    # Assumption: 70% of dividends are qualified
    qualified_portion = annual_dividends * 0.7
    non_qualified_portion = annual_dividends * 0.3
    
    # Calculate taxes
    qualified_tax = qualified_portion * qualified_dividend_rates.get(income_bracket, 0.15)
    non_qualified_tax = non_qualified_portion * ordinary_income_rates.get(income_bracket, 0.22)
    
    total_tax = qualified_tax + non_qualified_tax
    effective_rate = (total_tax / annual_dividends) * 100 if annual_dividends > 0 else 0
    
    return {
        "annual_dividends": annual_dividends,
        "qualified_dividends": qualified_portion,
        "non_qualified_dividends": non_qualified_portion,
        "qualified_tax": qualified_tax,
        "non_qualified_tax": non_qualified_tax,
        "total_tax": total_tax,
        "effective_rate": effective_rate,
        "net_dividends": annual_dividends - total_tax
    }

def tax_loss_harvesting_opportunities(portfolio):
    """
    Identify tax loss harvesting opportunities in a portfolio
    
    Args:
        portfolio (dict): Portfolio with purchase history
        
    Returns:
        list: List of tax loss harvesting opportunities
    """
    opportunities = []
    
    for ticker, position in portfolio.get("stocks", {}).items():
        if not isinstance(position, dict):
            # Skip if not structured with purchase info
            continue
            
        purchase_price = position.get("purchase_price", 0)
        current_price = position.get("current_price", 0)
        quantity = position.get("quantity", 0)
        
        # Calculate unrealized loss
        unrealized_loss = (current_price - purchase_price) * quantity
        
        # If there's a significant loss, it's a harvesting opportunity
        if unrealized_loss < -100:  # At least $100 loss to be worthwhile
            opportunities.append({
                "ticker": ticker,
                "current_price": current_price,
                "purchase_price": purchase_price,
                "quantity": quantity,
                "unrealized_loss": unrealized_loss,
                "tax_benefit_estimate": abs(unrealized_loss) * 0.24  # Estimated at 24% tax rate
            })
    
    # Sort by tax benefit (highest first)
    return sorted(opportunities, key=lambda x: x["tax_benefit_estimate"], reverse=True)

def retirement_account_benefits(annual_contribution, account_type, current_tax_bracket, retirement_tax_bracket, years_to_retirement):
    """
    Calculate benefits of different retirement accounts
    
    Args:
        annual_contribution (float): Annual contribution to retirement account
        account_type (str): Type of account (Traditional, Roth, Taxable)
        current_tax_bracket (float): Current tax bracket (as decimal)
        retirement_tax_bracket (float): Expected tax bracket in retirement (as decimal)
        years_to_retirement (int): Years until retirement
        
    Returns:
        dict: Retirement account benefits information
    """
    # Assume 7% annual return
    annual_return = 0.07
    
    # Calculate future value with compound interest
    future_value = annual_contribution * (((1 + annual_return) ** years_to_retirement - 1) / annual_return)
    
    # Calculate tax implications
    if account_type == "Traditional":
        # Tax deduction now, taxed on withdrawal
        current_tax_savings = annual_contribution * current_tax_bracket * years_to_retirement
        taxes_at_withdrawal = future_value * retirement_tax_bracket
        net_retirement_value = future_value - taxes_at_withdrawal
    elif account_type == "Roth":
        # No tax deduction now, no tax on withdrawal
        current_tax_savings = 0
        taxes_at_withdrawal = 0
        net_retirement_value = future_value
    else:  # Taxable
        # No tax deduction, taxed on gains annually (approximated)
        current_tax_savings = 0
        
        # Simplified: assume 70% of returns taxed at capital gains rate (15%)
        # and 30% tax-deferred until withdrawal
        tax_drag = annual_return * 0.7 * 0.15
        effective_return = annual_return - tax_drag
        
        future_value = annual_contribution * (((1 + effective_return) ** years_to_retirement - 1) / effective_return)
        taxes_at_withdrawal = (future_value - (annual_contribution * years_to_retirement)) * 0.15
        net_retirement_value = future_value - taxes_at_withdrawal
    
    return {
        "account_type": account_type,
        "annual_contribution": annual_contribution,
        "years_to_retirement": years_to_retirement,
        "gross_future_value": future_value,
        "current_tax_savings": current_tax_savings,
        "taxes_at_withdrawal": taxes_at_withdrawal,
        "net_retirement_value": net_retirement_value
    }
