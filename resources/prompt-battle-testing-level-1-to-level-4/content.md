# Prompt Battle Testing (Level 1 to Level 4)
---

## **Want Access to DAILY Mad Scientist Content, coaching and more resources than you know what to do with?**

Join Early AI-dopters -- **no**, not another boring/generic community.

You'll be shocked at how awesome the content is, and how even MORE awesome the members are🦾

[JOIN NOW](https://bit.ly/3ZMWJIb)

---

**Level 1 - Custom GPT**

[Battle Tester GPT](https://chatgpt.com/g/g-kVzd6l0ST-prompt-battle-tester)

**Level 2 - Google Sheet**

[GPT for Sheets Integration](https://docs.google.com/spreadsheets/d/1ocnW9CInyHSUY__D2tESRH5lc2_H2hysWCKJV7Xw6bQ/edit?usp=sharing)

[GPT for Sheets Add-On](https://workspace.google.com/marketplace/app/gpt_for_sheets_and_docs/677318054654)

**Level 3 - Airtable + Make (Static Prompt)**

***Javascript for Battle Test Button***

```
let table = base.getTable("Prompt Testing");
let query = await table.selectRecordsAsync();

// Prompt user to pick a record
let record = await input.recordAsync('Pick a record', table);

if (record) {
   let recordId = record.id;
   let taskGoal = record.getCellValue("Task Goal") || 'Default value if empty';

   // Prepare the payload
   let payload = JSON.stringify({
       recordId: recordId,
       taskGoal: taskGoal
   });

   console.log("Sending payload:", payload); // Log the payload to debug

   // Webhook URL setup (new webhook provided)
   let webhookUrl = "PUT_YOUR_WEBHOOK_HERE";

   let response = await fetch(webhookUrl, {
       method: 'POST',
       headers: {
           'Content-Type': 'application/json'
       },
       body: payload
   });

   if (response.ok) {
       output.text('Task Goal and Prompts Triggered!');
   } else {
       let error = await response.text(); // Get more detailed error message
       console.error("Failed to trigger webhook:", error);
       output.text('Something went wrong with the task.');
   }
} else {
   output.text('No record selected.');
}
```

📎 **File:** [`Prompt Battle Testing (Make File).json`](files/Prompt Battle Testing (Make File).json)

**Level 4 - Airtable + Make (Conversational Prompt)**

Javascript for Simulate Button

```
let table = base.getTable("Simulated Conversations");
let query = await table.selectRecordsAsync();

// Prompt user to pick a record
let record = await input.recordAsync('Pick a record', table);

if (record) {
   let recordId = record.id;
   let systemPrompt = record.getCellValue("System Prompt") || '';  // Updated column name
   let simulatedUserPrompt = record.getCellValue("User Prompt") || '';  // Updated column name

   // Prepare the payload with the recordId and updated prompt names
   let payload = JSON.stringify({
       recordId: recordId,
       systemPrompt: systemPrompt,  // Updated to System Prompt
       simulatedUserPrompt: simulatedUserPrompt  // Updated to Simulated User Prompt
   });

   console.log("Sending payload to Make webhook:", payload); // Log the payload for debugging

   // Webhook URL setup (provided webhook)
   let webhookUrl = "PUT_YOUR_WEBHOOK_HERE";

   let response = await fetch(webhookUrl, {
       method: 'POST',
       headers: {
           'Content-Type': 'application/json'
       },
       body: payload
   });

   // Handle the response: JSON or plain text
   let contentType = response.headers.get('content-type');
  
   if (response.ok) {
       if (contentType && contentType.includes('application/json')) {
           let result = await response.json();  // Parse JSON response
           console.log('Result from Make webhook (JSON):', result);

           // Update Airtable fields with responses (User Response 1, Assistant Response 1, etc.)
           await table.updateRecordAsync(record.id, {
               'User Response 1': result.userResponse1,
               'Assistant Response 1': result.assistantResponse1,
               'User Response 2': result.userResponse2,
               'Assistant Response 2': result.assistantResponse2,
               'User Response 3': result.userResponse3,
               'Assistant Response 3': result.assistantResponse3,
           });

           output.text('Conversation simulation completed!');
       } else {
           let textResult = await response.text();  // Parse plain text response
           console.log('Received non-JSON response:', textResult);
           output.text('Simulation completed with non-JSON response: ' + textResult);
       }
   } else {
       let error = await response.text();  // Get detailed error message
       console.error("Failed to trigger webhook:", error);
       output.text('Something went wrong with the simulation.');
   }
} else {
   output.text('No record selected.');
}
```

📎 **File:** [`Simulated Conversation Testing (Make).json`](files/Simulated Conversation Testing (Make).json)

**Overall Processes Deck**

📎 **File:** [`Battle Testing Prompts.pdf`](files/Battle Testing Prompts.pdf)
