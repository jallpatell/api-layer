import streamlit as st
import os
import pandas as pd
from utils.financial_data import get_market_summary, get_trending_stocks
from utils.visualization import plot_market_overview

# Set page configuration
st.set_page_config(
    page_title="InvestSmart AI Dashboard",
    page_icon="💹",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Initialize session state for user profile if it doesn't exist
if "user_profile" not in st.session_state:
    st.session_state.user_profile = {
        "name": "User",
        "investment_goals": "Retirement",
        "risk_profile": "Moderate",
        "investment_horizon": 10,
        "monthly_contribution": 500,
        "portfolio": {
            "stocks": {},
            "bonds": {},
            "cash": 0
        }
    }

# Sidebar for user profile and navigation
with st.sidebar:
    st.title("InvestSmart AI")
    st.subheader("Your Profile")
    
    # User profile editing
    with st.expander("Edit Profile", expanded=False):
        user_name = st.text_input("Name", value=st.session_state.user_profile["name"])
        investment_goals = st.selectbox(
            "Investment Goals",
            ["Retirement", "Education", "Home Purchase", "Wealth Building"],
            index=["Retirement", "Education", "Home Purchase", "Wealth Building"].index(st.session_state.user_profile["investment_goals"])
        )
        risk_profile = st.select_slider(
            "Risk Profile",
            options=["Conservative", "Moderately Conservative", "Moderate", "Moderately Aggressive", "Aggressive"],
            value=st.session_state.user_profile["risk_profile"]
        )
        investment_horizon = st.slider(
            "Investment Horizon (years)",
            min_value=1,
            max_value=40,
            value=st.session_state.user_profile["investment_horizon"]
        )
        monthly_contribution = st.number_input(
            "Monthly Contribution ($)",
            min_value=0,
            max_value=10000,
            value=st.session_state.user_profile["monthly_contribution"]
        )
        
        if st.button("Save Profile"):
            st.session_state.user_profile.update({
                "name": user_name,
                "investment_goals": investment_goals,
                "risk_profile": risk_profile,
                "investment_horizon": investment_horizon,
                "monthly_contribution": monthly_contribution
            })
            st.success("Profile updated successfully!")
    
    st.divider()
    
    # Navigation menu
    st.subheader("Navigation")
    st.write("📊 Dashboard")
    st.write("📈 [Portfolio](/Portfolio)")
    st.write("🧠 [Investment Advice](/Investment_Advice)")
    st.write("💵 [Tax Tools](/Tax_Tools)")
    st.write("📜 [Market Regulations](/Market_Regulations)")

# Main dashboard content
st.title(f"Welcome, {st.session_state.user_profile['name']}!")
st.subheader("Financial Dashboard")

# Dashboard metrics row
col1, col2, col3 = st.columns(3)

try:
    # Get market summary data
    market_data = get_market_summary()
    
    with col1:
        st.metric(
            label="S&P 500",
            value=f"${market_data['sp500']['price']:.2f}",
            delta=f"{market_data['sp500']['change']:.2f}%"
        )
    
    with col2:
        st.metric(
            label="NASDAQ",
            value=f"${market_data['nasdaq']['price']:.2f}",
            delta=f"{market_data['nasdaq']['change']:.2f}%"
        )
    
    with col3:
        st.metric(
            label="Dow Jones",
            value=f"${market_data['dow']['price']:.2f}",
            delta=f"{market_data['dow']['change']:.2f}%"
        )
except Exception as e:
    st.error(f"Error retrieving market data: {e}")
    
# Market overview section
st.subheader("Market Overview")
try:
    market_fig = plot_market_overview(market_data)
    st.plotly_chart(market_fig, use_container_width=True)
except Exception as e:
    st.error(f"Error displaying market overview: {e}")

# Trending stocks section
st.subheader("Trending Stocks")
try:
    trending_stocks = get_trending_stocks()
    if trending_stocks:
        # Convert to DataFrame for better display
        trending_df = pd.DataFrame(trending_stocks)
        
        # Color code the percent change
        def color_change(val):
            color = 'green' if val > 0 else 'red'
            return f'color: {color}'
        
        # Apply the styling
        styled_df = trending_df.style.applymap(
            color_change, 
            subset=['change_percent']
        ).format({
            'price': '${:.2f}',
            'change_percent': '{:.2f}%'
        })
        
        st.dataframe(styled_df, use_container_width=True)
    else:
        st.info("No trending stocks data available.")
except Exception as e:
    st.error(f"Error retrieving trending stocks: {e}")

# Portfolio summary
st.subheader("Your Portfolio Summary")

# Check if portfolio has any data
if not any(st.session_state.user_profile["portfolio"].values()):
    st.info(
        "You haven't added any investments to your portfolio yet. "
        "Go to the Portfolio page to add investments."
    )
else:
    # Display portfolio summary here (will be implemented in portfolio.py)
    st.write("Portfolio overview will appear here once you've added investments.")

st.divider()

# Quick tips section
with st.expander("Quick Investment Tips", expanded=True):
    st.markdown("""
    ### Today's Investment Tips:
    
    1. **Diversification**: Spread your investments across different asset classes
    2. **Dollar-Cost Averaging**: Invest a fixed amount regularly
    3. **Long-term Thinking**: Focus on long-term goals rather than short-term fluctuations
    4. **Tax-Advantaged Accounts**: Utilize retirement accounts for tax benefits
    5. **Emergency Fund**: Maintain 3-6 months of expenses in liquid assets
    """)

# Footer
st.caption("InvestSmart AI Dashboard - A personalized investment tool powered by AI")
st.caption("Data provided for informational purposes only. Not financial advice.")
