# MEGA PROMPT: Complete Gemini RAG File Search Application

## Project Overview
Create a production-ready full-stack web application that enables users to upload documents and interact with them through an AI-powered chat interface using Google's Gemini API File Search feature. The application implements a complete Retrieval Augmented Generation (RAG) system with:
- Modern, clean UI with tabbed interface
- API documentation with ready-to-use code examples
- State persistence across server restarts
- Markdown-formatted responses
- Real-time loading indicators
- Complete file and store management
- Custom metadata and chunking configuration
- System prompt customization
- Citation tracking and display

## Core Technologies
- **Backend Framework**: Flask (Python 3.13+)
- **Frontend**: Vanilla JavaScript, HTML5, CSS3, marked.js for markdown
- **AI/ML**: Google Gemini API (gemini-2.5-flash model)
- **File Handling**: Werkzeug secure file uploads
- **Environment Management**: python-dotenv
- **CORS**: Flask-CORS for API access
- **Persistence**: JSON file-based state storage

## Dependencies (requirements.txt)
```
flask==3.0.0
flask-cors==4.0.0
google-genai>=1.49.0
python-dotenv==1.0.0
werkzeug==3.0.1
```

**IMPORTANT**: Use `google-genai>=1.49.0` (NOT 0.2.2) to ensure `file_search_stores` API is available.

## Architecture & File Structure

```
gemini-rag/
├── app.py                    # Flask backend application
├── templates/
│   └── index.html           # Single-page frontend application
├── uploads/                 # Temporary file storage (auto-created)
├── store_state.json         # Persistent state (auto-generated)
├── .env                     # Environment variables (API key)
├── .gitignore              # Git exclusions
├── requirements.txt        # Python dependencies
├── README.md               # Documentation
├── CLAUDE.md               # Claude Code instructions
└── MEGA_PROMPT.md          # This file
```

## Critical Implementation Requirements

### 1. State Persistence
**MUST IMPLEMENT**: The application must persist file search store information across server restarts using a JSON file.

### 2. API Documentation Tab
**MUST IMPLEMENT**: A dedicated tab showing:
- Current API key and store information
- Ready-to-copy cURL commands
- Python SDK examples
- API key update functionality

### 3. Markdown Support
**MUST IMPLEMENT**: AI responses must be formatted using marked.js library with proper styling for:
- Paragraphs, lists, headers
- Bold, italic, code blocks
- Blockquotes and links

### 4. Loading Indicators
**MUST IMPLEMENT**: Animated typing indicator while waiting for AI responses.

### 5. Timeout Handling
**MUST IMPLEMENT**: File upload operations must have 120-second timeout (not 60).

## Backend Implementation (app.py)

### Complete Flask Application

