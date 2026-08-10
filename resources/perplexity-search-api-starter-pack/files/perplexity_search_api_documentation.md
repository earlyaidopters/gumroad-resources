# Perplexity Search API Documentation
*September 2025 Release*

## Overview
Perplexity launched its Search API on September 25, 2025, providing developers direct access to hundreds of billions of indexed webpages with sub-document precision and real-time updates. The API provides two main endpoints:
- **Search API**: Raw web search results at `https://api.perplexity.ai/search`
- **Chat Completions**: AI-generated answers with integrated web research at `https://api.perplexity.ai/chat/completions`

## API Endpoints & Basic Usage

### 1. Find Results - Raw Search
Direct web search returning ranked results with snippets.

```bash
curl https://api.perplexity.ai/search \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": [
      "What is Comet Browser?",
      "Perplexity AI",
      "Perplexity Changelog"
    ]
  }' | jq
```

**Response includes:**
- Title
- URL
- Snippet (pre-extracted relevant text)
- Date
- Last updated timestamp

### 2. Chat with Grounded Search
AI-generated responses with real-time web data integration.

```bash
curl https://api.perplexity.ai/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "sonar-pro",
    "messages": [
      {
        "role": "user", 
        "content": "What are the major AI developments and announcements from today across the tech industry?"
      }
    ]
  }' | jq
```

**Available Models:**
- `sonar` - Basic model ($1 per million tokens)
- `sonar-pro` - Advanced model ($15 per million output tokens)
- `sonar-deep` - Deep research model ($8 per million tokens)

### 3. Filter Your Sources with Domain Control
Control which domains to include or exclude from search results.

```bash
curl https://api.perplexity.ai/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "sonar",
    "messages": [
      {
        "role": "user", 
        "content": "What are the most promising machine learning breakthroughs in computer vision and multimodal AI from recent arXiv publications?"
      }
    ],
    "web_search_options": {
      "search_domain_filter": ["arxiv.org"],
      "search_recency_filter": "month"
    }
  }' | jq
```

### 4. Structured Outputs
Get responses in structured JSON format.

```bash
curl https://api.perplexity.ai/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "sonar-pro",
    "messages": [
      {
        "role": "user",
        "content": "Find the top 3 trending AI startups with recent funding. Include company name, funding amount, and focus area."
      }
    ],
    "response_format": {
      "type": "json_schema",
      "json_schema": {
        "schema": {
          "type": "object",
          "properties": {
            "startups": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "company_name": {"type": "string"},
                  "funding_amount": {"type": "string"},
                  "focus_area": {"type": "string"}
                },
                "required": ["company_name", "funding_amount", "focus_area"]
              }
            }
          },
          "required": ["startups"]
        }
      }
    }
  }' | jq
```

## Domain Filtering - IMPORTANT

### Correct Parameter Structure
The Perplexity API uses **`search_domain_filter`** as the parameter for domain filtering. This parameter must be placed inside `web_search_options`.

**To EXCLUDE domains (denylist mode):**
```json
{
  "web_search_options": {
    "search_domain_filter": ["-wikipedia.org", "-reddit.com", "-pinterest.com"]
  }
}
```

**To INCLUDE only specific domains (allowlist mode):**
```json
{
  "web_search_options": {
    "search_domain_filter": ["arxiv.org", "nature.com", "science.org"]
  }
}
```

### Domain Filtering Rules
- Prefix domains with `-` (minus) to exclude them
- Without prefix, domains are treated as an allowlist
- **Cannot mix** include and exclude in same request
- Maximum 20 domains (though some users report 3-domain limit in practice)
- Use simple domain names without protocols: `wikipedia.org` not `https://www.wikipedia.org`
- Domain filtering includes all subdomains automatically

### Common Domain Filter Examples

**Academic Sources Only:**
```json
"search_domain_filter": ["arxiv.org", "scholar.google.com", "nature.com", "science.org", "ieee.org"]
```

**Exclude Social Media:**
```json
"search_domain_filter": ["-reddit.com", "-twitter.com", "-facebook.com", "-pinterest.com", "-quora.com"]
```

**Developer Resources Only:**
```json
"search_domain_filter": ["github.com", "stackoverflow.com", "dev.to", "medium.com"]
```

## Search Options Parameters

### web_search_options Object
All search-related parameters go inside `web_search_options`:

```json
{
  "web_search_options": {
    "search_domain_filter": ["domain.com"],
    "search_recency_filter": "month",
    "search_context_size": 10
  }
}
```

### search_recency_filter Options
- `"day"` - Last 24 hours
- `"week"` - Last 7 days  
- `"month"` - Last 30 days
- `"year"` - Last 365 days

### Additional Parameters
- `max_tokens_per_page`: Control token extraction depth (default: 1024)
- `max_results`: Number of results to return (Search API only)
- `search_context_size`: Number of search results to consider

