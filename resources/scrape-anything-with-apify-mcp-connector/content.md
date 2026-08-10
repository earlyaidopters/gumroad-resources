# Scrape Anything with Apify MCP Connector
## **MCP Config Schema**

```
{
  "mcpServers": {
    "actors-mcp-server": {
      "command": "npx",
      "args": [
        "-y", 
        "@apify/actors-mcp-server",
        "--actors",
        "code_crafter/apollo-io-scraper,streamers/youtube-comments-scraper,compass/crawler-google-places,streamers/youtube-scraper,clockworks/tiktok-scraper,apify/instagram-scraper,apify/web-scraper,topaz_sharingan/Youtube-Transcript-Scraper-1,apidojo/tweet-scraper,apify/facebook-ads-scraper,harvestapi/linkedin-profile-search",
        "--enable-adding-actors"
      ],
      "env": {
        "APIFY_TOKEN": "INSERT APIFY API TOKEN KEY HERE"
      }
    }
  }
}
```

**Sample Prompt - YouTube Scraper**

```
Grab the transcript of the following youtube videos, and create a mindmap of the concepts they go over and blend the diagrams into one cohesive mermaid diagram.

1) https://youtu.be/OSHJFuoJJdA
2) https://youtu.be/5EuzpGw02SE
3) https://youtu.be/cwdPcbWwb2s
```

**Sample Prompt - TikTok Scraper**

```
find me tiktok videos with the hashtag aiasmr

find me 20 videos
```

**Sample Prompt - Instagram Scraper**

```
get the last 10 posts from this instagram page:
https://www.instagram.com/aidaily.insights/
```

**Sample Prompt - Google Maps Scraper**

```
Find me 20 solar companies in Toronto Canada and their business information (using Google Maps)
```

**Sample Prompt - X Scraper**

```
Scrape Sam Altman's X posts for the past 100 tweets and summarize the core themes and predict what OpenAI might be gearing up to release shortly based off of those posts alone.
```

**Sample Prompt - LinkedIn Search**

```
I'm starting a Gen AI consulting company and I want to find top talent that have the job title related to AI engineering who have ideally worked at Google or Facebook before too.

Ideally in the Toronto or Montreal area as well - go through LinkedIn Search and please provide the closest 10 matches I should reach out to.
```

---

## **Want Access to DAILY Mad Scientist Content, coaching and more resources than you know what to do with?**

Join Early AI-dopters -- **no**, not another boring/generic community.

You'll be shocked at how awesome the content is, and how even MORE awesome the members are 🦾

[JOIN NOW](https://bit.ly/3ZMWJIb)
