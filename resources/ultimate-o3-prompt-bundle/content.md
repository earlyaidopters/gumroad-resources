# Ultimate o3 Prompt Bundle 🔋
## **Google Maps Use Case**

![](https://public-files.gumroad.com/eb693br7y922ldze7niwfy9t999r)

```
You are a lead generation analyst for a pool cleaning and maintenance company. Using the attached satellite map of a residential neighborhood, perform the following:

1. Identify all properties with visible swimming pools.
2. For each pool property, estimate:
   - The size and type of pool (in-ground, above-ground, approximate dimensions)
   - Ease of service access (driveway proximity, backyard accessibility)
   - Signs of high usage (pool furniture, decks, or visible wear)
3. Prioritize the top 10 leads based on:
   - Pool size and likely maintenance needs
   - Ease of access for service vehicles and staff
   - Potential for upselling (e.g., homes with large patios or multiple outdoor amenities)
4. For each top lead, provide:
   - A brief description of the property’s location (e.g., “Corner house on Edgeware Dr and Burnt Oak Dr with a large blue pool”)
   - A suggested personalized outreach angle (e.g., “Highlight premium cleaning plans for high-traffic pools”)
5. Summarize findings in a table with columns: Address/Description, Pool Type, Accessibility, Priority Score, Outreach Suggestion.

Present your recommendations as a report a sales team can use for targeted outreach. Reference specific visible features in the image to support your selections.
```

## **Create Chrome Extension**

```
You are a senior Chrome‑extension architect and world‑class prompt engineer.

GOAL  
Create a fully‑working Manifest V3 Chrome extension called **“LinkedIn Personalized Messenger”** that, when a user opens any linkedin.com/in/* profile, lets them click the extension, paste their OpenAI key once, press **Generate**, and instantly receive a tailored connection note (≤ 300 characters) powered by GPT‑4 (model name may change). The output must include a ready‑to‑load unpacked folder and a downloadable ZIP.

---

### MUST‑HAVE TECH SPECS  

1. **Manifest V3**

{
  "manifest_version": 3,
  "name": "LinkedIn Personalized Messenger",
  "description": "Generate personalized LinkedIn connection messages with GPT‑4.",
  "version": "1.3.1",
  "permissions": ["activeTab", "scripting", "storage", "tabs"],
  "host_permissions": [
    "https://*.linkedin.com/*",
    "https://api.openai.com/*"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png",
      "128": "icons/icon128.png"
    }
  },
  "background": { "service_worker": "background.js" }
}

2. **Icons** – placeholder transparent PNG for 16 / 32 / 128 px.

3. **popup.html**  
   Clean LinkedIn‑blue UI: API‑key field, **Save Key** + **Generate** buttons (same row), textarea for result, **Copy** button, subtle helper text.

4. **popup.js**  
   Logic  
   • On load, pre‑fill key from chrome.storage.sync.  
   • **Save** writes key to storage.  
   • **Generate**:  
     – Uses chrome.scripting.executeScript to inject scrapeProfile() that extracts Name, Headline, About, first ≤ 5 experience items.  
     – Sends {type:"GENERATE_MESSAGE", profile} to background; shows “⏳ Generating…”.  
     – Displays result or readable error (❌ …).  
   • **Copy** writes textarea to clipboard with visual feedback.

5. **background.js**  
   Robust service worker  
   • Loads openai_key from storage; watches for changes.  
   • Handles GENERATE_MESSAGE, always returning true to keep port open.  
   • Validates key & profile.  
   • Calls https://api.openai.com/v1/chat/completions with model gpt-4o-mini, prompt:  
     System: “You are [MY NAME], an [MY JOB] creating a concise, friendly LinkedIn connection request.”  
     User: “LinkedIn profile information:\n<scraped text>\n\nCraft a short, personalized connection message (max 300 chars)…”.  
   • Sends {message} or {error} back.

6. **scrapeProfile()** (injected)  
   • Helper text(sel) wrapper.  
   • Robust selectors with fallbacks.  
   • Returns multiline string:

Name: …  
Headline: …  
About: …  
Experience:  
• exp 1  
• exp 2

   • Returns empty string if name missing.

7. **Packaging**  
   • Use python_user_visible to create all files/folders under /mnt/data/linkedin_personal_messenger/… .  
   • Generate linkedin_personal_messenger.zip and provide [Download ZIP](sandbox:/mnt/data/linkedin_personal_messenger.zip) link.  
   • Include concise “How to install” steps in chat (not in files).

8. **Error Handling & UX**  
   • Meaningful messages instead of alerts; status emojis (⏳ / ❌ / ✅).  
   • Never crashes service worker (no top‑level awaits).  
   • Works without refreshing the profile page.

---

### OUTPUT FORMAT

1. Show the download link and a short 3‑step install guide.  
2. No extra explanations of source code (users can inspect files themselves).

---

### IMPORTANT CONSTRAINTS  
* All code MUST run as‑is when the folder is loaded as an unpacked extension.  
* Keep total ZIP size small (icons are transparent 1 × 1).  
* No external build tools; plain JS/HTML/CSS only.  
* Follow Chrome best practices: return true for async port, use MV3 APIs exclusively.  
* Prompt result must be deterministic—no missing callbacks, no registration errors (Status code 15 fixed).

Generate now
```

## **Creating an Engineering Blueprint**

```
create a complicated blueprint document (with images) for a new futuristic condo design in Dubai

we need real blueprints that are civil engineering worthy, mockups that would make an architect tear up, and a project plan that searches the latest pricing of materials down to the cent and provides costing that would make an account absolutely blush

assume it'll be built on the new Palm in Dubai
```

## **Commercial Law**

**Attach something to the chat**

```
You are now taking on the role of a top 1% commercial real estate attorney with 25+ years of experience reviewing complex property transactions for institutional investors and high-net-worth clients. Your expertise spans commercial acquisitions, development projects, lease agreements, and property management contracts across multiple jurisdictions.

TASK: Perform a comprehensive legal review of the commercial real estate contract I will provide, identifying every concerning clause, potential red flag, and unfavorable term with the meticulous attention to detail that your elite clients expect.

For each identified issue:
1. Extract the exact problematic clause or language (using direct quotes)
2. Specify the precise section/paragraph number and page where it appears
3. Explain in detail WHY this language raises concerns from a legal perspective
4. Outline the specific risks or liabilities this creates for your client
5. Provide clear, actionable recommendations for modification or negotiation
6. Rate the severity of the issue on a scale of 1-5 (5 being most concerning)

Focus your analysis particularly on these high-risk areas:

FINANCIAL TERMS AND STRUCTURE:
- Ambiguous payment terms or schedules
- Hidden fees, penalties, or escalation clauses
- Imbalanced profit-sharing or return structures
- Unclear tax liability allocations
- Financing contingencies with unfavorable triggers

DUE DILIGENCE PROVISIONS:
- Insufficient inspection periods
- Limited access rights for property examination
- Unreasonable documentation deadlines
- Restricted scope of environmental testing
- Vague disclosure requirements from sellers

TITLE AND SURVEY MATTERS:
- Unaddressed encumbrances or easements
- Ambiguous property descriptions or boundaries
- Unclear responsibility for title defect remediation
- Limitations on survey objection rights
- Inadequate title insurance requirements

REPRESENTATIONS AND WARRANTIES:
- Overly narrow seller representations
- Excessive knowledge qualifiers ("to seller's knowledge")
- Short survival periods for claims
- Ambiguous materiality thresholds
- Limited or no indemnification for breaches

CONTINGENCIES AND EXIT STRATEGIES:
- Missing or weak financing contingencies
- Limited termination rights
- Excessive deposits or non-refundable earnest money
- Unclear regulatory approval contingencies
- One-sided extension provisions

DISPUTE RESOLUTION AND LIABILITY:
- Unfavorable venue or governing law provisions
- Waiver of jury trial rights
- Mandatory arbitration with biased parameters
- Excessive liquidated damages
- Limitation of liability provisions that unduly favor the other party

FORMAT YOUR RESPONSE AS FOLLOWS:
1. Executive Summary: Brief overview of the contract and major concerns (2-3 paragraphs)
2. Critical Issues: Detailed analysis of high-severity items (4-5 rating) requiring immediate attention
3. Secondary Concerns: Analysis of moderate-severity items (2-3 rating) that should be negotiated
4. Minor Issues: Brief notes on low-severity items (1 rating) that could be improved
5. Strategic Recommendations: Prioritized approach to addressing all identified issues
```

## **Academic Study Analysis (Simplifying Complex Concepts into Info Graphics)**

**Attach some study PDF of your choice.**

```
Analyze the attached graphs showing rotary angle distributions and model performance in large language models. Create a simple, non-technical explanation of how researchers are extending context windows in AI models.

Output format:
1. EXPLANATION OF CONTEXT WINDOWS (2-3 paragraphs)
   - Define what a context window is and its practical importance
   - Explain the challenge of extending context beyond training length

2. KEY CONCEPT: ROTARY POSITION EMBEDDINGS
   - Explain what the graphs show about angle distributions 
   - Connect this to how words maintain relationships at different distances

3. THE SOLUTION APPROACH
   - Describe how the researchers improved context extension
   - Explain why the red curve in the performance graph matters

4. PRACTICAL BENEFITS
   - Describe what longer context windows enable for everyday users

For each section, include a simple diagram that visualizes the concept for a non-technical audience. Use everyday metaphors and concrete examples throughout.

Avoid technical jargon where possible. When technical terms are necessary, provide intuitive definitions.
```

**How to Install Ollama on Your Terminal**

```
You are an expert system administrator specializing in MacOS and AI infrastructure deployment. I need your help installing Ollama on my M2 MacBook Pro and selecting an appropriate LLM model based on my hardware.

Task: Generate a precise, sequential set of terminal commands that will:
1. Install Ollama on my M2 MacBook Pro
2. Research which LLM model would perform best on my specific hardware
3. Install that recommended model

Technical specifications:
- Device: MacBook Pro with M2 chip
- Operating system: macOS (latest version)

For each step:
1. Provide the exact command to run
2. Add a brief explanation of what the command does
3. Include any expected output or prompts I might see

When researching appropriate models:
1. Consider the M2 chip's Neural Engine capabilities
2. Factor in RAM limitations (assume 16GB unless I specify otherwise)
3. Prioritize models known to perform well on Apple Silicon
4. Balance size and capability (I need reasonable performance without excessive resource consumption)

Format your response as a step-by-step guide with clearly labeled sections and code blocks for each command. Conclude with recommendations for optimal usage based on my hardware profile.
```

## **Conference & Speaker Scheduling**

```
You are an AI conference planner specializing in schedule optimization. Analyze the attached image of a conference schedule and create an optimal attendance itinerary.

1. EXTRACT SCHEDULE DATA
   - Identify all sessions, workshops, and events visible in the image
   - For each item, extract: title, time, date, location, speaker(s), and description (if available)
   - Note any session tracks or categories

2. ATTENDEE PREFERENCES
   - Ask me about my professional interests, goals for the conference, and any scheduling constraints
   - Inquire if I have specific speakers or topics I want to prioritize
   - Determine my preferences for breaks, networking events, and session intensity

3. CREATE OPTIMIZED ITINERARY
   - Design a personalized schedule that maximizes value based on my preferences
   - Resolve scheduling conflicts by recommending the highest-value sessions
   - Include strategic breaks and meal times
   - Incorporate buffer time between sessions in different locations
   - Highlight networking opportunities relevant to my interests

4. VISUALIZATION & DETAILS
   - Present the itinerary in a clear day-by-day, hour-by-hour format
   - For each recommended session include: title, time, location, speakers, and a brief explanation of why it was selected
   - Identify potential alternative sessions for flexibility
   - Note nearby food options or amenities when relevant

5. OPTIMIZATION INSIGHTS
   - Explain the rationale behind your recommendations
   - Highlight sessions that align with emerging trends in my field
   - Suggest specific networking targets based on speakers or attendees
   - Identify sessions likely to reach capacity early that require advance planning

Your output should be practical, personalized, and designed to maximize both learning and networking value. Acknowledge any limitations in the image data and offer alternatives where information may be incomplete.
```

## **Room Inspector**

![](https://public-files.gumroad.com/revml31ksgm6xb2w5d559vpa3uj9)

```
You are a seasoned construction and building inspector with 30 years of experience. Carefully examine the attached image of this room or structure.

Your task:
- Identify any visible construction issues, safety hazards, code violations, or areas of poor workmanship.
- For each issue, briefly describe what you see, why it could be a problem, and how serious it is (minor, moderate, or major).
- If you see no problems in a particular area (walls, windows, floor, ceiling, electrical, etc.), state that clearly.
- Use simple, direct language that a homeowner or renter would understand. Avoid jargon, or explain it if used.

Finish with an overall summary: Is this room generally well-built and safe, or are there concerns that should be addressed?
```

## **Real Estate Web Application**

```
Create a complete, production-ready web application that renders a high-definition, interactive 3D model of a modern house that users can explore in first-person view. The application should meet the following specifications:

### Functionality Requirements
- Generate a detailed, architecturally accurate 3D model of a two-story modern house with approximately 3,000 sq ft of living space
- Enable first-person navigation through the entire house, including all rooms, stairs, and outdoor areas
- Implement realistic lighting with day/night cycles and adjustable interior lights
- Include realistic materials and textures for all surfaces (walls, floors, furniture, etc.)
- Allow users to interact with certain objects (open doors, turn on lights, etc.)
- Support zoom functionality to examine architectural details and furnishings
- Provide an overhead/floor plan view that users can toggle to
- Include ambient audio appropriate to different areas of the house

### Technical Implementation
- Use Three.js or a similar WebGL-based framework for 3D rendering
- Implement responsive design that works on desktop and modern mobile devices
- Optimize for performance with level-of-detail techniques for complex objects
- Use modular, well-commented code structure following best practices
- Implement efficient asset loading with progress indicators
- Include collision detection to prevent walking through walls/objects
- Support for modern browsers (Chrome, Firefox, Safari, Edge)
- Fallback rendering mode for less powerful devices

### Visual Quality
- High-resolution textures (4K where appropriate)
- Realistic materials with appropriate reflection, refraction, and roughness properties
- Dynamic shadows and ambient occlusion
- Post-processing effects (subtle depth of field, ambient light, etc.)
- Physically-based rendering for materials and lighting

### User Interface
- Intuitive controls (WASD/arrow keys for movement, mouse look, touch controls for mobile)
- On-screen navigation controls for mobile users
- Mini-map showing current location in the house
- UI controls for adjusting graphics quality, sound volume, etc.
- Information tooltips for architectural features and furniture items
- Options menu accessible via a non-intrusive button

### House Details
- Architectural style: Modern minimalist with large windows
- Exterior: Custom landscaping, driveway, patios, pool area
- First floor: Entryway, living room, dining room, kitchen, home office, half bathroom, laundry room
- Second floor: Master bedroom with ensuite bathroom, two additional bedrooms, full bathroom, loft area
- Basement (optional): Entertainment room, storage area
- Realistic furniture and décor throughout
- Attention to architectural details like crown molding, baseboards, window treatments
- Functioning doors that open/close

### Code Output Format
- Provide a complete GitHub-ready repository structure
- Include all necessary HTML, CSS, JavaScript files
- Generate any required 3D models, textures, and audio files (or provide instructions to source them)
- Include a package.json with all dependencies
- Add detailed README.md with setup and running instructions
- Ensure the application can be run locally with minimal setup (preferable via npm commands)
- Include deployment instructions for hosting online

### Running Instructions
- Provide step-by-step instructions to run the application locally
- Include a development server configuration
- Explain any environment variables or configuration options
- Detail how to build for production deployment
- Include troubleshooting tips for common issues

Start by generating the overall architecture of the application and explain your approach. Then implement the core rendering engine, followed by the house model, navigation controls, and user interface. Structure your response to first show the key files and then explain how they work together. Ensure the solution can be easily deployed to a web server or opened directly in a browser.
```

## **eBook Asset Creation**

```
You are an AI‑strategy expert, data researcher, and visual designer in one.

GOAL  
Create a fully finished, 25‑plus‑page, grade‑5‑reading‑level ebook titled **“AI Across Industries: A Simple Guide.”**  
The book must contain current data (2024‑2025), proper citations, and ten ready‑to‑download infographics.

TASK LIST  
1. **Research (live):**  
   • Search credible 2024‑2025 sources for AI use and adoption statistics in Healthcare, Finance, Manufacturing, Retail, and Education.  
   • Store findings in a small table for later reference.  
   • Cite each fact by tagging it with :contentReference[oaicite:0]{index=0}.

2. **Write Content (grade‑5 level):**  
   • Keep sentences 10–15 words.  
   • Use basic vocabulary, active voice, concrete examples.  
   • Explain any tech term in one short clause right after first use.  
   • Structure exactly as follows, with page numbers and headings:  
     1. Cover (p. 1)  
     2. TOC (p. 2)  
     3. Introduction + Industry Comparison Chart marker (p. 3)  
     4. Key Ideas (p. 4)  
     5. AI Adoption Timeline marker (p. 5)  
     6‑20. Five industry sections, three pages each:  
        • Page X: Snapshot paragraph(s)  
        • Page X+1: Implementation Flowchart marker  
        • Page X+2: Three specific use‑case mini‑cards (Problem, Steps, Outcomes, Challenges)  
     21. ROI Framework marker  
     22. Risk Matrix marker  
     23. Step‑by‑Step Implementation Guide  
     24‑25. Future Trends visualization marker and narrative  
     26. Action Takeaways + Conclusion  
   • Insert clear “[Infographic # TITLE — PLACEHOLDER]” lines where each graphic belongs.

3. **Generate Infographics:**  
   • Use **python_user_visible** to script and save each graphic:  
     ‑ Industry Comparison Chart (bar chart, p. 3)  
     ‑ AI Adoption Timeline (horizontal timeline, p. 5)  
     ‑ Five Implementation Flowcharts (simple flow diagrams, p. 7, 10, 13, 16, 19)  
     ‑ ROI Calculation Framework (stacked bar + payback table, p. 21)  
     ‑ Risk Assessment Matrix (4‑quadrant heat map, p. 22)  
     ‑ Future Trends Visualization (constellation/map, p. 24)  
   • After each plot, save to /mnt/data/ with a clear file name and show it.  
   • Provide “Download the PNG” links right after each graphic is generated.  
   • Use real data from your research table for any quantitative charts (e.g., adoption rates).  
   • For flowcharts and the constellation diagram, keep visuals clean and labeled; no need for numeric data.

4. **Deliverables:**  
   • Full ebook text with embedded citations and graphic links in a single response.  
   • Ten image files. Optionally zip them and provide a download link [Download all infographics].  
   • A short recap paragraph at the end confirming all steps completed.

CONSTRAINTS  
‑ Do every step in this single session.  
‑ Do not ask follow‑up questions. Assume any missing minor detail logically.  
‑ Match page numbers to final content exactly.  
‑ No generic or vague use cases; each must be specific, niche, and business‑focused.  
‑ Cite every statistic, timeline point, and numeric claim.  
‑ If a source cannot be found within two quick searches, omit that fact.  
‑ Use only matplotlib (no seaborn) when plotting.  
‑ Never specify colors unless asked; let default matplotlib palette stand.  
‑ Follow all platform tool instructions (web.run for research, python_user_visible for plots).  
‑ Output nothing except the finished ebook, images, and download links.

BEGIN NOW
```

---

## **Want Access to DAILY Mad Scientist Content, coaching and more resources than you know what to do with?**

Join Early AI-dopters -- **no**, not another boring/generic community.

You'll be shocked at how awesome the content is, and how even MORE awesome the members are 🦾

[JOIN NOW](https://bit.ly/3ZMWJIb)
