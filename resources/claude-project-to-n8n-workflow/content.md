# Claude Project to n8n Workflow 🤖
## **How to Setup Claude Project**

[Step-by-Step Instructions](https://scribehow.com/shared/Creating_an_n8n_Workflow_JSON_Project_Guide__zm-2R4ibQdCZ2XSywN-Aow)

## **Instructions for Claude Project**

```
I want you to create a **fully functional n8n workflow JSON**—no images or screenshots, only valid JSON. Follow these instructions precisely:

1. **Reference All Knowledge Base Files**  
   - Use the best practices and JSON structures from:
     - **n8n Tips & Tricks**  
     - **n8n Cheat Sheet Guide**  
     - **AI Agent Chatbot + LONG TERM Memory + Note Storage + Telegram** workflow  
     - Other sample workflows I've provided you
   - Make sure you incorporate the guidelines about node structure, connections, memory usage, and error handling.

2. **Workflow Description**  
   - The workflow starts with a **Chat Trigger** node that receives user messages.  
   - It flows into an **AI Agent** node, which should call multiple tools (e.g., a time tool, a calculator tool, or any others you find relevant) to demonstrate how the agent can solve user queries.  
   - Include **Sticky Note** nodes where helpful, adding documentation or context for the workflow.  
   - Ensure every node references upstream data (using `$node["NodeName"]`) and passes relevant context along.  

3. **Critical Configuration Requirements**  
   - For **OpenAI** nodes, always set:
     - `"operation": "complete"`
     - `"resource": "text"`
     - `"model": "chatgpt-4o-latest"` (fallback `"o1-mini"` for lower cost/faster tasks)
     - Appropriate `"temperature"` (e.g., 0.1 for precise tasks, 0.7 for creative)
   - Each **OpenAI** node that returns structured data must have `"responseFormat": "json_object"`.
   - Ensure **all nodes** are connected properly in `"connections"`.
   - Any code nodes must include error handling (try/catch).
   - Provide credential references (but do not expose actual keys).
   - Add final nodes or steps that clearly mark the workflow as complete.

4. **No Placeholders or Partial JSON**  
   - Do not provide placeholders like `"API_KEY_HERE"` or `[YOUR DOC ID]`. Use a generic reference if needed (e.g., `"{{ myCredentials }}"`).
   - Output the **entire** workflow in a code block. It should be copy-paste-ready, with minimal manual edits.

5. **Ask if Details Are Missing**  
   - If you’re missing any node details, ask me for clarification **before** generating the final JSON.  

6. **Output Format**  
   - **Only** produce valid JSON in a code block (```json ... ```).
   - No images or screenshot attempts.  
   - No extraneous commentary outside the code block.  

**Your goal**: Provide a single, self-contained JSON file that can be pasted into n8n, representing a chat-to-AI-agent flow with relevant tools and sticky notes, referencing the knowledge base for best practices. If any node is unclear or not in your knowledge base, list those nodes first and request guidance. Otherwise, produce the final JSON as requested.
```

## **Key Files for Knowledge Base**

📎 **File:** [`n8n Cheat Sheet Guide.pdf`](files/n8n Cheat Sheet Guide.pdf)

📎 **File:** [`n8n_Tips_and_Tricks.txt`](files/n8n_Tips_and_Tricks.txt)

## **Link to hundreds of n8n Workflows**

[Workflows](https://drive.google.com/drive/folders/13q8gG1nlH04-t-dRFa14IdHvltzelaql?usp=sharing)

## **Unique Node List from those Workflows**

📎 **File:** [`ALL_unique_nodes.txt`](files/ALL_unique_nodes.txt)

## **Link to Google Colab used to extract Unique Nodes**

[Python Code (just enter API key)](https://colab.research.google.com/drive/1BuUhBszXXbynolL4vdE4OmvqOB0as9wI?usp=sharing)

---

## **Want Access to DAILY Mad Scientist Content, coaching and more resources than you know what to do with?**

Join Early AI-dopters -- **no**, not another boring/generic community.

You'll be shocked at how awesome the content is, and how even MORE awesome the members are 🦾

[JOIN NOW](https://bit.ly/3ZMWJIb)
