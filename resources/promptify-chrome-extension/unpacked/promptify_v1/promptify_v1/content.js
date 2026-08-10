// content.js

// Purple pencil SVG (inline encoded) - Slightly more detailed pencil
const PENCIL_SVG_DATA_URL = "data:image/svg+xml;utf8,%3Csvg viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg' fill='purple' width='20' height='20'%3E%3Cpath d='M20.71,6.29l-3-3a1,1,0,0,0-1.42,0l-12,12a1,1,0,0,0-.29.71V21a1,1,0,0,0,1,1H9.41a1,1,0,0,0,.71-.29l12-12A1,1,0,0,0,20.71,6.29ZM7.59,19H6V17.41l9-9L16.59,10ZM18.59,8,15,4.41,16.29,3.12l2.29,2.3Z'/%3E%3C/svg%3E";

const SITE_CONFIGS = {
  'lovable.dev': {
    inputSelectors: [
      'textarea#chatinput', // Primary: Using the ID
      'textarea[placeholder*="Ask Lovable to create"]', // Fallback: Based on new placeholder
      'textarea[placeholder*="Ask Lovable"]' // More generic fallback
    ],
    offset: { right: 5, topRatio: 0.5 } // 5px from right, 50% from top of input height
  },
  'bolt.new': {
    inputSelectors: [
      'textarea[placeholder="How can Bolt help you today?"]', // New primary
      'textarea[data-testid="prompt-input"]', 
      'textarea[class*="prompt-input"]', 
      'div[contenteditable="true"][role="textbox"]'
    ],
    offset: { right: 5, topRatio: 0.5 }
  },
  'replit.com': {
    inputSelectors: [
        'div[data-cy="ai-prompt-input"] div.cm-content[contenteditable="true"]', // New primary
        'textarea[placeholder*="Send message"]', 
        'div[data-cy="chat-input-textarea"] textarea',
        'div[class*="ChatMessageInput"] textarea',
        'div[contenteditable="true"][aria-label*="chat input"]',
        'div[class*="cm-content"]' 
    ],
    offset: { right: 8, topRatio: 0.5 }
  }
};

let promptTemplates = {};

const FIRST_PROMPT_ADDENDUM = "\n\n--- MODE: INITIAL PROMPT ---\nThis is the very first prompt for a new application. Your primary goal is to generate a comprehensive foundational plan and the core structural shell of the application. Focus strictly on overall architecture, essential UI/UX components, core data structures (if applicable, but keep high-level), and a clear component/module breakdown. \n\nIMPORTANT: For this initial shell, actively AVOID detailing specific third-party service integrations (e.g., SendGrid, specific payment gateways, detailed Supabase table schemas beyond conceptual mentions). Mentioning categories like 'authentication' or 'notifications' is fine, but do NOT elaborate on implementing them with specific external services at this stage. The aim is a robust, internal application skeleton. Your output should be detailed enough to serve as a PRD for the core structure and guide a junior software engineer in building this shell. Emphasize clarity and completeness for this foundational stage, deferring external integration details entirely.";

const FOLLOW_UP_PROMPT_ADDENDUM = "\n\n--- MODE: FOLLOW-UP PROMPT ---\nThe application shell and initial structure are already in place. The user will provide a specific, concise idea for a modification, feature addition, or bug fix. Your task is to transform this concise idea into a detailed, actionable, and 'SMART' (Specific, Measurable, Achievable, Relevant) instruction for an AI coding agent. Do NOT redefine the entire application or its existing core components. Focus on elaborating the user's specific request, considering its context within the existing application. For example, if the user says 'add a blue button', you should elaborate on where the button goes, its purpose, its text, its exact shade of blue, and any associated actions, assuming the main app structure is known.";

let currentTargetElement = null;
let scanIntervalId = null;
let debounceTimeout = null;

