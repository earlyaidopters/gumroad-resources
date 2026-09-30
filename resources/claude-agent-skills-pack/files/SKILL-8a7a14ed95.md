---
name: revenue-forecaster-ml
description: Use machine learning (Prophet/Facebook's forecasting library) to predict future revenue, sales, or traffic from historical data. Generate forecasts with confidence intervals and visualizations. Use when user mentions forecasting, predictions, future revenue, time series analysis, or wants to predict trends.
---

# Revenue Forecaster with ML

## What This Skill Does

Uses Facebook's Prophet library to create accurate time series forecasts from historical data. Generates predictions with confidence intervals, trend analysis, and professional visualizations.

## When to Use

- User has historical revenue/sales/traffic data
- Wants predictions for future periods
- Mentions forecasting, trends, or predictions
- Needs data-driven planning for budgets/goals

## How It Works

```python
import pandas as pd
from prophet import Prophet
import matplotlib.pyplot as plt

# Load data
df = pd.read_csv('monthly_revenue.csv')
df.columns = ['ds', 'y']  # Prophet requires these column names
df['ds'] = pd.to_datetime(df['ds'])

# Create and fit model
model = Prophet(
    yearly_seasonality=True,
    weekly_seasonality=False,
    daily_seasonality=False,
    interval_width=0.95
)
model.fit(df)

# Make future dataframe (3 months ahead)
future = model.make_future_dataframe(periods=3, freq='M')
forecast = model.predict(future)

# Plot forecast
fig1 = model.plot(forecast)
plt.title('Revenue Forecast - Next 3 Months', fontsize=16)
plt.xlabel('Date')
plt.ylabel('Revenue ($)')
plt.savefig('forecast_plot.png', dpi=300, bbox_inches='tight')

# Plot components (trend, seasonality)
fig2 = model.plot_components(forecast)
plt.savefig('forecast_components.png', dpi=300, bbox_inches='tight')

# Save predictions to CSV
forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']].tail(3).to_csv('predictions.csv', index=False)

print(f"Forecast complete. Next 3 months:")
print(forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']].tail(3))
```

## Required Libraries

- prophet
- pandas
- matplotlib

## Example Usage

**Prompt**: "Predict my next quarter revenue based on the last 2 years of data"

**Output**: Forecast with confidence intervals, trend charts, predictions CSV

## Tips

- Needs minimum 2 months of historical data (12+ months recommended)
- Works for: revenue, sales, website traffic, user signups
- Automatically detects yearly patterns and trends
