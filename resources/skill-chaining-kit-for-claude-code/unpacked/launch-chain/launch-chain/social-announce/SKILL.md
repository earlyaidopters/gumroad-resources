---
name: social-announce
description: Generate LinkedIn post copy and Twitter/X thread copy to announce a new offer. Reads previous launch outputs if available.
---

Generate social media announcement copy for: "$ARGUMENTS"

## Instructions

1. Check for existing launch assets at `outputs/launch/!`date +%Y-%m-%d`/{slug}/` (where {slug} is the offer name lowercased with hyphens)
   - Read any available files (market scan, sales page, email sequence) for context
2. Write one LinkedIn post and one Twitter/X thread
3. These are copy only. Just the text, ready to paste.

## Writing rules

- No em dashes. Use commas or periods.
- No colons in any copy.
- No hashtag spam. Max 3 hashtags on LinkedIn, zero on Twitter.
- Sound like a real person sharing something they made, not a brand account.
- LinkedIn can be longer and more storytelling. Twitter needs to be punchier.

## Output

Write the result to `outputs/launch/!`date +%Y-%m-%d`/{slug}/04_social_posts.md`. Create the directory if needed.

Use this structure:

```markdown
# Social Announcement: [Offer Name]
*Generated !`date +%Y-%m-%d`*

---

## LinkedIn Post

[The full post. 150-250 words. Start with a hook line that stops the scroll. Tell a short story or share an insight. Transition naturally to the offer. End with a clear CTA. Add 2-3 relevant hashtags at the bottom.]

---

## Twitter/X Thread (5-7 tweets)

**Tweet 1 (Hook)**
[The scroll-stopper. Bold claim or surprising insight. Must stand alone.]

**Tweet 2**
[Expand on the hook. Add context or a quick story.]

**Tweet 3**
[The problem this solves. Make it relatable.]

**Tweet 4**
[What the offer includes. Keep it scannable.]

**Tweet 5**
[Social proof, a result, or a specific detail that builds credibility.]

**Tweet 6 (CTA)**
[Clear call to action. Link placeholder: [LINK]. Keep it simple.]

**Tweet 7 (Optional - Engagement)**
[A question or retweet prompt. Something that invites replies.]
```

The LinkedIn post should feel like a genuine update, not an ad. The Twitter thread should feel like sharing something you're excited about.