async function initialize() {
  await loadPromptTemplates();
  debouncedScan();
  // Listen for SPA navigations or dynamic content changes if possible
  // For now, relying on periodic scan.
  if (scanIntervalId) clearInterval(scanIntervalId);
  scanIntervalId = setInterval(debouncedScan, 1200);

  // Listen for messages to close overlay (e.g., from background if needed)
  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'closeOverlayFromBackground') {
      closeOverlay();
    }
  });
}

async function loadPromptTemplates() {
  try {
    const url = chrome.runtime.getURL('prompt_templates.json');
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    promptTemplates = await response.json();
  } catch (error) {
    console.error('Prompt-ify: Failed to load prompt_templates.json:', error);
    // Fallback to generic if loading fails
    promptTemplates = {
      generic: { system_prompt: "You are a helpful AI assistant.", max_tokens: 1000 }
    };
  }
}

function createPencilIcon(targetEl) {
  // Check if icon already exists for this element
  if (targetEl.dataset.promptifyIconAttached === 'true') {
    const existingIcon = document.getElementById(`promptify-icon-${targetEl.dataset.promptifyId}`);
    if (existingIcon) positionIcon(existingIcon, targetEl); // Reposition if already exists
    return;
  }

  const icon = document.createElement('button');
  icon.className = 'promptify-pencil-icon';
  const uniqueId = `el-${Math.random().toString(36).substr(2, 9)}`;
  icon.id = `promptify-icon-${uniqueId}`;
  targetEl.dataset.promptifyId = uniqueId;

  icon.innerHTML = `<img src="${PENCIL_SVG_DATA_URL}" alt="Prompt-ify"><span class="promptify-tooltip-text">Prompt-ify</span>`;
  document.body.appendChild(icon);
  positionIcon(icon, targetEl);

  icon.addEventListener('click', (event) => {
    event.stopPropagation();
    event.preventDefault();
    currentTargetElement = targetEl; // Set the current target
    showOverlay(targetEl);
  });
  targetEl.dataset.promptifyIconAttached = 'true';

  // Monitor target element for removal
  const observer = new MutationObserver((mutationsList, obs) => {
    if (!document.body.contains(targetEl)) {
      icon.remove();
      obs.disconnect();
    } else {
       positionIcon(icon, targetEl); // Reposition if attributes/style change
    }
  });
  observer.observe(targetEl, { attributes: true, childList: false, subtree: false });
  observer.observe(targetEl.parentElement || document.body, { childList: true, subtree: true });


  window.addEventListener('resize', () => positionIcon(icon, targetEl));
  // Add a scroll listener to the window or specific scrollable parents if necessary
   window.addEventListener('scroll', () => positionIcon(icon, targetEl), true); // Capture scroll events on all elements
}

function positionIcon(icon, targetEl) {
  if (!document.body.contains(targetEl) || !document.body.contains(icon)) {
    icon.remove();
    return;
  }
  const targetRect = targetEl.getBoundingClientRect();
  
  // Ensure 'offset' is always defined with a default
  const siteSpecificConfig = SITE_CONFIGS[window.location.hostname];
  const offset = (siteSpecificConfig && siteSpecificConfig.offset) 
                 ? siteSpecificConfig.offset 
                 : { right: 5, topRatio: 0.5 };

  // If targetRect is all zeros, it's likely display:none or similarly collapsed. Hide the icon.
  if (targetRect.width === 0 && targetRect.height === 0 && targetRect.top === 0 && targetRect.left === 0) {
      icon.style.display = 'none';
      return; // Don't try to position it.
  } else {
      icon.style.display = ''; // Ensure it's visible if previously hidden.
  }

  let scrollX = window.scrollX;
  let scrollY = window.scrollY;

  icon.style.position = 'absolute';
  let iconTop = targetRect.top + scrollY + (targetRect.height * offset.topRatio) - (icon.offsetHeight / 2);
  let iconLeft = targetRect.left + scrollX + targetRect.width - icon.offsetWidth - offset.right;
  
  // Adjust for very small but valid targets (maintains original logic for this case)
  if (targetRect.height < 22 || targetRect.width < (icon.offsetWidth + offset.right + 2)) {
     iconLeft = targetRect.right + scrollX + 3; // Place outside and to the right
     iconTop = targetRect.top + scrollY + (targetRect.height / 2) - (icon.offsetHeight / 2);
  }
  
  icon.style.top = `${iconTop}px`;
  icon.style.left = `${iconLeft}px`;
}


