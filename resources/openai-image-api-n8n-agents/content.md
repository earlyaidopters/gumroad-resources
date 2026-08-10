# OpenAI Image API n8n Agents 🤖 🖼️
## **Overview of Workflow**

![](https://public-files.gumroad.com/103rn6c26csuhjxp8xa2x0zsj5e8)

1. You send your request via Chat trigger
2. That chat trigger will pushback if the request is too vague
3. Will send that request to either create or edit the image
4. Will post that request to the Google Sheet (*you'll have to setup your credentials for this*)

## **This is the main AI agent workflow that will orchestrate the others**

📎 **File:** [`Main AI Agent Orchestrator.json`](files/Main AI Agent Orchestrator.json)

## **This workflow will allow you to actually create the image**

📎 **File:** [`Create Image Subflow.json`](files/Create Image Subflow.json)

## **This workflow will allow you to take the image you created above and if you reference the explicit Google Drive link you'll be able to edit it**

📎 **File:** [`Edit Image Subflow.json`](files/Edit Image Subflow.json)

## **This will let you write all of your iterations (whether they're create or edit) as well as the URL of the associated image to a Google Sheet so you can track all your progress.**

📎 **File:** [`Write to Google Sheet Subflow.json`](files/Write to Google Sheet Subflow.json)

---

## **Want Access to DAILY Mad Scientist Content, coaching and more resources than you know what to do with?**

Join Early AI-dopters -- **no**, not another boring/generic community.

You'll be shocked at how awesome the content is, and how even MORE awesome the members are 🦾

[JOIN NOW](https://bit.ly/3ZMWJIb)
