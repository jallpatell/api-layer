import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

def plot_market_overview(market_data):
    """
    Create a market overview visualization with major indices
    
    Args:
        market_data (dict): Dictionary containing market summary data
        
    Returns:
        go.Figure: Plotly figure object
    """
    # Create figure with secondary y-axis
    fig = make_subplots(specs=[[{"secondary_y": True}]])
    
    # Add traces for each index
    for index_name, data in market_data.items():
        if not data.get('history', pd.DataFrame()).empty:
            history = data['history']
            # Convert the index to a list for plotting
            dates = history.index.tolist()
            prices = history['Close'].tolist()
            
            display_name = {
                'sp500': 'S&P 500',
                'nasdaq': 'NASDAQ',
                'dow': 'Dow Jones'
            }.get(index_name, index_name)
            
            fig.add_trace(
                go.Scatter(
                    x=dates,
                    y=prices,
                    name=display_name,
                    mode='lines',
                ),
                secondary_y=False,
            )
    
    # Add titles and labels
    fig.update_layout(
        title_text="Market Indices - Past Month",
        title_x=0.5,
        height=400,
        margin=dict(l=20, r=20, t=40, b=20),
        legend=dict(
            orientation="h",
            yanchor="top",
            y=1.02,
            xanchor="center",
            x=0.5
        ),
        hovermode="x unified"
    )
    
    # Update axes
    fig.update_xaxes(title_text="Date")
    fig.update_yaxes(title_text="Price ($)", secondary_y=False)
    
    return fig

def plot_portfolio_allocation(portfolio_data):
    """
    Create a pie chart showing portfolio allocation
    
    Args:
        portfolio_data (dict): Dictionary containing portfolio data
        
    Returns:
        go.Figure: Plotly figure object
    """
    # Extract data
    labels = []
    values = []
    
    for item in portfolio_data.get('items', []):
        labels.append(f"{item['ticker']} - {item['name']}")
        values.append(item['value'])
    
    # Create pie chart
    fig = go.Figure(data=[go.Pie(
        labels=labels,
        values=values,
        hole=.4,
        textinfo='percent+label',
        insidetextorientation='radial'
    )])
    
    # Update layout
    fig.update_layout(
        title_text="Portfolio Allocation",
        title_x=0.5,
        height=400,
        margin=dict(l=10, r=10, t=40, b=10)
    )
    
    return fig

def plot_portfolio_performance(portfolio_history):
    """
    Create a line chart showing portfolio performance over time
    
    Args:
        portfolio_history (list): List of portfolio values over time
        
    Returns:
        go.Figure: Plotly figure object
    """
    # Convert data to dataframe
    df = pd.DataFrame(portfolio_history)
    
    # Create figure
    fig = go.Figure()
    
    # Add portfolio value trace
    fig.add_trace(go.Scatter(
        x=df['date'],
        y=df['value'],
        mode='lines',
        name='Portfolio Value',
        line=dict(color='royalblue', width=2)
    ))
    
    # Add benchmark trace if available
    if 'benchmark_value' in df.columns:
        fig.add_trace(go.Scatter(
            x=df['date'],
            y=df['benchmark_value'],
            mode='lines',
            name='S&P 500',
            line=dict(color='green', width=2, dash='dash')
        ))
    
    # Update layout
    fig.update_layout(
        title_text="Portfolio Performance",
        title_x=0.5,
        height=400,
        margin=dict(l=20, r=20, t=40, b=20),
        legend=dict(
            orientation="h",
            yanchor="top",
            y=1.02,
            xanchor="right",
            x=1
        ),
        hovermode="x unified"
    )
    
    # Update axes
    fig.update_xaxes(title_text="Date")
    fig.update_yaxes(title_text="Value ($)")
    
    return fig

