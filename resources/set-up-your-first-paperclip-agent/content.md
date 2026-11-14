# Set Up Your First Paperclip Agent
# Set up your first Paperclip agent

Use a local test company to turn one small goal into a plan you can review. Paperclip manages the goal, tasks, approvals and budgets. Claude Code or Codex does the work through the adapter you connect.

## 1. Start Paperclip locally

Install Node.js 24.11 or later. Run these commands from your normal user account.

```
node --version
npx paperclipai@latest onboard --yes
```

Open http://localhost:3100 if the dashboard doesn’t open automatically. To start it again later, run `npx paperclipai run`. Keep the first test on your own machine. [Official](https://github.com/paperclipai/paperclip-docs/blob/main/docs/guides/getting-started/installation.md)[ ](https://github.com/paperclipai/paperclip-docs/blob/main/docs/guides/getting-started/installation.md)[installation](https://github.com/paperclipai/paperclip-docs/blob/main/docs/guides/getting-started/installation.md)[ ](https://github.com/paperclipai/paperclip-docs/blob/main/docs/guides/getting-started/installation.md)[guide](https://github.com/paperclipai/paperclip-docs/blob/main/docs/guides/getting-started/installation.md)

## 2. Give one agent a job you can grade

Create a company and give it a goal. For a first run, try this with a folder of sample notes:

> Turn these five sample support tickets into a one-page FAQ draft. Link each answer to its ticket number. Flag anything the tickets don’t answer. Leave the original files alone.

Add the first agent in **Agents**. Paperclip makes it the CEO. Choose Claude Code or Codex, install the matching CLI on the same machine, and connect a supported subscription or provider account. Run the connection test before you assign work. Give the agent a test folder without customer data or production credentials. [First-agent](https://github.com/paperclipai/paperclip-docs/blob/main/docs/guides/getting-started/your-first-agent.md)[ ](https://github.com/paperclipai/paperclip-docs/blob/main/docs/guides/getting-started/your-first-agent.md)[setup](https://github.com/paperclipai/paperclip-docs/blob/main/docs/guides/getting-started/your-first-agent.md)

## 3. Set the budget and review the plan

Set a small budget you can afford before enabling scheduled runs. Check the company and agent budgets in **Audit**** ****→**** ****Budgets** and review your provider billing separately. Paperclip is free to self-host. Model usage depends on the provider and plan you connect.

Run the agent once. If it submits a strategy, review the proposed work in **Approvals** before accepting it. Leave hiring approval enabled and review any proposed hire before adding it to the company. [Approvals](https://github.com/paperclipai/paperclip-docs/blob/main/docs/guides/day-to-day/approvals.md)[ ](https://github.com/paperclipai/paperclip-docs/blob/main/docs/guides/day-to-day/approvals.md)[guide](https://github.com/paperclipai/paperclip-docs/blob/main/docs/guides/day-to-day/approvals.md)

Read the run history and check the FAQ against the five tickets. If the draft invents an answer, tighten the task and try again with the same input. Add another agent once you can name a task the first one needs help with.
