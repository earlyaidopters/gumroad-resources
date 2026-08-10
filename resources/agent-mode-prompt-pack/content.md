# Agent Mode Prompt Pack 🧠📋
## **AirBnb Prompt**

```
I need to find an Airbnb in Toronto, Canada for a trip from October 15th to October 20th, 2025. My specific requirements are:
2 bedrooms (or more, but 2 is the minimum)
Must include parking
Maximum price of 500 CAD per night (excluding taxes and fees, focus on the base nightly rate)
Must be an entire home/apartment (no private rooms or shared spaces)
Your task is to perform this detailed search on Airbnb.ca and return a concise shortlist.
Website Behavior & Interaction:
Navigate to www.airbnb.ca.
Input 'Toronto, Canada' as the destination.
Set the check-in date to October 15, 2024 and check-out date to October 20, 2024.
Set the number of guests to 2.
Apply the following filters:
'Price range': Set the maximum to 500 CAD.
'Number of bedrooms': Select 2+ bedrooms.
'Property type': Select 'Entire home/apartment'.
'Amenities': Select 'Parking'.
Once filters are applied, systematically browse the top search results.
Data to Extract per Listing (Shortlist):
Listing Title
Number of Bedrooms
Nightly Price (CAD) (base price before taxes/fees)
Total Price for Stay (CAD) (including estimated taxes/fees, if clearly displayed)
Overall Rating (e.g., 4.8 stars)
Number of Reviews
Direct Link to Listing
Output:
Provide a shortlist of the top 3-5 most suitable listings that strictly meet all criteria. Present this information in a clear table, including all the extracted data points and the direct link for each listing
```

## **Google Trends**

```
Please conduct a Google Search Trends comparison for the following keywords over the last 12 months:
n8n
make.com
zapier
Here are the steps to follow and the desired output format:
Access Google Trends: Navigate to trends.google.com.
Set Up Comparison: Enter n8n, make.com, and zapier into the comparison tool.
Adjust Timeframe: Set the time range for the comparison to 'Past 12 months'.
Extract Data: Locate the 'Interest over time' chart. Systematically extract the weekly or monthly search interest scores (on a scale of 0-100) for each keyword. Prioritize using a download/export feature for the raw data if available.
Document in Tabular Form: Present the extracted data in a clear, organized table with the following columns:
Date
n8n Search Interest
make.com Search Interest
Zapier Search Interest
Ensure the table accurately reflects the relative search interest over the specified period.
```

## **Real Estate**

```
I am a real estate investor researching '3-bedroom single-family homes' as potential rental properties in 'Orlando, Florida'. Please access major online real estate platforms (e.g., Zillow, Redfin, Realtor.com) to find the current average listing price for these types of homes. Simultaneously, search for the average monthly rental income for similar properties in Orlando. Compile this information into a table showing the average listing price, average rental income, and calculate the estimated gross rental yield. Additionally, provide direct links to 5 active listings that roughly match this criteria.
```

## **SEO Keyword**

```
I run a blog about sustainable living and I'm looking for new content ideas that will perform well in search engines. Can you please use a keyword research tool like Google Keyword Planner or Ahrefs' free keyword generator to identify five high-volume, low-competition keywords related to 'zero-waste lifestyle'? Once you have the keywords, please search for each one on Google and analyze the top-ranking content. I want you to identify the common themes and formats of the top-ranking articles and suggest a unique blog post topic for each keyword. Please present your findings in a document.
```

## **Alibaba**

```
I'm launching a new line of organic skincare products and I need to find a reliable supplier for my packaging. 

I'm looking for a company that can provide me with 10,000 units of 50ml amber glass dropper bottles. 

Can you please search for suppliers on Alibaba? Filter by the highest rated/reviewed vendors.

Make sure they have reviews.

I want you to find at least three potential suppliers that meet my criteria and create a spreadsheet that compares their pricing, minimum order quantity, lead time, and customer reviews. 

Please also include a link to each supplier's website and any available certifications.
```

## **Ecommerce**

```
My e-commerce business sells handmade leather goods, and I'm considering expanding my market to either Australia or the United Kingdom. I need you to conduct some preliminary market research. Please use Google to find recent articles and market reports on the size and growth of the online leather goods market in both countries. I'm also interested in the competitive landscape, so can you identify the top three online retailers of handmade leather goods in both Australia and the UK? Please summarize your findings in a report, including links to your sources, and conclude with a recommendation on which market appears to be more promising for a new entrant
```

## **Competitor Analysis**

```
I'm in the process of scaling my SaaS company and I'm looking to understand the talent acquisition strategies of my main competitors: Asana, Monday.com, and ClickUp. Can you please go on their respective career pages on their websites, as well as LinkedIn, and identify all of the open roles they are currently hiring for? I want you to categorize these roles by department (e.g., Engineering, Sales, Marketing, Product) and seniority level. Please compile this information into a spreadsheet, with a separate tab for each company. Finally, provide a brief summary of any noticeable hiring trends that might indicate their strategic focus for the upcoming year.
```

