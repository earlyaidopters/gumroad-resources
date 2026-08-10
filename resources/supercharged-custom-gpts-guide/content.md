# Supercharged Custom GPTs Guide ⚡️
# **Notion Guide**

[Notion Guide Link](https://elegant-feather-795.notion.site/Custom-GPT-Templates-14278194bfaf80309894c04ee953dacc?pvs=4)

# **Jack of All Trades Custom GPT Components**

**WATCH THIS LOOM!!!**

Setup Guide Video (WATCH ME)

### **Prompt**

```
You are a multi-functional assistant capable of managing memories, scraping web data, creating calendar events, and analyzing PDF documents. Follow these instructions based on the user’s input:

---

## Memory Management System
### Commands:
- **Search Memories (`SM`)**: Search specific memories by providing `user_id` and `query`.
- **Retrieve All Memories (`RA`)**: Fetch all memories for a `user_id` - when I give you a name for the id, send it as all lowercase to the underlying action
- **Add Memory (`AM`)**: Add a memory with `user_id`, `content`, and optional `categories`.
- **Delete Memory (`DM`)**: Remove a memory by its unique `memory_id`.
- **Delete All Memories (`DA`)**: Delete all memories for a `user_id`.
- **Add User (`AU`)**: Create a new user with `user_id` and profile details.

### Example Interaction:
1. User: `SM`
2. Response: "Please provide `user_id` and `query`."

---

## Web Scraping (Firecrawl API)
### Steps:
1. **Prompt**: "What URL would you like to scrape? Provide the full URL."
2. Validate the URL. If invalid, request clarification.
3. Ask for the desired format (`markdown`, `html`) or use default (`markdown` and `html`).
4. Process the request via API and return the scraped data or explain errors if any.

### Example Interaction:
1. User: "Scrape `https://example.com`."
2. Response: "Scraping data in markdown and html format. Please wait..."

---

## Google Calendar Event Creator
### Steps:
1. Gather event details:
   - Start/End Date & Time (ISO 8601 format)
   - Title, Description, Location (Optional)
   - Attendees (Up to 5, email validation required)
   - Reminder settings (default or custom)
2. Construct API payload with inputs.
3. Submit to API endpoint: `ENTER YOUR MAKE API KEY HERE`.
4. Provide feedback:
   - On success: "Event created successfully."
   - On error: "Invalid data. Please check your inputs."

### Example Interaction:
1. User: "Create a meeting."
2. Response: "What is the start date and time (ISO 8601)?"

---

## PDF Analysis (Claude API)
### Steps:
1. **Prompt**: "Please provide the PDF link."
   - Direct PDF link: Paste the link directly.
   - Google Drive link: Ensure the file is shared with **"Anyone with the link can view"** and paste the link here.
2. **Ask Questions**:
   - Request the questions the user wants answered from the PDF.
   - Example: "What topics are covered in this document?" or "What is the summary of the conclusion?"
3. Submit the `pdf_url` and `question` to the API: `https://claudepdf.replit.app/ask`.
4. Handle Responses:
   - On success: Provide the answer retrieved from the PDF.
   - On failure: Notify the user of errors and request corrections.

### Example Interaction:
1. User: "Analyze this PDF: `https://drive.google.com/xyz`. My question is: 'What is the summary?'"
2. Response: "Processing the PDF. Please wait…"

---

### General Notes:
- Always guide users through required inputs.
- Validate data formats (ISO 8601 for dates, valid URLs/emails).
- Provide clear error messages and re-prompt when necessary.
- Combine clarity with efficiency for a seamless user experience.
```

### **Google Calendar Automation**

```
openapi: 3.1.0
info:
  title: Google Calendar Event Creator
  version: 1.0.2
  description: API for creating new Google Calendar events with up to 5 attendees.

servers:
  - url: PUT YOUR MAKE.COM WEBHOOK

paths:
  /:
    post:
      operationId: createGoogleCalendarEvent
      summary: Create a new Google Calendar event
      description: Submit the necessary data to create a new event in Google Calendar. Times should be provided in **Eastern Standard Time (EST)**.
      x-openai-isConsequential: false
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                calendarId:
                  type: string
                  description: Google Calendar ID where the event will be created.
                summary:
                  type: string
                  description: (Optional) Title of the event.
                description:
                  type: string
                  description: (Optional) Detailed description of the event.
                location:
                  type: string
                  description: (Optional) Location of the event.
                start:
                  type: string
                  format: date-time
                  description: Start date and time of the event (ISO 8601 format, **EST timezone**).
                end:
                  type: string
                  format: date-time
                  description: End date and time of the event (ISO 8601 format, **EST timezone**).
                attendees:
                  type: array
                  description: (Optional) List of up to 5 attendees for the event.
                  maxItems: 5
                  items:
                    type: object
                    properties:
                      name:
                        type: string
                        description: (Optional) Name of the attendee.
                      email:
                        type: string
                        description: Email address of the attendee.
                        format: email
                reminders:
                  type: object
                  description: (Optional) Custom reminder settings for the event.
                  properties:
                    useDefault:
                      type: boolean
                      description: Whether to use default reminder settings.
                    overrides:
                      type: array
                      description: Custom reminders to override default settings.
                      items:
                        type: object
                        properties:
                          method:
                            type: string
                            enum: [email, popup]
                            description: Reminder method.
                          minutes:
                            type: integer
                            description: Minutes before the event to send the reminder.
              required:
                - calendarId
                - start
                - end
      responses:
        '200':
          description: Event created successfully.
          content:
            application/json:
              schema:
                type: object
                properties:
                  message:
                    type: string
                    example: "Event created successfully."
        '400':
          description: Bad request.
          content:
            application/json:
              schema:
                type: object
                properties:
                  error:
                    type: string
                    example: "Invalid input data."
```

### **mem0 App**

```
{
  "openapi": "3.1.0",
  "info": {
    "title": "Mem0 Flask API",
    "description": "REST API for interacting with the Mem0 memory management system.",
    "version": "1.0.0"
  },
  "servers": [
    {
      "url": "YOUR REPLIT APP URL"
    }
  ],
  "paths": {
    "/search_memory": {
      "post": {
        "operationId": "searchMemory",
        "description": "Search for specific memories.",
        "x-openai-isConsequential": false,
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "user_id": { "type": "string" },
                  "query": { "type": "string" }
                },
                "required": ["user_id", "query"]
              }
            }
          }
        },
        "responses": {
          "200": { "description": "Search results returned." },
          "400": { "description": "Invalid input." },
          "500": { "description": "Server error." }
        }
      }
    },
    "/get_all_memories": {
      "get": {
        "operationId": "getAllMemories",
        "description": "Retrieve all memories for a user.",
        "x-openai-isConsequential": false,
        "parameters": [
          {
            "name": "user_id",
            "in": "query",
            "required": true,
            "schema": { "type": "string" }
          }
        ],
        "responses": {
          "200": { "description": "List of all memories." },
          "400": { "description": "Invalid input." },
          "500": { "description": "Server error." }
        }
      }
    },
    "/add_memory": {
      "post": {
        "operationId": "addMemory",
        "description": "Add a new memory.",
        "x-openai-isConsequential": false,
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "user_id": { "type": "string" },
                  "content": { "type": "string" },
                  "categories": { "type": "array", "items": { "type": "string" } }
                },
                "required": ["user_id", "content"]
              }
            }
          }
        },
        "responses": {
          "200": { "description": "Memory added successfully." },
          "400": { "description": "Invalid input." },
          "500": { "description": "Server error." }
        }
      }
    },
    "/delete_memory": {
      "post": {
        "operationId": "deleteMemory",
        "description": "Delete a memory by ID.",
        "x-openai-isConsequential": false,
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "memory_id": { "type": "string" }
                },
                "required": ["memory_id"]
              }
            }
          }
        },
        "responses": {
          "200": { "description": "Memory deleted successfully." },
          "400": { "description": "Invalid input." },
          "500": { "description": "Server error." }
        }
      }
    },
    "/delete_all_memories": {
      "post": {
        "operationId": "deleteAllMemories",
        "description": "Delete all memories for a user.",
        "x-openai-isConsequential": false,
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "user_id": { "type": "string" }
                },
                "required": ["user_id"]
              }
            }
          }
        },
        "responses": {
          "200": { "description": "All memories deleted." },
          "400": { "description": "Invalid input." },
          "500": { "description": "Server error." }
        }
      }
    },
    "/add_user": {
      "post": {
        "operationId": "addUser",
        "description": "Add a user with initial memory.",
        "x-openai-isConsequential": false,
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "user_id": { "type": "string" },
                  "user_data": { "type": "string" }
                },
                "required": ["user_id", "user_data"]
              }
            }
          }
        },
        "responses": {
          "200": { "description": "User created successfully." },
          "400": { "description": "Invalid input." },
          "500": { "description": "Server error." }
        }
      }
    }
  }
}
```

### **Firecrawl**

```
{
  "openapi": "3.1.0",
  "info": {
    "title": "Firecrawl Scraping and Summarization API",
    "description": "API to scrape web pages using Firecrawl and summarize the content using OpenAI GPT-4o.",
    "version": "1.0.0"
  },
  "servers": [
    {
      "url": "https://firecrawl.replit.app",
      "description": "Local development server"
    }
  ],
  "paths": {
    "/scrape": {
      "post": {
        "operationId": "scrapeAndSummarize",
        "summary": "Scrape a webpage and summarize its content",
        "description": "Scrapes a webpage using Firecrawl and processes the content with GPT-4o to provide a hyper-succinct summary.",
        "x-openai-isConsequential": false,
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "url": {
                    "type": "string",
                    "description": "The URL of the webpage to scrape."
                  },
                  "formats": {
                    "type": "array",
                    "items": {
                      "type": "string"
                    },
                    "description": "The formats to return (e.g., 'markdown', 'html'). Defaults to ['markdown', 'html']."
                  }
                },
                "required": ["url"]
              },
              "example": {
                "url": "https://example.com",
                "formats": ["markdown", "html"]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Summarized data successfully returned.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "summary": {
                      "type": "string",
                      "description": "The hyper-succinct summary of the scraped content."
                    }
                  }
                },
                "example": {
                  "summary": "- Key takeaway 1\n- Key takeaway 2"
                }
              }
            }
          },
          "400": {
            "description": "Invalid input. The 'url' field is required.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "string",
                      "description": "Details about the error."
                    }
                  }
                },
                "example": {
                  "error": "The 'url' field is required."
                }
              }
            }
          },
          "500": {
            "description": "An error occurred during scraping or summarization.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "string",
                      "description": "Details about the server error."
                    }
                  }
                },
                "example": {
                  "error": "An unexpected error occurred."
                }
              }
            }
          }
        }
      }
    }
  }
}
```

### **Claude PDF Analysis**

```
openapi: 3.1.0
info:
  title: Claude PDF Question API
  description: API for fetching a PDF from a Google Drive link, sending it to the Claude API along with a question, and receiving an answer.
  version: 1.0.0
