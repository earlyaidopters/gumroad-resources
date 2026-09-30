---
name: csv-to-slides-automator
description: Convert any tabular data (CSV, Excel) into presentation-ready PowerPoint slides with charts and tables. Perfect for quarterly reports, data presentations, and executive summaries. Use when user wants to create slides from data, present metrics, or turn spreadsheets into PowerPoint.
---

# CSV to Slides Automator

Automatically converts data into professional PowerPoint presentations with charts.

```python
import pandas as pd
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.chart.data import CategoryChartData
from pptx.enum.chart import XL_CHART_TYPE
from pptx.dml.color import RGBColor

df = pd.read_csv('quarterly_metrics.csv')

prs = Presentation()
prs.slide_width = Inches(10)
prs.slide_height = Inches(7.5)

# Title Slide
slide = prs.slides.add_slide(prs.slide_layouts[0])
title = slide.shapes.title
subtitle = slide.placeholders[1]
title.text = "Q1-Q4 Performance Report"
subtitle.text = "Quarterly Metrics Overview"

# Data Summary Slide
slide = prs.slides.add_slide(prs.slide_layouts[5])
title = slide.shapes.title
title.text = "Key Metrics Summary"

# Add table
rows, cols = df.shape[0] + 1, df.shape[1]
left = Inches(1)
top = Inches(2)
width = Inches(8)
height = Inches(4)

table = slide.shapes.add_table(rows, cols, left, top, width, height).table

# Headers
for col_idx, col_name in enumerate(df.columns):
    cell = table.cell(0, col_idx)
    cell.text = col_name
    cell.fill.solid()
    cell.fill.fore_color.rgb = RGBColor(31, 71, 136)
    cell.text_frame.paragraphs[0].font.color.rgb = RGBColor(255, 255, 255)
    cell.text_frame.paragraphs[0].font.bold = True

# Data rows
for row_idx, row_data in df.iterrows():
    for col_idx, value in enumerate(row_data):
        table.cell(row_idx + 1, col_idx).text = str(value)

# Chart Slide - Revenue Trend
slide = prs.slides.add_slide(prs.slide_layouts[5])
title = slide.shapes.title
title.text = "Revenue Trend"

chart_data = CategoryChartData()
chart_data.categories = df['Quarter'].tolist()
chart_data.add_series('Revenue', df['Revenue'].tolist())

x, y, cx, cy = Inches(1), Inches(2), Inches(8), Inches(5)
chart = slide.shapes.add_chart(
    XL_CHART_TYPE.LINE, x, y, cx, cy, chart_data
).chart

chart.has_legend = True
chart.legend.position = XL_LEGEND_POSITION.BOTTOM

# Chart Slide - Users Growth
slide = prs.slides.add_slide(prs.slide_layouts[5])
title = slide.shapes.title
title.text = "User Growth"

chart_data = CategoryChartData()
chart_data.categories = df['Quarter'].tolist()
chart_data.add_series('Active Users', df['Active_Users'].tolist())

chart = slide.shapes.add_chart(
    XL_CHART_TYPE.COLUMN_CLUSTERED, x, y, cx, cy, chart_data
).chart

prs.save('data_presentation.pptx')
print("Presentation created with data table and charts!")
```

## Required: pandas, python-pptx

## Example
**Prompt**: "Turn this quarterly data into slides for Monday's meeting"
**Output**: PowerPoint with data tables and auto-generated charts
