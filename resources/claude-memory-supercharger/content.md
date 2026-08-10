# Claude Memory Supercharger 🧠 ⚡️
## **Refresher Steps on Setting Up MCP on Your Computer**

[Scribe Link](https://scribehow.com/shared/Warp_Claude_and_Docker_Desktop_Workflow__aF8PV4S6SxSVRhZoUTr-xQ)

## **Link to Warp**

[Link to Warp](https://www.warp.dev/)

## **Overview of Process in Miro (from YouTube video)**

[Miro Board](https://miro.com/app/board/uXjVIDg2wpY=/?share_link_id=135810401331)

## **Sample Requests to Run in Terminal**

**DIDN'T INCLUDE THIS IN THE VIDEO, BUT RUN THIS FIRST ONCE DOCKER IS INSTALLED**

```
docker build -t pinecone/assistant-mcp
```

Getting weird errors with this step? Check this Google Doc out: **Fix Errors**

**Then run this after getting your Pinecone Assistant credentials**

```
docker run -i --rm \
  -e PINECONE_API_KEY=pcsk_2puamw_RdVbNf87jWqGPLwCLginSxP6FkxTpgNutsXoD9KXgd4nmT7YWAGaKSiiNq3pHAi \
  -e PINECONE_ASSISTANT_HOST=https://prod-1-data.ke.pinecone.io \
  pinecone/assistant-mcp
```

## **Sample Demo Knowledge Files Shown in Video**

**Demo 1 Assets**

[Link to Google Drive](https://drive.google.com/drive/folders/1jUfEHJ1KUPLwMH87dzt1qMXcIFkEAYtW?usp=sharing)

**Demo 2 Assets (Holy Grail of Make Automations List + JSONs of Make Templates)**

[Link to Google Drive](https://drive.google.com/drive/folders/18Mgb4fbLFVC9V_VD-JWgcM8ymgMmTDiq?usp=sharing)

---

## **Want Access to DAILY Mad Scientist Content, coaching and more resources than you know what to do with?**

Join Early AI-dopters -- **no**, not another boring/generic community.

You'll be shocked at how awesome the content is, and how even MORE awesome the members are 🦾

[JOIN NOW](https://bit.ly/3ZMWJIb)