servers:
  - url: YOUR REPLIT APP URL
    description: Replit deployment server

paths:
  /ask:
    post:
      operationId: askClaudeQuestion
      summary: Fetches a PDF, sends it to Claude API with a question, and returns the answer.
      x-openai-isConsequential: false
      requestBody:
        description: JSON payload containing the Google Drive PDF URL and question.
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                pdf_url:
                  type: string
                  format: uri
                  description: Google Drive URL of the PDF to be processed.
                question:
                  type: string
                  description: The question to ask about the PDF content.
              required:
                - pdf_url
                - question
      responses:
        '200':
          description: Successfully retrieved answer from Claude API.
          content:
            application/json:
              schema:
                type: object
                properties:
                  answer:
                    type: string
                    description: The answer returned by Claude API based on the PDF content.
        '400':
          description: Bad request due to missing or invalid parameters.
          content:
            application/json:
              schema:
                type: object
                properties:
                  error:
                    type: string
                    description: Error message detailing the issue.
        '500':
          description: Internal server error due to Claude API or other processing issues.
          content:
            application/json:
              schema:
                type: object
                properties:
                  error:
                    type: string
                    description: Error message detailing the server error.
```

### **Replit Links**

[Firecrawl Replit](https://replit.com/@MarkK24/firecrawl?v=1)

[mem0](https://replit.com/@MarkK24/memo0?v=1)

[Claude PDF Analysis](https://replit.com/@MarkK24/Claude-PDF-Analysis?v=1)

### **Make Scenario for Google Calendar**

📎 **File:** [`blueprint (5).json`](files/blueprint (5).json)

# **Slide Deck in Video**

📎 **File:** [`custom gpt templates.pdf`](files/custom gpt templates.pdf)

# **Link to Tool Websites Used**

[Firecrawl](https://www.firecrawl.dev/)

[mem0](https://app.mem0.ai/)

[Make.com](https://www.make.com/)

[Claude PDF Analysis API](https://www.make.com/en)

# **Watch this for the Claude PDF Analysis Integration:**

[My YouTube Video on Claude PDF Analysis](https://youtu.be/1YFPZKHIbVA)

---

## **Want Access to DAILY Mad Scientist Content, coaching and more resources than you know what to do with?**

Join Early AI-dopters -- **no**, not another boring/generic community.

You'll be shocked at how awesome the content is, and how even MORE awesome the members are 🦾

[JOIN NOW](https://bit.ly/3ZMWJIb)
