# Base44 & n8n Presentation Generator 🖼️
## **n8n Workflow Shown in Video**

📎 **File:** [`Gamma (Base 44) Sanitized.json`](files/Gamma (Base 44) Sanitized.json)

## **Prompts Used to Create Presentation Maker in Base44**

### **Prompt 1**

```
Build a presentation creation app with two sections: a brainstorming assistant and a presentation generator. The app has a neo-brutalist design style with thick black borders, bright colors, and intentionally rough aesthetics.

WHAT IS GAMMA:
Gamma (gamma.app) is a modern presentation platform that creates beautiful slides using AI. Think of it like PowerPoint but AI-powered - it generates entire presentations from prompts with professional designs, images, and layouts. Since this is 2023 and you don't know about Gamma yet, just know it's a presentation tool that accepts specific parameters to create presentations automatically.

THE APP YOU'RE BUILDING:
Create a single-page app with three main sections: "BRAINSTORM", "CREATE", and "HISTORY". Users can switch between these sections using clear tab-like buttons in the header. All sections should use the same session throughout the user's visit, maintaining context.

SECTION 1 - BRAINSTORMING ASSISTANT (BRAINSTORM TAB):
A chat interface where an AI assistant helps users define exactly what they need for their presentation. The assistant should guide users to determine:
1. Topic - What the presentation is about (the main subject and key points)
2. Audience - Who will view it (investors, colleagues, students, etc.)
3. Tone - How it should feel (professional, casual, inspiring, technical, etc.)
4. Number of Slides - How many slides they need (1-60)
5. Image Style - Visual aesthetic (photorealistic, illustrations, minimal, watercolor, tech-modern, etc.)

The assistant should ask about each parameter naturally through conversation, help refine ideas, and at the end provide a clear summary like: "Here's what we've prepared: Topic: [topic], Audience: [audience], Tone: [tone], Slides: [number], Image Style: [style]. You can now go to Create Presentation to generate it!" 

The chat input field should maintain focus after sending a message for continuous typing.

SECTION 2 - PRESENTATION CREATOR (CREATE TAB):
A form with these exact five fields:
- Topic: Large text area for the presentation subject (required)
- Audience: Text field for target viewers (default: "Colleagues")
- Tone: Text field for presentation style (default: "Professional")
- Number of Slides: Number input (1-60, default: 10)
- Image Style: Text field for visual theme (default: "Photorealistic")

When users switch from the Brainstorming section to this section, the fields should be automatically pre-filled with the parameters discussed with the AI assistant.

When users click "Generate Presentation", show a loading animation for approximately 1.5 to 2 minutes (90-120 seconds). This duration is crucial because the external generation service takes this long to process. The app must NOT display the "Presentation Ready!" message until this full duration has passed, even if an initial acknowledgment is received earlier. The loading state should persist throughout this entire period. Once the full processing time has passed and a successful response is confirmed, the app will display a clickable link to the generated presentation.

SECTION 3 - GENERATION HISTORY (HISTORY TAB):
A dedicated section to view a list of all successfully generated presentations. Each entry should display:
- The presentation's topic
- The date and time it was generated
- A clickable link to the presentationUrl on Gamma
- Include a refresh button to reload the history list

NEO-BRUTALIST DESIGN:
Make everything look raw and rebellious. Thick black borders on all elements (4px solid black). Bright, bold colors - electric red (bg-red-500), vibrant teal (bg-teal-400), neon yellow (bg-yellow-300). Some elements should be slightly rotated or misaligned on purpose (rotate-slight, rotate-slight-reverse). Use monospace fonts like Courier New (font-family: 'Courier Prime', monospace). Add floating geometric shapes as decoration. The design should feel like a punk rock poster meets a tech startup.

LAYOUT:
The app must fit the browser window perfectly without page scrolling. Only the chat messages or form content should scroll internally if needed. Think of it like a desktop application that always fits the screen.

USER EXPERIENCE:
- Start with welcome message in the chat: "Hi! I'll help you prepare your presentation. Let's define what you need..."
- Make the transition between sections seamless using the header buttons
- Transfer the discussed parameters from brainstorming to the creation form automatically
- Show clear loading states during API calls, specifically adhering to the 1.5-2 minute generation time for the presentation
- Keep all input data and conversation history persistent when switching between sections

DATABASE:
Create a database to store:
- Conversation entity: Stores session_id, topic, audience, tone, slide_count, image_style, and status
- Message entity: Stores conversation_id, role (user/assistant), content, and timestamp
- PresentationRequest entity: Stores the conversation_id, topic, audience, tone, slide_count, image_style, status (generating/completed/failed), the final presentation_url, and critically, the generation_id and completion_timestamp received from the external service. This entity should track EVERY generation attempt for the history tab.
```

### **Prompt 2**

