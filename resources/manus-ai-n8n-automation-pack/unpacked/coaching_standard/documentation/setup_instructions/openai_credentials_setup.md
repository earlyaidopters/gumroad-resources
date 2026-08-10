# OpenAI API Credentials Setup Guide

This guide will walk you through the process of setting up OpenAI API credentials for use with your n8n workflows. The OpenAI integration is used in multiple workflows to generate content, quotes, emails, and other text-based elements.

## Prerequisites

- An OpenAI account
- A payment method added to your OpenAI account (required for API access)
- n8n instance up and running

## Step 1: Create an OpenAI Account

If you don't already have an OpenAI account:

1. Go to [https://platform.openai.com/signup](https://platform.openai.com/signup)
2. Sign up with your email or Google/Microsoft account
3. Verify your email address
4. Complete the onboarding process

## Step 2: Add a Payment Method

OpenAI requires a payment method for API access:

1. Log in to your OpenAI account
2. Navigate to the Billing section
3. Click on "Payment methods"
4. Add a credit card or other supported payment method
5. Set usage limits if desired to control costs

## Step 3: Create an API Key

1. Log in to your OpenAI account
2. Navigate to [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
3. Click "Create new secret key"
4. Give your key a descriptive name (e.g., "n8n Coaching Workflows")
5. Copy the API key immediately and store it securely - you won't be able to see it again!

## Step 4: Configure OpenAI Credentials in n8n

1. Open your n8n instance
2. Click on "Settings" in the left sidebar
3. Select "Credentials"
4. Click "Add Credential"
5. Search for and select "OpenAI API"
6. Fill in the following details:
   - **Credential Name**: Give it a descriptive name like "OpenAI Coaching Content"
   - **API Key**: Paste your OpenAI API key
7. Click "Save" to store your credentials

## Step 5: Test Your OpenAI Credentials

1. Create a new workflow in n8n
2. Add an "OpenAI" node
3. In the node settings, select your newly created credentials
4. Configure a simple test prompt
5. Execute the node to verify the credentials are working correctly

## Usage Considerations

- **Cost Management**: OpenAI charges based on the number of tokens processed. Monitor your usage to control costs.
- **Rate Limits**: Be aware of OpenAI's rate limits, especially if running workflows frequently.
- **Model Selection**: Different models have different capabilities and costs:
  - GPT-4 is more capable but more expensive
  - GPT-3.5-turbo is more affordable for routine tasks
- **Token Limits**: Each model has maximum token limits for context and responses.

## Troubleshooting

- **Authentication Error**: Verify your API key is correctly copied and still valid
- **Rate Limit Exceeded**: Add delays between API calls or reduce workflow frequency
- **Content Policy Violation**: Ensure your prompts comply with OpenAI's content policy
- **High Costs**: Review your usage in the OpenAI dashboard and adjust workflow frequency or model selection

## Security Best Practices

- Never share your OpenAI API key
- Regularly rotate your API keys
- Set usage limits in your OpenAI account
- Consider using environment variables for storing API keys in production environments

By following this guide, you'll have successfully set up OpenAI API credentials for use in your n8n coaching workflows. These credentials will be used across multiple workflows for content generation, personalized emails, and other text-based tasks.