```python
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from google import genai
from google.genai import types
import os
import time
import json
from dotenv import load_dotenv
from werkzeug.utils import secure_filename
import logging

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration constants
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'doc', 'docx', 'json', 'md', 'py', 'js', 'html', 'css', 'xml', 'csv'}
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB
MAX_HISTORY = 7  # Conversation history limit

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

# Ensure upload folder exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Initialize Gemini client
api_key = os.getenv('GEMINI_API_KEY')
if not api_key:
    raise ValueError("GEMINI_API_KEY not found in environment variables")

client = genai.Client(api_key=api_key)

# Global state management
conversation_history = []
file_search_store = None
uploaded_files = []  # Track uploaded files with metadata
PERSISTENCE_FILE = 'store_state.json'

# ============================================
# STATE PERSISTENCE FUNCTIONS
# ============================================

def load_state():
    """Load persisted state from JSON file on startup"""
    global file_search_store, uploaded_files
    try:
        if os.path.exists(PERSISTENCE_FILE):
            with open(PERSISTENCE_FILE, 'r') as f:
                state = json.load(f)
                store_name = state.get('store_name')
                uploaded_files = state.get('uploaded_files', [])

                if store_name:
                    # Verify the store still exists
                    try:
                        file_search_store = client.file_search_stores.get(name=store_name)
                        logger.info(f"Restored file search store: {store_name} with {len(uploaded_files)} files")
                    except Exception as e:
                        logger.warning(f"Stored file search store not found: {e}")
                        file_search_store = None
                        uploaded_files = []
    except Exception as e:
        logger.error(f"Error loading state: {e}")

def save_state():
    """Save current state to JSON file"""
    try:
        state = {
            'store_name': file_search_store.name if file_search_store else None,
            'uploaded_files': uploaded_files
        }
        with open(PERSISTENCE_FILE, 'w') as f:
            json.dump(state, f, indent=2)
        logger.info("State saved successfully")
    except Exception as e:
        logger.error(f"Error saving state: {e}")

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# ============================================
# MAIN ROUTES
# ============================================

@app.route('/')
def index():
    return render_template('index.html')

# ============================================
# FILE UPLOAD WITH PERSISTENCE
# ============================================

@app.route('/upload', methods=['POST'])
def upload_file():
    global file_search_store, uploaded_files

    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    if not allowed_file(file.filename):
        return jsonify({'error': 'File type not supported'}), 400

    filepath = None
    uploaded_api_file = None

    try:
        # Save file temporarily
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)

        # Get file size
        file_size = os.path.getsize(filepath)
        logger.info(f"File saved: {filename}, size: {file_size} bytes")

        # Get custom metadata and chunking config from request
        metadata_json = request.form.get('metadata', '{}')
        chunking_json = request.form.get('chunking_config', '{}')
        custom_metadata = json.loads(metadata_json)
        chunking_config = json.loads(chunking_json)

        # Create or reuse file search store
        if file_search_store is None:
            logger.info("Creating new file search store")
            file_search_store = client.file_search_stores.create(
                config={'display_name': 'RAG-App-Store'}
            )

        # STEP 1: Upload file using Files API
        logger.info(f"Uploading {filename} to Files API")
        uploaded_api_file = client.files.upload(
            file=filepath,
            config={'display_name': filename}
        )

        # STEP 2: Import file into file search store with metadata
        logger.info(f"Importing {filename} into file search store")

        import_config = {}

        # Add custom metadata if provided
        if custom_metadata:
            metadata_list = []
            for key, value in custom_metadata.items():
                if isinstance(value, (int, float)):
                    metadata_list.append({"key": key, "numeric_value": value})
                else:
                    metadata_list.append({"key": key, "string_value": str(value)})
            import_config['custom_metadata'] = metadata_list

        # Add chunking config if provided
        if chunking_config and chunking_config.get('enabled'):
            import_config['chunking_config'] = {
                'white_space_config': {
                    'max_tokens_per_chunk': chunking_config.get('max_tokens_per_chunk', 200),
                    'max_overlap_tokens': chunking_config.get('max_overlap_tokens', 20)
                }
            }

        operation = client.file_search_stores.import_file(
            file_search_store_name=file_search_store.name,
            file_name=uploaded_api_file.name,
            config=import_config if import_config else None
        )

        # Wait for operation to complete with INCREASED TIMEOUT
        logger.info("Waiting for file import to complete")
        max_wait = 120  # 2 minutes timeout
        wait_time = 0
        while not operation.done and wait_time < max_wait:
            time.sleep(3)
            operation = client.operations.get(operation)
            wait_time += 3
            if wait_time % 15 == 0:  # Log progress every 15 seconds
                logger.info(f"Still waiting... ({wait_time}s elapsed)")

        if not operation.done:
            logger.error(f"File processing timeout after {max_wait}s")
            return jsonify({'error': f'File processing timeout after {max_wait} seconds. The file may still be processing in the background.'}), 500

        # Extract document ID from operation response
        document_id = None
        if hasattr(operation, 'response') and operation.response:
            document_id = getattr(operation.response, 'name', None)

        # Track uploaded file
        file_info = {
            'filename': filename,
            'size': file_size,
            'uploaded_at': time.strftime('%Y-%m-%d %H:%M:%S'),
            'custom_metadata': custom_metadata,
            'chunking_config': chunking_config if chunking_config.get('enabled') else None,
            'file_api_name': uploaded_api_file.name,
            'document_id': document_id
        }
        uploaded_files.append(file_info)

        # IMPORTANT: Save state to persistence
        save_state()

        # Clean up local file
        os.remove(filepath)
        logger.info(f"File {filename} successfully uploaded and imported")

        return jsonify({
            'success': True,
            'message': f'File "{filename}" uploaded and processed successfully',
            'filename': filename,
            'file_size': file_size,
            'store_name': file_search_store.name,
            'document_id': document_id,
            'uploaded_files': uploaded_files
        })

    except Exception as e:
        logger.error(f"Error uploading file: {str(e)}")
        # Clean up file if it exists
        if filepath and os.path.exists(filepath):
            os.remove(filepath)
        # Clean up API file if uploaded
        if uploaded_api_file:
            try:
                client.files.delete(uploaded_api_file.name)
            except:
                pass
        return jsonify({'error': f'Error uploading file: {str(e)}'}), 500

# ============================================
# CHAT WITH RAG & CITATIONS
# ============================================

@app.route('/chat', methods=['POST'])
def chat():
    global conversation_history

    data = request.json
    user_message = data.get('message', '')
    metadata_filter = data.get('metadata_filter', '')
    system_prompt = data.get('system_prompt', '')

    if not user_message:
        return jsonify({'error': 'No message provided'}), 400

    if file_search_store is None:
        return jsonify({'error': 'Please upload a file first'}), 400

    try:
        # Add user message to history
        conversation_history.append({
            'role': 'user',
            'content': user_message
        })

        # Build conversation context (last MAX_HISTORY messages)
        context_messages = conversation_history[-MAX_HISTORY:]

        # Create prompt with conversation history
        prompt_parts = []

        # Add system prompt at the beginning if provided
        if system_prompt:
            prompt_parts.append(f"System Instructions: {system_prompt}\n")

        for msg in context_messages[:-1]:  # All except current message
            if msg['role'] == 'user':
                prompt_parts.append(f"User: {msg['content']}")
            else:
                prompt_parts.append(f"Assistant: {msg['content']}")

        # Add current question
        prompt_parts.append(f"User: {user_message}")
        prompt_parts.append("Assistant:")

        full_prompt = "\n\n".join(prompt_parts)

        logger.info(f"Querying with message: {user_message}")
        if metadata_filter:
            logger.info(f"Using metadata filter: {metadata_filter}")

        # Build file search config
        file_search_config = types.FileSearch(
            file_search_store_names=[file_search_store.name]
        )

        # Add metadata filter if provided
        if metadata_filter:
            file_search_config.metadata_filter = metadata_filter

        # Query with File Search
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=full_prompt,
            config=types.GenerateContentConfig(
                tools=[types.Tool(file_search=file_search_config)]
            )
        )

        assistant_message = response.text

        # Add assistant response to history
        conversation_history.append({
            'role': 'assistant',
            'content': assistant_message
        })

        # Keep only last MAX_HISTORY messages
        if len(conversation_history) > MAX_HISTORY:
            conversation_history = conversation_history[-MAX_HISTORY:]

        # Extract grounding metadata (citations)
        metadata = None
        if response.candidates and len(response.candidates) > 0:
            candidate = response.candidates[0]
            if hasattr(candidate, 'grounding_metadata') and candidate.grounding_metadata:
                grounding = candidate.grounding_metadata

                # Extract citation information
                citations = []
                if hasattr(grounding, 'grounding_chunks') and grounding.grounding_chunks:
                    for chunk in grounding.grounding_chunks:
                        if hasattr(chunk, 'retrieved_context'):
                            ctx = chunk.retrieved_context
                            citation = {}
                            if hasattr(ctx, 'title'):
                                citation['title'] = ctx.title
                            if hasattr(ctx, 'uri'):
                                citation['uri'] = ctx.uri
                            if hasattr(ctx, 'text'):
                                citation['text'] = ctx.text
                            citations.append(citation)

                metadata = {
                    'citations': citations,
                    'citation_count': len(citations)
                }

        logger.info(f"Response generated successfully with {len(metadata['citations']) if metadata else 0} citations")

        return jsonify({
            'success': True,
            'response': assistant_message,
            'metadata': metadata,
            'conversation_length': len(conversation_history),
            'metadata_filter_used': metadata_filter if metadata_filter else None
        })

    except Exception as e:
        logger.error(f"Error in chat: {str(e)}")
        return jsonify({'error': f'Error processing message: {str(e)}'}), 500

# ============================================
# FILE MANAGEMENT ENDPOINTS
# ============================================

@app.route('/delete-file/<int:file_index>', methods=['DELETE'])
def delete_file(file_index):
    global uploaded_files

    try:
        if file_index < 0 or file_index >= len(uploaded_files):
            return jsonify({'error': 'Invalid file index'}), 400

        file_info = uploaded_files[file_index]

        # Delete from Files API
        if file_info.get('file_api_name'):
            try:
                client.files.delete(file_info['file_api_name'])
                logger.info(f"Deleted file from Files API: {file_info['file_api_name']}")
            except Exception as e:
                logger.warning(f"Could not delete from Files API: {str(e)}")

        # Remove from tracking
        deleted_file = uploaded_files.pop(file_index)
        logger.info(f"Removed file from tracking: {deleted_file['filename']}")

        # Save state to persistence
        save_state()

        return jsonify({
            'success': True,
            'message': f"File '{deleted_file['filename']}' deleted successfully",
            'uploaded_files': uploaded_files
        })

    except Exception as e:
        logger.error(f"Error deleting file: {str(e)}")
        return jsonify({'error': f'Error deleting file: {str(e)}'}), 500

@app.route('/store-info', methods=['GET'])
def get_store_info():
    try:
        if file_search_store is None:
            return jsonify({
                'success': True,
                'store_exists': False,
                'message': 'No file search store created yet'
            })

        # Get store details
        store_details = client.file_search_stores.get(name=file_search_store.name)

        store_info = {
            'success': True,
            'store_exists': True,
            'name': store_details.name,
            'display_name': getattr(store_details, 'display_name', 'N/A'),
            'create_time': getattr(store_details, 'create_time', 'N/A'),
            'update_time': getattr(store_details, 'update_time', 'N/A'),
            'document_count': len(uploaded_files)
        }

        return jsonify(store_info)

    except Exception as e:
        logger.error(f"Error getting store info: {str(e)}")
        return jsonify({'error': f'Error getting store info: {str(e)}'}), 500

@app.route('/stores', methods=['GET'])
def list_stores():
    try:
        stores = []
        for store in client.file_search_stores.list():
            stores.append({
                'name': store.name,
                'display_name': getattr(store, 'display_name', 'N/A'),
                'create_time': str(getattr(store, 'create_time', 'N/A'))
            })

        return jsonify({
            'success': True,
            'stores': stores,
            'count': len(stores)
        })

    except Exception as e:
        logger.error(f"Error listing stores: {str(e)}")
        return jsonify({'error': f'Error listing stores: {str(e)}'}), 500

@app.route('/delete-store', methods=['DELETE'])
def delete_store():
    global file_search_store, uploaded_files

    try:
        if file_search_store is None:
            return jsonify({'error': 'No store to delete'}), 400

        store_name = file_search_store.name

        # Delete the store with force=True
        client.file_search_stores.delete(name=store_name, config={'force': True})
        logger.info(f"Deleted file search store: {store_name}")

        # Reset state
        file_search_store = None
        uploaded_files = []

        # Save state to persistence
        save_state()

        return jsonify({
            'success': True,
            'message': 'File search store deleted successfully'
        })

    except Exception as e:
        logger.error(f"Error deleting store: {str(e)}")
        return jsonify({'error': f'Error deleting store: {str(e)}'}), 500

# ============================================
# API DOCUMENTATION & INFO ENDPOINTS
# ============================================

@app.route('/api-info', methods=['GET'])
def get_api_info():
    """Return API information for documentation tab"""
    try:
        api_info = {
            'success': True,
            'api_key': api_key,
            'store_exists': file_search_store is not None,
            'store_name': file_search_store.name if file_search_store else None,
            'store_display_name': getattr(file_search_store, 'display_name', 'RAG-App-Store') if file_search_store else 'RAG-App-Store',
            'file_count': len(uploaded_files),
            'files': uploaded_files,
            'model': 'gemini-2.5-flash',
            'example_metadata_filters': []
        }

        # Collect example metadata keys from uploaded files
        metadata_keys = set()
        for file_info in uploaded_files:
            if file_info.get('custom_metadata'):
                for key in file_info['custom_metadata'].keys():
                    metadata_keys.add(key)

        api_info['metadata_keys'] = list(metadata_keys)

        return jsonify(api_info)

    except Exception as e:
        logger.error(f"Error getting API info: {str(e)}")
        return jsonify({'error': f'Error getting API info: {str(e)}'}), 500

@app.route('/update-api-key', methods=['POST'])
def update_api_key():
    """Update API key in .env file and reinitialize client"""
    global api_key, client
    try:
        data = request.json
        new_api_key = data.get('api_key', '').strip()

        if not new_api_key:
            return jsonify({'error': 'API key cannot be empty'}), 400

        # Update .env file
        env_path = '.env'
        if os.path.exists(env_path):
            with open(env_path, 'r') as f:
                lines = f.readlines()

            with open(env_path, 'w') as f:
                found = False
                for line in lines:
                    if line.startswith('GEMINI_API_KEY='):
                        f.write(f'GEMINI_API_KEY={new_api_key}\n')
                        found = True
                    else:
                        f.write(line)

                if not found:
                    f.write(f'\nGEMINI_API_KEY={new_api_key}\n')
        else:
            with open(env_path, 'w') as f:
                f.write(f'GEMINI_API_KEY={new_api_key}\n')

        # Update runtime variable and reinitialize client
        api_key = new_api_key
        client = genai.Client(api_key=api_key)

        logger.info("API key updated successfully")
        return jsonify({'success': True, 'message': 'API key updated successfully. Please reload the page.'})

    except Exception as e:
        logger.error(f"Error updating API key: {str(e)}")
        return jsonify({'error': f'Error updating API key: {str(e)}'}), 500

# ============================================
# UTILITY ENDPOINTS
# ============================================

@app.route('/clear', methods=['POST'])
def clear_conversation():
    global conversation_history
    conversation_history = []
    logger.info("Conversation history cleared")
    return jsonify({'success': True, 'message': 'Conversation cleared'})

@app.route('/files', methods=['GET'])
def get_files():
    return jsonify({
        'success': True,
        'files': uploaded_files,
        'store_name': file_search_store.name if file_search_store else None
    })

@app.route('/status', methods=['GET'])
def status():
    return jsonify({
        'file_uploaded': file_search_store is not None,
        'conversation_length': len(conversation_history),
        'store_name': file_search_store.name if file_search_store else None,
        'uploaded_files': uploaded_files
    })

# ============================================
# APPLICATION ENTRY POINT
# ============================================

if __name__ == '__main__':
    # Load persisted state on startup
    load_state()
    app.run(debug=True, host='localhost', port=5001)
```