```
TECHNICAL IMPLEMENTATION FOR THE PRESENTATION APP:

IMPORTANT MODEL NOTE:
You need to use GPT-4.1-mini for the brainstorming chat. Since you don't know about this model (it was released in 2025 after your training), here's what you need to know: GPT-4.1-mini is a newer, faster, more cost-effective model from OpenAI. Use the exact model string "gpt-4.1-mini" (NOT "gpt-4o-mini" which doesn't exist). This is critical - do not default to any other model name.

BRAINSTORMING CHAT - GPT-4.1-MINI INTEGRATION:
The brainstorming assistant uses OpenAI's gpt-4.1-mini model to help users define their presentation parameters.

Implement the chat backend. The function should:
- Accept conversation_history (an array of {role: string, content: string} objects)
- Use the model string "gpt-4.1-mini" when calling OpenAI's API
- Utilize OpenAI's tool-calling feature to extract the 5 presentation parameters (topic, audience, tone, number of slides, image style) from the conversation
- Define a tool function (e.g., update_presentation_parameters) with appropriate properties and description for each parameter
- The system prompt should guide the AI to:
    * Act as a neo-brutalist, edgy presentation assistant
    * Ask for one parameter at a time
    * CRUCIALLY, call the update_presentation_parameters tool when a parameter is clearly defined
    * ALWAYS follow up with a conversational response after calling the tool
    * Once all 5 parameters are collected, provide a final summary message that explicitly starts with "Here's what we've prepared:" and includes all collected parameters
- Return the AI's message and any extracted_data (the parameters) as a JSON object

Example code structure (remember to use "gpt-4.1-mini"):
const response = await openai.chat.completions.create({
  model: "gpt-4.1-mini", // MUST be exactly this string
  messages: messages,
  tools: tools,
  temperature: 0.7
});

PRESENTATION GENERATOR - N8N WEBHOOK:
When the user clicks "Generate Presentation", the frontend calls a backend function (e.g., generatePresentation) that then interacts with the n8n webhook.

The n8n webhook URL is: 
https://promptadvisers.app.n8n.cloud/webhook/b89ecdbf-68ae-4c06-8224-88adff1aec5b

The backend function must send exactly this JSON payload to the webhook:
{
  "topic": string (from form or brainstorming),
  "audience": string (from form or brainstorming),
  "tone": string (from form or brainstorming),
  "numCards": integer (from form or brainstorming),
  "imageStyle": string (from form or brainstorming),
  "sessionId": string (for tracking the conversation)
}

CRITICAL IMPLEMENTATION DETAIL: ASYNCHRONOUS GENERATION & RESPONSE HANDLING
The n8n webhook may send an immediate acknowledgment response upon receiving the request. However, the full presentation generation process (contacting Gamma, etc.) takes approximately 1.5 to 2 minutes (90-120 seconds).

The generatePresentation backend function must be designed to:
1. Send the payload to the n8n webhook
2. WAIT for the webhook's final response, which indicates the completion of the entire n8n workflow and contains the actual presentationUrl
3. Ensure the connection doesn't time out prematurely while waiting for n8n

The expected response from the webhook will be a JSON array containing a single object, or directly a single JSON object, with the following structure:
[
  {
    "success": true,
    "message": "🎉 Your presentation \"Your presentation\" is now complete!",
    "presentationUrl": "https://gamma.app/docs/example-url",
    "generationId": "RNSQbLnfFzqVbvDXRDzyU",
    "status": "completed",
    "topic": "Your presentation",
    "completionTimestamp": "2025-08-24T19:25:14.069Z",
    "instructions": [ /* ... */ ],
    "metadata": { "processedAt": "2025-08-24T19:25:14.070Z" }
  }
]

The backend function must parse this response to extract the presentationUrl, generationId, and completionTimestamp.

The frontend (PresentationGenerator component) must implement a forced 90-second minimum loading animation after the initial call to generatePresentation returns, to ensure the Gamma link is actually ready when displayed, matching the real generation time.

PARAMETER TRANSFER:
When users finish brainstorming and switch to the creation form, automatically populate the form fields with the parameters discussed in the chat. Store these in the session or in the Conversation entity so they persist and can be easily retrieved and pre-filled in the form.

HISTORY FEATURE:
Implement a "Generation History" component (GenerationHistory.jsx) that fetches and displays all PresentationRequest records with status: "completed". Each entry in the history should show the topic, completionTimestamp, and provide a clickable presentation_url link. Include a refresh mechanism for this list.
```

---

## **Want Access to DAILY Mad Scientist Content, coaching and more resources than you know what to do with?**

Join Early AI-dopters -- **no**, not another boring/generic community.

You'll be shocked at how awesome the content is, and how even MORE awesome the members are 🦾

[JOIN NOW](https://bit.ly/3ZMWJIb)
