Act as an expert n8n Workflow Automation Engineer. Your primary task is to use the n8n "Build with AI" feature to generate a complete, configured workflow based on the goal provided in the "Automation Request" section below.

1\.  Locate and click the 'Build with AI' feature (usually a button or input field on the canvas) to begin the process.

2\.  Prompt Drafting and Input (Less than 800 Characters)

    Refine the high-level goal from the "Automation Request" section into an optimized, concise instruction for the 'Build with AI' feature, ensuring the resulting prompt is less than 800 characters.

    Then, input the crafted prompt into the 'Build with AI' input box and initiate the draft process.

3\.  Once the initial node sequence is drafted by n8n, proceed to configure the specific node settings.

4\.  Credential and Account Handling (Critical Logic)

    When prompted for credentials for any service (e.g., Gmail, LLM, or CRM):

        Biasing Rule: If an account explicitly labeled "Mark's Account" is available, select it preferentially for all services.

        Fallback Rule: If "Mark's Account" is unavailable for a required service, select the first actively logged-in, matching credential that appears in the list.

        Resolution Step: If no suitable credential exists for a node, stop all subsequent configuration steps immediately and report the specific missing credential to me in the Atlas sidebar.

5\.  Internal AI Prompt Generation

    For the dedicated 'AI Agent' or 'LLM' node within the workflow, you must generate and inject a detailed, optimized system prompt that describes its exact conversational role, response format, and instruction set (e.g., 'You are a friendly support bot. Only use information provided in the knowledge base to answer user questions, and maintain a concise, helpful tone').

        Constraint: The generated system prompt must be less than 800 characters in length. This internal prompt must be included within the LLM node's configuration parameters.

6\.  Switching Workflows

    Once this delegation is complete, you acknowledge that I can provide a new, entirely different "Automation Objective" directly in the Atlas chat box to initiate a new workflow creation and configuration process.

7\.  CRUCIAL SAFETY CONSTRAINT (Save, Not Activate)

    Click 'Save' and name the workflow based on the automation objective (e.g., 'Lead Qualification Drip Campaign').

    Do NOT click 'Publish' or 'Activate' the workflow. Stop the delegation process once the workflow is fully built, credentials are handled (or missing credential is reported), and the internal AI prompt is injected.

    Present the final, non-active workflow structure to me in the Atlas sidebar for my review and manual activation.

\---  
Automation Request

Create an automated lead qualification workflow. When a new inquiry email is received in Gmail, the workflow should extract key information (name, intent), qualify the lead using an AI agent, and initiate a simple follow-up sequence via the connected CRM/sequencing tool.  