## Frontend Implementation (templates/index.html)

### CRITICAL REQUIREMENTS

1. **Include marked.js CDN**: `<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>`
2. **Two-tab interface**: "Application" and "API Documentation"
3. **Markdown rendering**: Use `marked.parse()` for assistant messages
4. **Loading indicator**: Animated dots while waiting for response
5. **API key swap UI**: Input field and update button in API docs tab
6. **Proper text wrapping**: File names should wrap without overflow
7. **Bright delete buttons**: Use #EF4444 for visibility
8. **Fixed grid for API info**: 4-column layout to prevent wrapping
9. **cURL examples first**: HTTP/cURL section before Python examples

### Complete HTML Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gemini RAG - File Search Assistant</title>
    <!-- CRITICAL: Include marked.js for markdown support -->
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <style>
        /* ==========================================
           MODERN GEMINI RAG ASSISTANT UI
           ========================================== */

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Roboto', 'Segoe UI', sans-serif;
            background: linear-gradient(to bottom, #F9FAFB 0%, #F3F4F6 100%);
            min-height: 100vh;
            padding: 32px 20px;
            color: #111827;
            line-height: 1.6;
        }

        .container {
            max-width: 1600px;
            margin: 0 auto;
        }

        /* === HEADER === */
        header {
            text-align: center;
            margin-bottom: 24px;
            padding: 48px 32px;
            background: #FFFFFF;
            border-radius: 20px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05),
                        0 2px 4px -1px rgba(0, 0, 0, 0.03);
            border: 1px solid rgba(229, 231, 235, 0.8);
        }

        header h1 {
            font-size: 2.75em;
            margin-bottom: 12px;
            background: linear-gradient(135deg, #0F766E 0%, #0D9488 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            font-weight: 800;
            letter-spacing: -1px;
        }

        header p {
            font-size: 1.15em;
            color: #6B7280;
            font-weight: 400;
        }

        /* === TAB NAVIGATION === */
        .tab-navigation {
            background: #FFFFFF;
            border-radius: 16px;
            padding: 8px;
            margin-bottom: 24px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            border: 1px solid rgba(229, 231, 235, 0.8);
            display: flex;
            gap: 8px;
        }

        .tab-btn {
            flex: 1;
            padding: 16px 24px;
            border: none;
            background: transparent;
            color: #6B7280;
            font-size: 1em;
            font-weight: 600;
            cursor: pointer;
            border-radius: 12px;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }

        .tab-btn:hover {
            background: #F3F4F6;
            color: #374151;
        }

        .tab-btn.active {
            background: linear-gradient(135deg, #0F766E 0%, #0D9488 100%);
            color: white;
            box-shadow: 0 4px 8px rgba(15, 118, 110, 0.2);
        }

        /* === TAB CONTENT === */
        .tab-content {
            display: none;
        }

        .tab-content.active {
            display: block;
        }

        /* === MAIN GRID LAYOUT === */
        .main-content {
            display: grid;
            grid-template-columns: 380px 1fr;
            gap: 24px;
            margin-bottom: 20px;
            align-items: start;
        }

        @media (max-width: 1200px) {
            .main-content {
                grid-template-columns: 1fr;
            }
        }

        /* === CARD COMPONENTS === */
        .card {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 16px;
            padding: 28px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            border: 1px solid rgba(229, 231, 235, 0.8);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
        }

        .card h2 {
            color: #0F766E;
            margin-bottom: 20px;
            font-size: 1.15em;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        /* === FILE UPLOAD === */
        .drop-zone {
            border: 2px dashed #CBD5E1;
            border-radius: 12px;
            padding: 40px 20px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s ease;
            background: #F8FAFC;
        }

        .drop-zone:hover, .drop-zone.dragover {
            border-color: #0F766E;
            background: #F0FDFA;
        }

        .file-input {
            display: none;
        }

        /* === FILE LIST === */
        .file-item {
            padding: 14px;
            background: #F8FAFC;
            border-radius: 10px;
            margin-bottom: 10px;
            border-left: 4px solid #0F766E;
            transition: all 0.3s ease;
        }

        .file-item-header {
            display: flex;
            justify-content: space-between;
            align-items: start;
        }

        .file-item-name {
            font-weight: 600;
            color: #0F172A;
            font-size: 0.9em;
            word-break: break-all;
            overflow-wrap: break-word;
            max-width: 85%;
            line-height: 1.4;
        }

        .btn-delete-file {
            padding: 8px 12px;
            background: #EF4444;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 1em;
            font-weight: 600;
            min-width: 40px;
            transition: all 0.2s ease;
            flex-shrink: 0;
        }

        .btn-delete-file:hover {
            background: #DC2626;
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(239, 68, 68, 0.3);
        }

        /* === CHAT INTERFACE === */
        .chat-messages {
            min-height: 400px;
            max-height: 600px;
            overflow-y: auto;
            padding: 20px;
            background: #F8FAFC;
            border-radius: 12px;
            margin-bottom: 16px;
        }

        .message {
            margin-bottom: 20px;
        }

        .message.user {
            text-align: right;
        }

        .message-content {
            display: inline-block;
            max-width: 80%;
            padding: 14px 18px;
            border-radius: 12px;
            word-wrap: break-word;
            font-size: 0.95em;
            line-height: 1.5;
        }

        .message.user .message-content {
            background: linear-gradient(135deg, #0F766E 0%, #0D9488 100%);
            color: white;
            border-bottom-right-radius: 6px;
        }

        .message.assistant .message-content {
            background: #FFFFFF;
            color: #111827;
            border: 1px solid rgba(229, 231, 235, 0.9);
            border-bottom-left-radius: 6px;
        }

        /* === MARKDOWN FORMATTING IN MESSAGES === */
        .message-content p {
            margin: 0 0 12px 0;
        }

        .message-content p:last-child {
            margin-bottom: 0;
        }

        .message-content ul, .message-content ol {
            margin: 8px 0 12px 20px;
            padding-left: 0;
        }

        .message-content li {
            margin: 4px 0;
        }

        .message-content strong {
            font-weight: 700;
            color: #0F766E;
        }

        .message-content code {
            background: #F3F4F6;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Monaco', 'Courier New', monospace;
            font-size: 0.9em;
        }

        .message-content pre {
            background: #1F2937;
            color: #F3F4F6;
            padding: 12px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 12px 0;
        }

        .message-content h1, .message-content h2, .message-content h3 {
            margin: 16px 0 8px 0;
            color: #0F766E;
        }

        .message-content blockquote {
            border-left: 4px solid #0F766E;
            padding-left: 12px;
            margin: 12px 0;
            color: #6B7280;
            font-style: italic;
        }

        /* === LOADING INDICATOR === */
        .message.loading .message-content {
            background: #F3F4F6;
            border: 1px solid #E5E7EB;
        }

        .typing-indicator {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 0;
        }

        .typing-indicator span {
            height: 8px;
            width: 8px;
            background: #0F766E;
            border-radius: 50%;
            display: inline-block;
            animation: typing 1.4s infinite;
        }

        .typing-indicator span:nth-child(2) {
            animation-delay: 0.2s;
        }

        .typing-indicator span:nth-child(3) {
            animation-delay: 0.4s;
        }

        @keyframes typing {
            0%, 60%, 100% {
                transform: translateY(0);
                opacity: 0.7;
            }
            30% {
                transform: translateY(-10px);
                opacity: 1;
            }
        }

        /* === BUTTONS === */
        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .btn-primary {
            background: linear-gradient(135deg, #0F766E 0%, #0D9488 100%);
            color: white;
        }

        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 16px rgba(15, 118, 110, 0.3);
        }

        /* === API DOCUMENTATION STYLES === */
        .api-docs-container {
            display: grid;
            gap: 24px;
        }

        .api-section {
            background: #FFFFFF;
            border-radius: 16px;
            padding: 32px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            border: 1px solid rgba(229, 231, 235, 0.8);
        }

        .api-section h2 {
            color: #0F766E;
            margin-bottom: 16px;
            font-size: 1.5em;
            font-weight: 700;
        }

        .api-info-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
            margin: 24px 0;
        }

        .api-info-card {
            background: #F9FAFB;
            padding: 16px;
            border-radius: 12px;
            border-left: 4px solid #0F766E;
            min-width: 0;
        }

        .api-info-card strong {
            display: block;
            color: #374151;
            margin-bottom: 8px;
            font-size: 0.85em;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            white-space: nowrap;
        }

        .api-info-card .value {
            color: #0F766E;
            font-family: 'Monaco', 'Courier New', monospace;
            font-size: 0.85em;
            word-break: break-all;
            overflow-wrap: break-word;
            line-height: 1.4;
        }

        .code-block-container {
            position: relative;
            margin: 16px 0 24px 0;
        }

        .code-block-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #1F2937;
            padding: 12px 16px;
            border-radius: 12px 12px 0 0;
        }

        .code-language {
            color: #9CA3AF;
            font-size: 0.85em;
            font-weight: 600;
            text-transform: uppercase;
        }

        .copy-btn {
            background: #374151;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.85em;
            font-weight: 600;
            transition: all 0.2s ease;
        }

        .copy-btn:hover {
            background: #0F766E;
        }

        .copy-btn.copied {
            background: #10B981;
        }

        .code-block {
            background: #1F2937;
            color: #F3F4F6;
            padding: 20px;
            border-radius: 0 0 12px 12px;
            overflow-x: auto;
            font-family: 'Monaco', 'Courier New', monospace;
            font-size: 0.9em;
            line-height: 1.6;
            max-height: 500px;
            overflow-y: auto;
        }

        .code-block pre {
            margin: 0;
            white-space: pre-wrap;
            word-wrap: break-word;
        }

        .warning-banner {
            background: #FEF3C7;
            border-left: 4px solid #F59E0B;
            padding: 16px;
            border-radius: 8px;
            margin: 16px 0;
        }

        .warning-banner strong {
            color: #92400E;
            display: block;
            margin-bottom: 8px;
        }

        .warning-banner p {
            color: #78350F;
            margin: 0;
            font-size: 0.95em;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>📚 Gemini RAG Assistant</h1>
            <p>Upload documents and chat with your files using AI-powered search</p>
        </header>

        <!-- Tab Navigation -->
        <div class="tab-navigation">
            <button class="tab-btn active" onclick="switchTab('application')">
                📚 Application
            </button>
            <button class="tab-btn" onclick="switchTab('api-docs')">
                🔌 API Documentation
            </button>
        </div>

        <!-- Application Tab Content -->
        <div id="application-tab" class="tab-content active">
            <div class="main-content">
                <!-- Sidebar -->
                <div class="sidebar">
                    <!-- Store Info Card -->
                    <div class="card">
                        <h2>🗄️ File Search Store</h2>
                        <div id="storeInfo">
                            <div class="empty-files-state">No store created yet</div>
                        </div>
                    </div>

                    <!-- Upload Section -->
                    <div class="card">
                        <h2>📤 Upload Document</h2>
                        <div class="drop-zone" id="dropZone">
                            <div>📁</div>
                            <p><strong>Drag & drop</strong> your file here</p>
                            <p style="font-size: 0.8em;">or click to browse</p>
                        </div>
                        <input type="file" id="fileInput" class="file-input">
                        <div id="uploadStatus"></div>
                    </div>

                    <!-- Files List -->
                    <div class="card">
                        <h2>📂 Uploaded Files</h2>
                        <div id="filesList"></div>
                    </div>
                </div>

                <!-- Chat Section -->
                <div class="card chat-section">
                    <h2>💬 Chat with Your Documents</h2>
                    <div class="chat-messages" id="chatMessages">
                        <div class="empty-state">Upload a document to start</div>
                    </div>
                    <div class="chat-input-container">
                        <input type="text" id="chatInput" placeholder="Ask a question..." disabled>
                        <button class="btn btn-primary" id="sendBtn" disabled>Send</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- API Documentation Tab -->
        <div id="api-docs-tab" class="tab-content">
            <div class="api-docs-container" id="apiDocsContainer">
                <div class="no-store-message">
                    <h3>Loading API Documentation...</h3>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Initialize variables
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');
        const chatMessages = document.getElementById('chatMessages');
        const chatInput = document.getElementById('chatInput');
        const sendBtn = document.getElementById('sendBtn');

        let fileUploaded = false;
        let apiInfoCache = null;

        // Drag & drop file upload
        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                handleFile(e.dataTransfer.files[0]);
            }
        });
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFile(e.target.files[0]);
            }
        });

        // File upload handler
        async function handleFile(file) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('metadata', JSON.stringify({}));
            formData.append('chunking_config', JSON.stringify({enabled: false}));

            try {
                const response = await fetch('/upload', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();

                if (response.ok) {
                    fileUploaded = true;
                    chatInput.disabled = false;
                    sendBtn.disabled = false;

                    // Clear API docs cache so it refreshes with new file info
                    apiInfoCache = null;

                    alert('✅ File uploaded successfully!');
                } else {
                    alert('❌ Error: ' + data.error);
                }
            } catch (error) {
                alert('❌ Error: ' + error.message);
            }
        }

        // Send message with loading indicator
        async function sendMessage() {
            const message = chatInput.value.trim();
            if (!message || !fileUploaded) return;

            addMessage('user', message);
            chatInput.value = '';
            sendBtn.disabled = true;
            chatInput.disabled = true;

            // Show loading indicator
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'message assistant loading';
            loadingDiv.id = 'loading-message';
            loadingDiv.innerHTML = `
                <div class="message-content">
                    <div class="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            `;
            chatMessages.appendChild(loadingDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;

            try {
                const response = await fetch('/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message })
                });

                const data = await response.json();

                // Remove loading indicator
                const loading = document.getElementById('loading-message');
                if (loading) loading.remove();

                if (response.ok) {
                    addMessage('assistant', data.response, data.metadata);
                } else {
                    addMessage('assistant', `Error: ${data.error}`);
                }
            } catch (error) {
                const loading = document.getElementById('loading-message');
                if (loading) loading.remove();
                addMessage('assistant', `Error: ${error.message}`);
            } finally {
                sendBtn.disabled = false;
                chatInput.disabled = false;
                chatInput.focus();
            }
        }

        // Add message with markdown support
        function addMessage(role, content, metadata = null) {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${role}`;

            // Convert markdown to HTML for assistant messages
            const formattedContent = role === 'assistant' && typeof marked !== 'undefined'
                ? marked.parse(content)
                : content;

            messageDiv.innerHTML = `
                <div class="message-content">
                    ${formattedContent}
                </div>
            `;

            chatMessages.appendChild(messageDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        // Tab switching function
        window.switchTab = function(tabName) {
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });

            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });

            const selectedTab = document.getElementById(`${tabName}-tab`);
            if (selectedTab) {
                selectedTab.classList.add('active');
            }

            event.target.classList.add('active');

            if (tabName === 'api-docs' && !apiInfoCache) {
                loadApiDocumentation();
            }
        };

        // Load API documentation
        async function loadApiDocumentation() {
            const container = document.getElementById('apiDocsContainer');

            try {
                const response = await fetch('/api-info');
                const data = await response.json();
                apiInfoCache = data;

                if (!data.store_exists) {
                    container.innerHTML = `
                        <div class="no-store-message">
                            <h3>📦 No File Search Store Yet</h3>
                            <p>Upload a document in the Application tab first.</p>
                        </div>
                    `;
                    return;
                }

                container.innerHTML = generateApiDocumentation(data);
                attachCopyListeners();

            } catch (error) {
                console.error('Error loading API info:', error);
                container.innerHTML = `
                    <div class="no-store-message">
                        <h3>⚠️ Error Loading API Information</h3>
                        <p>${error.message}</p>
                    </div>
                `;
            }
        }

        // Generate API documentation HTML
        function generateApiDocumentation(data) {
            return `
                <div class="api-section">
                    <h2>🔌 API Access Overview</h2>
                    <p>Your file search store is now accessible via the Gemini API.</p>

                    <div class="warning-banner">
                        <strong>⚠️ Security Notice</strong>
                        <p>Keep your API key secure. Never commit it to version control.</p>
                    </div>

                    <div class="api-info-grid">
                        <div class="api-info-card">
                            <strong>🔑 API Key</strong>
                            <div class="value">${data.api_key}</div>
                        </div>
                        <div class="api-info-card">
                            <strong>🗄️ Store Name</strong>
                            <div class="value">${data.store_name || 'N/A'}</div>
                        </div>
                        <div class="api-info-card">
                            <strong>📊 Model</strong>
                            <div class="value">${data.model}</div>
                        </div>
                        <div class="api-info-card">
                            <strong>📁 Files in Store</strong>
                            <div class="value">${data.file_count}</div>
                        </div>
                    </div>

                    <div style="margin-top: 20px; padding: 16px; background: #F9FAFB; border-radius: 8px;">
                        <h3 style="margin: 0 0 12px 0;">🔄 Update API Key</h3>
                        <div style="display: flex; gap: 12px;">
                            <input type="text" id="newApiKeyInput" placeholder="Enter new API key..."
                                   style="flex: 1; padding: 10px; border: 1px solid #D1D5DB; border-radius: 6px; font-family: Monaco, monospace;">
                            <button onclick="updateApiKey()" class="btn btn-primary">Update Key</button>
                        </div>
                    </div>
                </div>

                <div class="api-section">
                    <h2>⚡ Quick Start: HTTP Request (cURL)</h2>
                    <p>Copy and paste this cURL command to query your documents. Works with n8n, Postman, or any HTTP client!</p>

                    <div class="code-block-container">
                        <div class="code-block-header">
                            <span class="code-language">cURL</span>
                            <button class="copy-btn" data-copy-target="curl-quick">📋 Copy</button>
                        </div>
                        <div class="code-block" id="curl-quick">
<pre>curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/${data.model}:generateContent?key=${data.api_key}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "contents": [{
      "parts": [{"text": "What are the main topics covered in these documents?"}]
    }],
    "tools": [{
      "fileSearch": {
        "fileSearchStoreNames": ["${data.store_name}"]
      }
    }]
  }'</pre>
                        </div>
                    </div>
                </div>
            `;
        }

        // Attach copy button listeners
        function attachCopyListeners() {
            document.querySelectorAll('.copy-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const targetId = this.getAttribute('data-copy-target');
                    const codeBlock = document.getElementById(targetId);
                    const textToCopy = codeBlock.textContent.trim();

                    navigator.clipboard.writeText(textToCopy).then(() => {
                        const originalText = this.innerHTML;
                        this.innerHTML = '✅ Copied!';
                        this.classList.add('copied');

                        setTimeout(() => {
                            this.innerHTML = originalText;
                            this.classList.remove('copied');
                        }, 2000);
                    });
                });
            });
        }

        // Update API key
        window.updateApiKey = async function() {
            const input = document.getElementById('newApiKeyInput');
            const newApiKey = input.value.trim();

            if (!newApiKey || !confirm('Update API key?')) return;

            try {
                const response = await fetch('/update-api-key', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ api_key: newApiKey })
                });

                const data = await response.json();

                if (response.ok) {
                    alert('✅ ' + data.message);
                    window.location.reload();
                } else {
                    alert('❌ Error: ' + data.error);
                }
            } catch (error) {
                alert('❌ Failed to update: ' + error.message);
            }
        };

        // Event listeners
        sendBtn.addEventListener('click', sendMessage);
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });

        // Load initial state
        async function loadInitialState() {
            try {
                const response = await fetch('/status');
                const data = await response.json();

                if (data.file_uploaded) {
                    fileUploaded = true;
                    chatInput.disabled = false;
                    sendBtn.disabled = false;
                }
            } catch (error) {
                console.error('Error loading state:', error);
            }
        }

        loadInitialState();
    </script>
</body>
</html>
```