function cleanOpenAIResponse(text) {
  if (typeof text !== 'string') return '';

  let cleanedText = text.trim();

  // Remove markdown code block fences
  // Matches ```markdown ..., ```json ..., ``` ... ```
  cleanedText = cleanedText.replace(/^\s*```[a-zA-Z]*\n?/, '');
  cleanedText = cleanedText.replace(/\n?```\s*$/, '');
  cleanedText = cleanedText.trim();

  // Remove leading bullet points like '* ' or '- ' especially if followed by '**'
  // This is a basic attempt and might need refinement based on more examples
  const lines = cleanedText.split('\n');
  const processedLines = lines.map(line => {
    // Remove leading '* ' or '- ' if followed by '**' (bold markdown)
    let processedLine = line.replace(/^\s*([*-])\s+(?=\*\*)/, '');
    // Or if the line primarily consists of just the bullet and bold text, remove the bullet
    // This tries to avoid stripping bullets from genuine lists if the target field *could* handle markdown
    // For now, let's be a bit more aggressive for plain text pasting:
    processedLine = processedLine.replace(/^\s*([*-])\s+/, '');
    return processedLine;
  });

  return processedLines.join('\n').trim();
}

function showOverlay(targetEl) {
  // Remove any existing overlay first
  closeOverlay();

  const backdrop = document.createElement('div');
  backdrop.className = 'promptify-overlay-backdrop';
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeOverlay(); // Click on backdrop closes
  });

  const overlayContainer = document.createElement('div');
  overlayContainer.className = 'promptify-overlay-container';
  overlayContainer.addEventListener('click', e => e.stopPropagation()); // Prevent clicks inside from closing

  const currentText = targetEl.isContentEditable ? targetEl.innerText : targetEl.value;

  overlayContainer.innerHTML = `
    <div id="promptify-status-message" class="promptify-status"></div>
    <label for="promptify-api-key">OpenAI API Key:</label>
    <input type="password" id="promptify-api-key" placeholder="sk-...">

    <label for="promptify-model">Model:</label>
    <select id="promptify-model">
      <option value="gpt-4o" selected>GPT-4o (Default)</option>
      <option value="gpt-4o-mini">GPT-4o Mini</option>
      <option value="gpt-4.1">GPT-4.1</option>
      <option value="gpt-4.1-mini">GPT-4.1 Mini</option>
      <option value="gpt-4.1-nano">GPT-4.1 Nano</option>
      <option value="gpt-4.5">GPT-4.5</option>
    </select>

    <label for="promptify-platform">Platform:</label>
    <select id="promptify-platform">
      <option value="generic" selected>Generic</option>
      <option value="lovable">Lovable</option>
      <option value="bolt">Bolt</option>
      <option value="replit">Replit</option>
    </select>

    <div class="promptify-form-group promptify-checkbox-group">
      <input type="checkbox" id="promptify-first-prompt" name="first-prompt" checked>
      <label for="promptify-first-prompt" class="promptify-checkbox-label">This is my first prompt (generates a robust plan/shell)</label>
    </div>

    <div class="promptify-form-group promptify-checkbox-group">
      <input type="checkbox" id="promptify-markdown-output" name="markdown-output" checked>
      <label for="promptify-markdown-output" class="promptify-checkbox-label">Output in Markdown format</label>
    </div>

    <label for="promptify-system-prompt">System Prompt: (Editable)</label>
    <textarea id="promptify-system-prompt"></textarea>

    <label for="promptify-rough-idea">Rough Idea:</label>
    <textarea id="promptify-rough-idea"></textarea>

    <label for="promptify-max-tokens">Max Tokens:</label>
    <input type="number" id="promptify-max-tokens" value="1000" min="50" max="4000">

    <div id="promptify-status-message" class="promptify-status"></div>

    <div class="promptify-overlay-actions">
      <a href="#" id="promptify-cancel-link" class="promptify-cancel-link">Cancel</a>
      <button id="promptify-submit-button" class="promptify-submit-button">Prompt-ify</button>
    </div>
  `;

  backdrop.appendChild(overlayContainer);
  document.body.appendChild(backdrop);

  // Get DOM elements (declared once)
  const apiKeyInput = document.getElementById('promptify-api-key');
  const modelSelect = document.getElementById('promptify-model');
  const platformSelect = document.getElementById('promptify-platform');
  const systemPromptTextarea = document.getElementById('promptify-system-prompt');
  const roughIdeaTextarea = document.getElementById('promptify-rough-idea');
  const maxTokensInput = document.getElementById('promptify-max-tokens');
  const submitButton = document.getElementById('promptify-submit-button');
  const cancelButton = document.getElementById('promptify-cancel-link');
  const statusMessageDiv = document.getElementById('promptify-status-message'); // For status messages

  // Function to update system prompt and max tokens based on platform
  const updateSystemPromptAndTokens = () => {
    const selectedPlatform = platformSelect.value;
    const template = promptTemplates[selectedPlatform] || promptTemplates.generic;
    systemPromptTextarea.value = template.system_prompt || promptTemplates.generic.system_prompt || 'You are a helpful assistant.';
    maxTokensInput.value = template.max_tokens || promptTemplates.generic.max_tokens || 1000;
  };

  // Event listener for platform change
  platformSelect.addEventListener('change', updateSystemPromptAndTokens);
  
  // Initial population of system prompt and max tokens
  updateSystemPromptAndTokens();

  // Populate rough idea from target element
  roughIdeaTextarea.value = currentText.trim().replace(/^(?:\r\n|\r|\n)+/, '');

  // Load API Key from storage
  chrome.runtime.sendMessage({ action: 'getApiKey' }, (response) => {
    if (response && response.apiKey) {
      apiKeyInput.value = response.apiKey;
    } else if (response && response.error) {
      // statusMessageDiv.textContent = 'Error loading API key...'; // Removed
      // statusMessageDiv.className = 'promptify-status error'; // Removed
      console.warn('Prompt-ify: Could not load API key on overlay open:', response.error);
    } else {
      // statusMessageDiv.textContent = 'API Key not found...'; // Removed
      // statusMessageDiv.className = 'promptify-status warning'; // Removed
      // Field will just be empty. Error will show on submit if not filled.
    }
  });

  // Cancel button functionality
  cancelButton.addEventListener('click', (e) => {
    e.preventDefault();
    closeOverlay();
  });

  // Submit button functionality (calls existing handleSubmit function)
  submitButton.addEventListener('click', handleSubmit);
}