def plot_stock_forecast(forecast_data):
    """
    Create a visualization of stock forecast
    
    Args:
        forecast_data (dict): Stock forecast data
        
    Returns:
        go.Figure: Plotly figure object
    """
    # Extract data
    ticker = forecast_data.get('ticker', '')
    dates = forecast_data.get('forecast_dates', [])
    mean_forecast = forecast_data.get('mean_forecast', [])
    upper_bound = forecast_data.get('upper_bound', [])
    lower_bound = forecast_data.get('lower_bound', [])
    last_price = forecast_data.get('last_price', 0)
    
    # Create figure
    fig = go.Figure()
    
    # Add historical point
    historical_date = dates[0] - timedelta(days=1)
    fig.add_trace(go.Scatter(
        x=[historical_date],
        y=[last_price],
        mode='markers',
        name='Last Close',
        marker=dict(color='blue', size=8)
    ))
    
    # Add mean forecast
    fig.add_trace(go.Scatter(
        x=dates,
        y=mean_forecast,
        mode='lines',
        name='Mean Forecast',
        line=dict(color='blue', width=2)
    ))
    
    # Add confidence interval
    fig.add_trace(go.Scatter(
        x=dates.tolist() + dates.tolist()[::-1],
        y=upper_bound.tolist() + lower_bound.tolist()[::-1],
        fill='toself',
        fillcolor='rgba(0,100,255,0.2)',
        line=dict(color='rgba(255,255,255,0)'),
        name='95% Confidence Interval'
    ))
    
    # Update layout
    fig.update_layout(
        title_text=f"{ticker} Price Forecast (30 Days)",
        title_x=0.5,
        height=400,
        margin=dict(l=20, r=20, t=40, b=20),
        legend=dict(
            orientation="h",
            yanchor="top",
            y=1.02,
            xanchor="right",
            x=1
        ),
        hovermode="x unified"
    )
    
    # Update axes
    fig.update_xaxes(title_text="Date")
    fig.update_yaxes(title_text="Price ($)")
    
    return fig

def plot_tax_comparison(tax_data):
    """
    Create a bar chart comparing tax implications
    
    Args:
        tax_data (dict): Dictionary containing tax data for different scenarios
        
    Returns:
        go.Figure: Plotly figure object
    """
    # Extract data
    categories = []
    pre_tax = []
    taxes = []
    post_tax = []
    
    for category, data in tax_data.items():
        categories.append(category)
        pre_tax.append(data.get('pre_tax_value', 0))
        taxes.append(data.get('tax_amount', 0))
        post_tax.append(data.get('post_tax_value', 0))
    
    # Create figure
    fig = go.Figure(data=[
        go.Bar(name='Pre-Tax Value', x=categories, y=pre_tax),
        go.Bar(name='Taxes', x=categories, y=taxes),
        go.Bar(name='Post-Tax Value', x=categories, y=post_tax)
    ])
    
    # Update layout
    fig.update_layout(
        title_text="Tax Comparison",
        title_x=0.5,
        height=400,
        margin=dict(l=20, r=20, t=40, b=20),
        legend=dict(
            orientation="h",
            yanchor="top",
            y=1.02,
            xanchor="center",
            x=0.5
        ),
        barmode='group'
    )
    
    # Update axes
    fig.update_xaxes(title_text="Category")
    fig.update_yaxes(title_text="Value ($)")
    
    return fig

def plot_retirement_comparison(retirement_data):
    """
    Create a comparison of different retirement account strategies
    
    Args:
        retirement_data (list): List of dictionaries with retirement account data
        
    Returns:
        go.Figure: Plotly figure object
    """
    # Extract data
    account_types = []
    gross_values = []
    tax_savings = []
    taxes_at_withdrawal = []
    net_values = []
    
    for data in retirement_data:
        account_types.append(data.get('account_type', ''))
        gross_values.append(data.get('gross_future_value', 0))
        tax_savings.append(data.get('current_tax_savings', 0))
        taxes_at_withdrawal.append(data.get('taxes_at_withdrawal', 0))
        net_values.append(data.get('net_retirement_value', 0))
    
    # Create subplots
    fig = make_subplots(
        rows=1, 
        cols=2,
        subplot_titles=("Future Value Comparison", "Tax Implications"),
        specs=[[{"type": "bar"}, {"type": "bar"}]]
    )
    
    # Add traces for future value comparison
    fig.add_trace(
        go.Bar(
            x=account_types,
            y=gross_values,
            name='Gross Future Value',
            marker_color='lightskyblue'
        ),
        row=1, col=1
    )
    
    fig.add_trace(
        go.Bar(
            x=account_types,
            y=net_values,
            name='Net After Tax',
            marker_color='royalblue'
        ),
        row=1, col=1
    )
    
    # Add traces for tax implications
    fig.add_trace(
        go.Bar(
            x=account_types,
            y=tax_savings,
            name='Current Tax Savings',
            marker_color='lightgreen'
        ),
        row=1, col=2
    )
    
    fig.add_trace(
        go.Bar(
            x=account_types,
            y=taxes_at_withdrawal,
            name='Taxes at Withdrawal',
            marker_color='salmon'
        ),
        row=1, col=2
    )
    
    # Update layout
    fig.update_layout(
        title_text="Retirement Account Comparison",
        title_x=0.5,
        height=400,
        margin=dict(l=20, r=20, t=60, b=20),
        legend=dict(
            orientation="h",
            yanchor="top",
            y=1.1,
            xanchor="center",
            x=0.5
        )
    )
    
    # Update axes
    fig.update_yaxes(title_text="Value ($)")
    
    return fig
