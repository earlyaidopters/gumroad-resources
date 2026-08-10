// background.js - Service Worker

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getApiKey') {
    chrome.storage.sync.get(['openaiApiKey'], (result) => {
      if (chrome.runtime.lastError) {
        console.error('Prompt-ify: Error getting API key:', chrome.runtime.lastError.message);
        sendResponse({ apiKey: null, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ apiKey: result.openaiApiKey });
      }
    });
    return true; // Indicates that the response is sent asynchronously
  } else if (request.action === 'saveApiKey') {
    const { apiKey } = request.data;
    chrome.storage.sync.set({ 'openaiApiKey': apiKey }, () => {
      if (chrome.runtime.lastError) {
        console.error('Prompt-ify: Error saving API key:', chrome.runtime.lastError.message);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        console.log('Prompt-ify: API key saved successfully.');
        sendResponse({ success: true });
      }
    });
    return true; // Indicates that the response is sent asynchronously
  } else if (request.action === 'callOpenAI') {
    const { model, systemPrompt, userPrompt, maxTokens } = request.data;
    let currentApiKey = request.data.apiKey;

    const performApiCall = (apiKeyToUse) => {
      fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKeyToUse}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.2,
          max_tokens: parseInt(maxTokens, 10) || 1000,
          frequency_penalty: 0.0
        })
      })
      .then(response => {
        if (!response.ok) {
          return response.json().then(errorData => {
            const errorMessage = errorData.error?.message || response.statusText || 'Unknown API error';
            throw new Error(`API Error (${response.status}): ${errorMessage}`);
          }).catch(() => {
            throw new Error(`API Error (${response.status}): ${response.statusText || 'Failed to connect to OpenAI API'}`);
          });
        }
        return response.json();
      })
      .then(data => {
        if (data.choices && data.choices.length > 0 && data.choices[0].message && data.choices[0].message.content) {
          sendResponse({ success: true, content: data.choices[0].message.content.trim() });
        } else {
          console.error('Prompt-ify: Unexpected response structure from OpenAI:', data);
          throw new Error('Invalid response structure from OpenAI API.');
        }
      })
      .catch(error => {
        console.error('Prompt-ify: OpenAI API call failed:', error);
        sendResponse({ success: false, error: error.message });
      });
    };

    if (!currentApiKey) {
      chrome.storage.sync.get(['openaiApiKey'], (result) => {
        if (chrome.runtime.lastError) {
          console.error('Prompt-ify: Error getting API key from storage:', chrome.runtime.lastError.message);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          currentApiKey = result.openaiApiKey;
          if (!currentApiKey) {
            sendResponse({ success: false, error: 'OpenAI API Key is missing. Please set it in the overlay.' });
          } else {
            performApiCall(currentApiKey);
          }
        }
      });
    } else {
      performApiCall(currentApiKey);
    }
    return true; // Indicates an asynchronous response.
  }

  // For Stretch Goal: Syncing template edits
  if (request.action === 'saveEditedTemplate') {
    const { platform, templateText } = request.data;
    const storageKey = `prompt_template_edited_${platform}`;
    chrome.storage.sync.set({ [storageKey]: templateText }, () => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true });
      }
    });
    return true;
  }

  if (request.action === 'loadEditedTemplate') {
    const { platform } = request.data;
    const storageKey = `prompt_template_edited_${platform}`;
    chrome.storage.sync.get(storageKey, (result) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true, templateText: result[storageKey] });
      }
    });
    return true;
  }

});

console.log("Prompt-ify Service Worker Loaded.");