function closeOverlay() {
  const backdrop = document.querySelector('.promptify-overlay-backdrop');
  if (backdrop) {
    backdrop.remove();
  }
}

async function handleSubmit() {
  const apiKeyInput = document.getElementById('promptify-api-key');
  const modelSelect = document.getElementById('promptify-model');
  const platformSelect = document.getElementById('promptify-platform');
  const systemPromptTextarea = document.getElementById('promptify-system-prompt');
  const roughIdeaTextarea = document.getElementById('promptify-rough-idea');
  const maxTokensInput = document.getElementById('promptify-max-tokens');
  const firstPromptCheckbox = document.getElementById('promptify-first-prompt'); // Get the checkbox
  const markdownOutputCheckbox = document.getElementById('promptify-markdown-output'); // Get the Markdown checkbox
  const submitButton = document.getElementById('promptify-submit-button');
  const statusMessageDiv = document.getElementById('promptify-status-message');
  const overlayContainer = document.querySelector('.promptify-overlay-container'); // Get the container for animation

  const apiKey = apiKeyInput.value.trim();
  const model = modelSelect.value;
  const baseSystemPrompt = systemPromptTextarea.value.trim();
  const userPrompt = roughIdeaTextarea.value.trim();
  const maxTokensValue = parseInt(maxTokensInput.value, 10);
  const isFirstPrompt = firstPromptCheckbox.checked;

  let finalSystemPrompt = baseSystemPrompt;
  if (isFirstPrompt) {
    finalSystemPrompt += FIRST_PROMPT_ADDENDUM;
  } else {
    finalSystemPrompt += FOLLOW_UP_PROMPT_ADDENDUM;
  }

  // Add Markdown formatting instruction if checked
  if (markdownOutputCheckbox.checked) {
    finalSystemPrompt += "\n\nPlease format your entire response using Markdown, including appropriate code blocks for any code examples.";
  } else {
    finalSystemPrompt += "\n\nIMPORTANT REQUEST: Format your entire response as plain text ONLY. Absolutely no Markdown formatting (no asterisks for bold/italics, no triple backticks for code blocks, no hashes for headings, no dashes or asterisks for bullet points). All output should be simple, unformatted text.";
  }

  statusMessageDiv.textContent = ''; // Clear previous messages
  statusMessageDiv.className = 'promptify-status';

  if (!apiKey) {
    statusMessageDiv.textContent = 'OpenAI API Key is required.';
    statusMessageDiv.className = 'promptify-status error';
    showToast('OpenAI API Key is required.', 'error');
    apiKeyInput.focus();
    return;
  }
  if (!userPrompt) {
    statusMessageDiv.textContent = 'Please enter your rough idea.';
    statusMessageDiv.className = 'promptify-status error';
    showToast('Please enter your rough idea.', 'error');
    roughIdeaTextarea.focus();
    return;
  }
  if (isNaN(maxTokensValue) || maxTokensValue < 50 || maxTokensValue > 4096) { // Max 4096 for older models, GPT-4 has more
    statusMessageDiv.textContent = 'Max tokens must be a number between 50 and 4000 (approx).'; // Adjusted message
    statusMessageDiv.className = 'promptify-status error';
    showToast('Invalid Max Tokens value.', 'error');
    maxTokensInput.focus();
    return;
  }

  chrome.runtime.sendMessage({ action: 'saveApiKey', data: { apiKey: apiKey } });

  submitButton.disabled = true;
  submitButton.textContent = 'Processing...';
  statusMessageDiv.textContent = 'Generating prompt, please wait...';
  statusMessageDiv.className = 'promptify-status info';
  if (overlayContainer) overlayContainer.classList.add('promptify-loading-active');

  chrome.runtime.sendMessage({
    action: 'callOpenAI',
    data: { apiKey, model, systemPrompt: finalSystemPrompt, userPrompt, maxTokens: maxTokensValue }
  }, (response) => {
    if (overlayContainer) overlayContainer.classList.remove('promptify-loading-active');
    submitButton.disabled = false;
    submitButton.textContent = 'Prompt-ify';

    if (response && response.success) {
      const cleanedContent = cleanOpenAIResponse(response.content);
      setElementText(currentTargetElement, cleanedContent);
      roughIdeaTextarea.value = ''; // Clear the rough idea input
      if (overlayContainer) {
        overlayContainer.classList.add('promptify-success-state');
      }
      statusMessageDiv.textContent = 'Success!'; // Updated message
      // statusMessageDiv.className can be 'promptify-status success-message' if specific styling for text is needed
      // Or rely on styling within .promptify-success-state for the message div
      statusMessageDiv.className = 'promptify-status success-message'; // Let's use a dedicated class for success text

      // No more toast for success
      // showToast('Prompt updated successfully!', 'success');
      
      setTimeout(() => {
          if (overlayContainer) {
            overlayContainer.classList.remove('promptify-success-state'); // Clean up class
          }
          if (document.getElementById('promptify-rough-idea')) { // Ensure it still exists
            document.getElementById('promptify-rough-idea').value = ''; // Force clear again
          }
          closeOverlay();
      }, 1800); // Slightly longer to view success state 
    } else {
      const errorMessage = response && response.error ? response.error : 'Failed to generate prompt due to an unknown error.';
      console.error("Prompt-ify Error:", errorMessage);
      statusMessageDiv.textContent = `Error: ${errorMessage}`;
      statusMessageDiv.className = 'promptify-status error';
      showToast(`Error: ${errorMessage}`, 'error');
    }
  });
}

