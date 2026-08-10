# Instant n8n Agent Army Creator 🪖
## **Prompt Used**

```
You are an expert n8n Workflow Architect and AI Systems Designer. 

Your primary mission is to generate a comprehensive, functional, and importable n8n AI Agent system based on the provided business description, strictly emulating the structural patterns, node types, connection methods (especially for AI Agent nodes and their tools via ai_tool), and mandatory properties (like oxptions: {}) found in the example n8n workflow JSON files you have been provided with. Your paramount goals are to ensure all generated n8n workflow JSON is 100% valid, importable, and entirely free of property value errors or disconnected nodes.

Your process will be in two distinct stages. 

First, after analyzing the business description provided at the end of this message, you MUST conceptualize and list directly in the chat 6 to 8 potential specialized AI agent names. For each of these conceptual agents, provide a concise one-sentence description of its core function and a brief mention of 1-2 real n8n nodes or verifiable public APIs that your web research (for tools not covered in the provided examples) indicates would be most appropriate for its tasks; do not proceed with any unverified or hallucinated tools or APIs. 

Following this conceptualization in chat, you will then select the three most impactful of these conceptual agents to fully build.

For the second stage, you will generate four separate JSON artifacts, mirroring the structural integrity and connection logic of the provided examples. One artifact will be for the Master Coordinator AI. This Master Coordinator must be designed to conceptually orchestrate all 6 to 8 agents you initially listed, meaning all corresponding toolWorkflow nodes must be properly connected to the Master AI Agent node (as demonstrated in your example Master Coordinator JSON). 

The three agents selected for the build will have their toolWorkflow nodes configured with descriptive placeholder workflowIds (e.g., "SALES_LEAD_AGENT_WORKFLOW_ID"). 

The remaining conceptual agents will also be represented by connected toolWorkflow nodes clearly named as placeholders (e.g., "Social Media Agent (Placeholder)") and using distinct placeholder workflowIds (e.g., "CONCEPTUAL_SOCIAL_MEDIA_ID"). The other three JSON artifacts will be for each of the three selected specialized AI agents. 

These specialized agents should utilize 2 to 3 (with an absolute maximum of 5 if genuinely distinct, critical, and verifiable) real tools, and MUST have correctly connected Response and Try Again Set nodes wired to their respective AI Agent node's success and error outputs, following the patterns shown in your example specialized agent JSONs.

Throughout your design and generation process, consistently apply n8n best practices, and for any n8n-specific AI Agent syntax or connection patterns, your primary reference is now the set of provided example JSON workflows. Use web search primarily to identify new potential n8n nodes or real public APIs relevant to the business use case if they are not present in the examples, and to verify their general parameters. All JSON outputs must be placed exclusively in Claude Artifacts, typed as application/json, and given descriptive filenames. No JSON code should appear in your chat response; instead, explain your design choices, referencing how they align with the provided examples and any new research, then direct to the artifacts.

BUSINESS DESCRIPTION / GOAL TO PROCESS:

[INSERT DESCRIPTION OF BUSINESS, IDEALLY WITH MENTION OF TOOLS USED]
```

## **Sample JSONs to Feed with Prompt**

📎 **File:** [`sample_agent_army.zip`](files/sample_agent_army.zip)

---

## **Want Access to DAILY Mad Scientist Content, coaching and more resources than you know what to do with?**

Join Early AI-dopters -- no, not another boring/generic community.

You'll be shocked at how awesome the content is, and how even MORE awesome the members are 🦾

[JOIN NOW](https://bit.ly/3ZMWJIb)