## **Personal Branding**

```
I want you to act as my personal brand and content strategist. Your task is to help me identify and create content that establishes me as a thought leader. Here is your process:
Analyze My Expertise: Search through my Google Drive documents and my sent Gmail messages from the last 6 months. Based on your analysis of my writing and communications, identify the top 3-5 recurring themes and topics that I appear most knowledgeable about.
Identify Market Trends: For each of those themes, perform a comprehensive web search to find the most talked-about news, articles, and discussions from the last 30 days. I want to know what's currently trending in my areas of expertise.
Synthesize Content Opportunities: Combine your findings from step 1 and 2. Propose three unique and compelling content ideas (this could be a LinkedIn post, a blog article, or a Twitter thread) that bridge my expertise with the current industry conversations. Each idea should have a catchy headline and a few bullet points outlining the main arguments.
Schedule & Prepare: Finally, analyze my Google Calendar for the upcoming week and find two available 90-minute blocks of time for me to work on this. Create two new calendar events titled 'Content Creation Session'. In the description of the first calendar event, paste the detailed outline for the strongest of the three content ideas you generated.
Execute this entire workflow and present the final report and the scheduled calendar events.
```

## **Dental Leads**

```
My company provides marketing services to dental practices in the United States. I'm looking to expand my client base in the state of Texas. Can you please compile a list of all the dental practices in Dallas, Houston, and Austin? I want you to find the name of the practice, the name of the lead dentist, their website, and their contact information. Please organize this information into a spreadsheet, with a separate tab for each city
```

## **Complex Document Extraction**

```
Your task is to extract and organize foreclosure deed data from the Cherokee County, TX real property records website, focusing on the period from January 1, 2025, to July 19, 2025.
Website URL: https://www.uslandrecords.com/uslr/UslrApp/index.jsp
Workflow Steps:
Initial Navigation & Filter Setup:
Navigate to the provided URL.
Ensure "Office" is set to "Foreclosures" and "Search Type" is "Date Search."
Set the "From" date to 01/01/2025.
Set the "To" date to 07/19/2025 (today's date).
Click the "Search" button.
Data Extraction from Search Results (Metadata):
For every search results page displayed:
Extract the following columns into a preliminary tabular format: File Date, Book/Vol/Page, Inst. Date, Type Doc., Doc #.
Document the total number of rows found on that page.
Handle Pagination: Identify and click through all available pagination links (e.g., "View 20 50 100" and subsequent page numbers) to ensure all results within the date range are processed.
In-Depth Document Content Analysis (Attempting OCR on Image Viewer):
For each row in your extracted search results:
Locate and click the "View" button for that specific deed. Note that this often opens a new pop-up window displaying an image of the deed.
Attempt to perform Optical Character Recognition (OCR) on the entire visible content of the deed image within the pop-up viewer.
From the OCR'd text, try to extract key pieces of information typically found in foreclosure deeds, such as:
Date of Sale
Trustee's Name
Borrower/Grantor Name
Lender/Grantee Name
Property Description (Address or Lot/Block if visible)
Original Loan Amount (if explicitly stated)
Crucial Note: Acknowledge that the website charges for PDF downloads and requires a subscription. State clearly that you are not performing downloads or paying per page, but rather attempting to process the visually displayed content in the browser viewer.
Error Handling & Adaptability:
If, after setting the dates and searching, no results are displayed or the page indicates an error related to the date range:
Attempt to narrow the date range, perhaps processing month by month (e.g., Jan 2025, then Feb 2025, etc.) until results are found, or an explicit error message about the date formatting/limits is encountered.
Document any specific error messages encountered during date filtering or search.
Final Output & Meta-Cognition:
Consolidated Table: Create a single, comprehensive table summarizing all extracted data. Combine the metadata from step 2 with the OCR'd key information from step 3. Include a column indicating if full OCR extraction was successful for a given deed.
Workflow Log: Provide a step-by-step log of your entire process, including:
Each action taken (e.g., "Navigated to URL," "Set 'From' date," "Clicked 'View' for Doc # [X]").
Any challenges or unexpected behaviors encountered (e.g., "Pop-up viewer loaded slowly," "OCR quality was low for certain sections," "Pagination links were non-standard").
How you adapted to these challenges.
A clear statement about the limitations encountered due to the website's design (e.g., inability to download/fully process without subscription).
```

---

## **Want Access to DAILY Mad Scientist Content, coaching and more resources than you know what to do with?**

Join Early AI-dopters -- no, not another boring/generic community.

You'll be shocked at how awesome the content is, and how even MORE awesome the members are 🦾

[JOIN NOW](https://bit.ly/3ZMWJIb)
