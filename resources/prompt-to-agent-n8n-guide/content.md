# Prompt-to-Agent n8n Guide 🦾
## **Link to Custom GPT**

[n8n Co-Pilot Custom GPT](https://chatgpt.com/g/g-67a902b41cf08191b81587b53a8fdfa7-n8n-co-pilot)

## **Link to Entire Chat Sessions Wrangling with Deep Research**

[Sample Chat 1](https://chatgpt.com/share/67b36f5c-41b0-8011-a4c4-22f64b96102f)

[Sample Chat 2](https://chatgpt.com/share/67b36f82-ab54-8011-8fea-b7d4938d682b)

[Sample Chat 3](https://chatgpt.com/share/67b36eeb-c540-8011-9f69-5a329226eafb)

### **Sample "Jarvis" Prompt (for use with Deep Research)**

```
Do full research on how to build n8n workflows using JSON.  I want to be able to use an LLM to create an entire automation flow in n8n.

Research the newest builds and module builds that will let you create all kinds of triggers and workflows, just through writing JSON formatted perfectly to be imported in n8n.

Ensure the following in your output JSON: 

1) PropertyName issues: There are no reasons to get propertyName is property value errors, and you generate perfect syntax.

2) Comments Removed: No inline comments (using //) cause the JSON to be invalid.

3) Expressions: The expressions using ={{ ... }} remain intact. These are valid in n8n's JSON configuration as they are processed at runtime.

4) Structure: The structure with "nodes" and "connections" is preserved as expected by n8n.

Here's the exact workflow I'd like to create in n8n:

Trigger → Telegram Trigger (Receives message)
Decision → Switch (Checks if message is audio, text, or error)
If Audio → Get Voice File
→ Speech to Text (Transcribe Recording)
If Text → Edit Fields (Manual processing)
Processing → J.A.R.V.I.S (AI Tools Agent)
Uses:
OpenAI Chat Model
Window Buffer Memory
Gmail (get message)
Get Calendar (get all events)
Contacts (search record)
Tasks (search record)
Create Contact (create record)
SerpAPI
Hacker News (get all)
Calculator
AI Model → Basic LLM Chain
Response Handling
Text Response → Send Telegram Message (Text)
Audio Response →
Text to Speech (API call to ElevenLabs)
Send Telegram Message (Audio)
Alternative Processing → Uses Anthropic Chat Model for additional AI processing.
```

---

## **Want Access to DAILY Mad Scientist Content, coaching and more resources than you know what to do with?**

Join Early AI-dopters -- **no**, not another boring/generic community.

You'll be shocked at how awesome the content is, and how even MORE awesome the members are 🦾

[JOIN NOW](https://bit.ly/3ZMWJIb)
