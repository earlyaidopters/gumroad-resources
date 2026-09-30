---
name: sales-pipeline-analyzer
description: Analyze sales pipeline data to identify conversion bottlenecks, win rates by source, forecast revenue, and optimize sales processes. Use when user mentions sales pipeline, CRM data, lead conversion, sales funnel, or wants to analyze deal flow.
---

# Sales Pipeline Health Analyzer

Analyzes CRM/sales pipeline data to diagnose health and optimize conversion.

```python
import pandas as pd
import matplotlib.pyplot as plt
from openpyxl import Workbook
from openpyxl.chart import BarChart, Reference

df = pd.read_csv('sales_pipeline.csv')
df['close_date'] = pd.to_datetime(df['close_date'])
df['days_in_pipeline'] = (df['close_date'] - pd.to_datetime(df['created_date'])).dt.days

# Conversion rates by stage
stage_counts = df['stage'].value_counts()
total_leads = len(df)
conversion_funnel = {
    'Lead': total_leads,
    'Qualified': len(df[df['stage'].isin(['Qualified', 'Proposal', 'Negotiation', 'Closed Won'])]),
    'Proposal': len(df[df['stage'].isin(['Proposal', 'Negotiation', 'Closed Won'])]),
    'Negotiation': len(df[df['stage'].isin(['Negotiation', 'Closed Won'])]),
    'Closed Won': len(df[df['stage'] == 'Closed Won'])
}

# Win rate by source
source_performance = df.groupby('lead_source').agg({
    'deal_value': ['sum', 'mean', 'count'],
    'stage': lambda x: (x == 'Closed Won').sum()
}).round(2)
source_performance['win_rate'] = (source_performance[('stage', '<lambda>')] / source_performance[('deal_value', 'count')] * 100).round(1)

# Visualizations
fig, axes = plt.subplots(2, 2, figsize=(14, 10))

# Conversion funnel
stages = list(conversion_funnel.keys())
counts = list(conversion_funnel.values())
axes[0,0].barh(stages, counts, color=['#3498db', '#2ecc71', '#f39c12', '#e74c3c', '#27ae60'])
axes[0,0].set_title('Sales Funnel Conversion', fontsize=14)
axes[0,0].set_xlabel('Number of Deals')
for i, (stage, count) in enumerate(conversion_funnel.items()):
    if i > 0:
        prev_count = list(conversion_funnel.values())[i-1]
        conversion_rate = (count / prev_count * 100) if prev_count > 0 else 0
        axes[0,0].text(count, i, f'  {conversion_rate:.0f}%', va='center')

# Win rate by source
top_sources = source_performance.nlargest(5, 'win_rate')
axes[0,1].barh(top_sources.index, top_sources['win_rate'], color='steelblue')
axes[0,1].set_title('Win Rate by Lead Source', fontsize=14)
axes[0,1].set_xlabel('Win Rate (%)')

# Deal value distribution
axes[1,0].hist(df['deal_value'], bins=20, color='coral', edgecolor='black')
axes[1,0].set_title('Deal Value Distribution', fontsize=14)
axes[1,0].set_xlabel('Deal Value ($)')

# Days in pipeline
closed_won = df[df['stage'] == 'Closed Won']
axes[1,1].hist(closed_won['days_in_pipeline'], bins=15, color='mediumseagreen', edgecolor='black')
axes[1,1].set_title('Sales Cycle Length (Won Deals)', fontsize=14)
axes[1,1].set_xlabel('Days in Pipeline')

plt.tight_layout()
plt.savefig('pipeline_analysis.png', dpi=300)

# Create Excel report
wb = Workbook()
ws = wb.active
ws.title = "Pipeline Health"
ws['A1'] = 'Total Pipeline Value'
ws['B1'] = df['deal_value'].sum()
ws['A2'] = 'Average Deal Size'
ws['B2'] = df['deal_value'].mean()
ws['A3'] = 'Overall Win Rate'
ws['B3'] = f"{(len(df[df['stage'] == 'Closed Won']) / total_leads * 100):.1f}%"
ws['A4'] = 'Avg Sales Cycle'
ws['B4'] = f"{closed_won['days_in_pipeline'].mean():.0f} days"

wb.save('pipeline_report.xlsx')
print(f"Pipeline health: {(len(df[df['stage'] == 'Closed Won']) / total_leads * 100):.1f}% win rate")
```

## Required: pandas, matplotlib, openpyxl

## Example
**Prompt**: "Which lead sources convert best?"
**Output**: Conversion funnel, win rates, cycle length analysis