## Pricing

### Search API
- **$5 per 1,000 requests** (flat rate, no token fees)
- Includes all filtering and domain controls
- No additional charges for features

### Chat Completions (Sonar Models)
- **Sonar Basic**: $1 per million tokens
- **Sonar Pro**: $5 per million input / $15 per million output tokens  
- **Sonar Deep**: $8 per million tokens
- Additional fees for Deep Research: $2 citations, $5 search queries, $3 reasoning

### Rate Limits by Tier
- **Tier 0** (Free): Basic access
- **Tier 1** ($10+ spend): Higher RPM
- **Tier 3**: Beta features like domain filtering
- **Tier 5** ($5,000+ spend): Enterprise throughput

## Common Issues & Solutions

### Issue: Domain filtering not working
**Problem:** Wikipedia still appears despite exclusion
**Solution:** 
1. Ensure using `search_domain_filter` not `exclude_domains`
2. Place parameter inside `web_search_options`
3. Use minus prefix: `["-wikipedia.org"]`

### Issue: OpenAI SDK Compatibility
**Problem:** `TypeError: unexpected keyword argument 'search_domain_filter'`
**Solution:** Use direct HTTP requests instead of OpenAI Python SDK:

```python
import requests

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

payload = {
    "model": "sonar-pro",
    "messages": [{"role": "user", "content": "Your query"}],
    "web_search_options": {
        "search_domain_filter": ["-reddit.com", "-pinterest.com"]
    }
}

response = requests.post("https://api.perplexity.ai/chat/completions", 
                         headers=headers, json=payload)
```

### Issue: No academic/SEC filing filter
**Solution:** Use domain filtering to target specific sources:
- Academic: `["arxiv.org", "scholar.google.com", "aclweb.org"]`
- SEC: `["sec.gov", "edgar.sec.gov"]`

## n8n Integration Examples

### Basic HTTP Request Node Configuration
1. **Method**: POST
2. **URL**: `https://api.perplexity.ai/chat/completions`
3. **Authentication**: Header Auth
   - Name: `Authorization`
   - Value: `Bearer YOUR_API_KEY`
4. **Headers**: 
   - `Content-Type`: `application/json`
5. **Body Type**: JSON

### Example for Multi-Agent Workflow

**Academic Research Agent:**
```json
{
  "model": "sonar",
  "messages": [
    {
      "role": "user", 
      "content": "{{$json.query}}"
    }
  ],
  "web_search_options": {
    "search_domain_filter": ["arxiv.org", "scholar.google.com", "semanticscholar.org"],
    "search_recency_filter": "month"
  }
}
```

**Practical Examples Agent:**
```json
{
  "model": "sonar",
  "messages": [
    {
      "role": "user", 
      "content": "{{$json.query}}"
    }
  ],
  "web_search_options": {
    "search_domain_filter": ["github.com", "huggingface.co", "medium.com"],
    "search_recency_filter": "week"
  }
}
```

**Innovation Research Agent:**
```json
{
  "model": "sonar-pro",
  "messages": [
    {
      "role": "user", 
      "content": "{{$json.query}}"
    }
  ],
  "web_search_options": {
    "search_domain_filter": ["openai.com", "anthropic.com", "deepmind.com"],
    "search_recency_filter": "day"
  }
}
```

## Key Differences from Competitors

### vs Google Search API
- **Perplexity**: AI-optimized formatting, sub-document precision
- **Google**: Traditional web results, 10 results per query limit

### vs Exa
- **Perplexity**: Real-time indexing, broader coverage
- **Exa**: Semantic focus, curated approach

### vs Bing
- **Perplexity**: Dedicated parameter structure
- **Bing**: Requires query string manipulation

## Best Practices

1. **Start with broad searches** then narrow with domain filtering
2. **Use recency filters** for time-sensitive queries
3. **Combine multiple searches** for comprehensive research
4. **Test with curl first** before implementing in code
5. **Monitor rate limits** - implement exponential backoff
6. **Cache responses** when appropriate to reduce costs
7. **Use structured outputs** for predictable parsing

## Quick Testing

Test the API immediately with this minimal example:

```bash
curl -X POST https://api.perplexity.ai/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "sonar",
    "messages": [{"role": "user", "content": "Hello, what is 2+2?"}]
  }'
```

## Additional Resources
- API Documentation: https://docs.perplexity.ai
- API Key Management: https://www.perplexity.ai/account/api/group
- Community Forum: https://community.perplexity.ai
- Status Page: https://status.perplexity.ai

## Notes
- API launched September 25, 2025
- Currently in v0 (beta) - expect changes
- Domain filtering is Tier 3 beta feature
- No backwards compatibility guarantee yet
- Real-time indexing processes tens of thousands of updates per second
