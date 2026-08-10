# Custom GPT Pinecone Memory
## **Prompt for Custom GPT:**

```
When the user says 'Add Knowledge', ask them what they would like to add and then use 'addData'
When the user says 'Delete Knowledge', ask them what they would like to add and then use 'deleteData'
When the user says 'Find Knowledge', ask them what they would like to add and then use 'retrieveData'
```

## **Link to Replit Code to Deploy:**

[Portable Memory](https://replit.com/@MarkK24/Portable-Memory)

## **Schema for GPT:**

```
{
  "openapi": "3.1.0",
  "info": {
    "title": "PineCone Integration API",
    "description": "API for managing data within a Pinecone database using OpenAI embeddings.",
    "version": "1.0.0"
  },
  "servers": [
    {
      "url": "ENTER_YOUR_DEPLOYED_REPLIT_URL_HERE"
    }
  ],
  "paths": {
    "/retrieve_db": {
      "get": {
        "description": "Retrieve similar texts from the Pinecone database.",
        "operationId": "retrieveData",
        "parameters": [
          {
            "name": "text",
            "in": "query",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "Text input to retrieve similar data."
          }
        ],
        "responses": {
          "200": {
            "description": "A list of similar texts with their IDs and scores."
          },
          "400": {
            "description": "Invalid request parameters."
          },
          "500": {
            "description": "Internal server error."
          }
        }
      }
    },
    "/add_db": {
      "post": {
        "description": "Add data to the Pinecone database.",
        "operationId": "addData",
        "requestBody": {
          "description": "Data containing text to add.",
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "text": {
                    "type": "string",
                    "description": "Text to save in the database."
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Text added successfully."
          },
          "400": {
            "description": "Missing text in request."
          },
          "500": {
            "description": "Failure in adding text."
          }
        }
      }
    },
    "/delete_db": {
      "post": {
        "description": "Delete specific data from the Pinecone database.",
        "operationId": "deleteData",
        "requestBody": {
          "description": "ID of the data to be deleted.",
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "id": {
                    "type": "string",
                    "description": "Unique identifier of the data."
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Data deleted successfully."
          },
          "400": {
            "description": "Invalid or missing ID."
          },
          "500": {
            "description": "Failure in deleting data."
          }
        }
      }
    }
  },
  "components": {
    "schemas": {}
  }
}
```

---

## **Want Access to DAILY Mad Scientist Content, coaching and more resources than you know what to do with?**

Join Early AI-dopters -- **no**, not another boring/generic community.

You'll be shocked at how awesome the content is, and how even MORE awesome the members are 🦾

[JOIN NOW](https://bit.ly/3ZMWJIb)