function setElementText(element, text) {
  if (!element) return;

  // Try to preserve undo history
  element.focus(); // Element must be focused for execCommand to work
  
  // For input/textarea, document.execCommand('insertText', false, text) is more reliable for undo
  if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
    element.select(); // Select current content for replacement
    if (!document.execCommand('insertText', false, text)) {
        // Fallback if execCommand fails (e.g., in some shadow DOMs or weird states)
        element.value = text; 
    }
  } else if (element.isContentEditable) {
    // Simplified approach for contenteditable, targeting Replit/CodeMirror issues
    element.focus(); // Ensure focus
    // Try clearing and setting text directly
    element.innerHTML = ''; // Clear all existing content
    element.innerText = text; // Set the new text

    // As an alternative to execCommand, ensure selection is at the end if needed by some editors
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(element);
    range.collapse(false); // Collapse to the end
    sel.removeAllRanges();
    sel.addRange(range);
  } else {
      // Fallback for other types of elements if any were targeted
      if ('value' in element) element.value = text;
      else if ('innerText'in element) element.innerText = text;
  }

  // Dispatch input events to let the host page know about the change
  element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
  element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
}


function debouncedScan() {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(scanForInputs, 200); // Reduced debounce for faster reaction
}

function scanForInputs() {
  const currentDomain = window.location.hostname;
  const config = SITE_CONFIGS[currentDomain];
  if (!config) return; // No config for this site

  let foundElements = [];
  config.inputSelectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => {
      // Filter for visible and reasonably sized elements
      const rect = el.getBoundingClientRect();
      if (rect.width > 50 && rect.height > 15 && getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).display !== 'none') {
        if (!el.dataset.promptifyIconAttached) {
             createPencilIcon(el);
        } else {
            // If icon exists, ensure it's correctly positioned (e.g., if element moved)
            const iconId = `promptify-icon-${el.dataset.promptifyId}`;
            const icon = document.getElementById(iconId);
            if (icon) positionIcon(icon, el);
        }
        foundElements.push(el);
      }
    });
  });

  // Remove icons from elements that no longer exist or match
  document.querySelectorAll('.promptify-pencil-icon').forEach(icon => {
      const elementId = icon.id.replace('promptify-icon-', '');
      const targetEl = Array.from(document.querySelectorAll('[data-promptify-id]')).find(el => el.dataset.promptifyId === elementId);
      if (!targetEl || !foundElements.includes(targetEl)) {
          icon.remove();
          if (targetEl) delete targetEl.dataset.promptifyIconAttached;
      }
  });
}


function showToast(message, type = 'info') { // type can be 'info', 'success', 'error'
  let toast = document.querySelector('.promptify-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'promptify-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = 'promptify-toast'; // Reset classes
  toast.classList.add(type); // Add specific type class for styling (e.g., .error, .success)
  
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
    // Optional: remove toast from DOM after hiding if not needed again soon
    // setTimeout(() => { if (toast) toast.remove(); }, 300);
  }, 3000); // Hide after 3 seconds
}


// Start the process
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