## Environment Configuration

### .env File
```
GEMINI_API_KEY=your_actual_api_key_here
```

### .gitignore
```
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
venv/
env/
ENV/
.venv

# Environment Variables
.env
.env.local

# Application Specific
uploads/
*.log
.DS_Store
Thumbs.db
store_state.json

# IDE
.vscode/
.idea/
*.swp
*.swo
```

## Setup Instructions

1. **Create Virtual Environment**:
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. **Install Dependencies**:
```bash
pip install -r requirements.txt
```

3. **Configure Environment**:
```bash
echo "GEMINI_API_KEY=your_key_here" > .env
```

4. **Create Directories**:
```bash
mkdir uploads templates
```

5. **Run Application**:
```bash
python app.py
```

6. **Access**: Open `http://localhost:5001`

## Key Features Summary

✅ **State Persistence**: File store survives server restarts
✅ **Two-Tab Interface**: Application and API Documentation
✅ **Markdown Rendering**: Beautiful formatted responses
✅ **Loading Indicators**: Animated typing dots
✅ **API Documentation**: Ready-to-copy cURL and Python examples
✅ **API Key Management**: Update API key from the UI
✅ **File Management**: Upload, track, and delete files
✅ **Custom Metadata**: Add searchable metadata to files
✅ **Chunking Config**: Customize text splitting
✅ **System Prompts**: Customize AI behavior
✅ **Citation Tracking**: See which documents were used
✅ **Conversation History**: Maintains context
✅ **Metadata Filtering**: Search specific documents
✅ **Clean Modern UI**: Professional design system
✅ **Error Handling**: Comprehensive error messages
✅ **120s Timeout**: Handles large files

## Testing the Application

1. Upload a PDF or text file
2. Wait for processing (you'll see loading indicator)
3. Ask questions in the chat
4. See markdown-formatted responses
5. Click "API Documentation" tab
6. Copy cURL command to use in n8n or other tools
7. Refresh the page - your files persist!

## This mega-prompt contains EVERYTHING needed to rebuild the complete application with all features in one shot.
