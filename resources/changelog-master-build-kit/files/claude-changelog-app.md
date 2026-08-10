# Claude Code Changelog Tracker

A full-stack SPA that fetches Claude Code's changelog from GitHub, uses Gemini 3 Flash for intelligent analysis, generates audio narration via Gemini TTS, and sends email notifications directly via Resend.

---

## Quick Start for Claude Code

When building this app, follow these steps:

1. **Create `to-do.md`** in the project root using the template in the [Task Tracking](#task-tracking) section
2. **Work through phases in order** - complete Phase 1 before Phase 2, etc.
3. **Check off tasks** as you complete them in `to-do.md`
4. **Test each phase** before moving to the next

---

## Architecture Overview

```
GitHub CHANGELOG.md
        ↓
    Fetch & Parse
        ↓
  Gemini 3 Flash (Analyze)
        ↓
   Local JSON Cache
        ↓
     React + Vite UI
    ├─ Raw Changelog View
    ├─ Matters View (AI-Categorized)
    └─ Audio Controls
        ↓
    Gemini TTS (Audio Gen)
        ↓
   Audio Player + Download
        ↓
    Resend API (Email)
        ↓
   Direct to Inbox
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS 4 |
| Icons | Lucide React |
| Markdown | react-markdown + remark-gfm |
| Caching | IndexedDB (idb-keyval) |
| AI Analysis | Gemini 3 Flash API |
| Audio | Gemini 2.5 Flash TTS API |
| Email | Resend API (server-side) |
| Backend | Express.js (minimal, for email only) |

---

## Environment Variables

Create `.env` in the app root:

```bash
# Frontend (Vite)
VITE_GEMINI_API_KEY=your-gemini-api-key
VITE_CHANGELOG_CACHE_DURATION=3600000
VITE_VOICE_PREFERENCE=Charon

# Backend (Email Server)
RESEND_API_KEY=re_xxxxxxxxxxxx
NOTIFY_EMAIL=you@example.com
```

### Getting API Keys

1. **Gemini API Key**: [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. **Resend API Key**: [resend.com/api-keys](https://resend.com/api-keys) (free tier: 100 emails/day)

---

## API Integrations

### 1. Gemini 3 Flash (Changelog Analysis)

**Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent`

**Headers:**
```
Content-Type: application/json
x-goog-api-key: ${GEMINI_API_KEY}
```

**Request Body:**
```json
{
  "contents": [{
    "parts": [{
      "text": "SYSTEM_PROMPT + CHANGELOG_DATA"
    }]
  }],
  "generationConfig": {
    "responseMimeType": "application/json",
    "thinkingConfig": {
      "thinkingLevel": "high"
    }
  }
}
```

**Analysis Prompt:**
```
You are an expert at analyzing Claude Code changelogs. Analyze the following changelog and return JSON:

{
  "tldr": "150-200 word summary for busy developers",
  "categories": {
    "critical_breaking_changes": ["list"],
    "removals": [{"feature": "name", "severity": "critical|high|medium|low", "why": "reason"}],
    "major_features": ["list"],
    "important_fixes": ["list"],
    "new_slash_commands": ["list"],
    "terminal_improvements": ["list"],
    "api_changes": ["list"]
  },
  "action_items": ["specific actions developers should take"],
  "sentiment": "positive|neutral|critical"
}

Changelog to analyze:
[CHANGELOG_DATA]
```

**Cache Strategy:** Cache by version number. Only re-analyze when a new version is detected.

---

### 2. Gemini TTS (Audio Generation)

**Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent`

**Headers:**
```
Content-Type: application/json
x-goog-api-key: ${GEMINI_API_KEY}
```

**Request Body:**
```json
{
  "contents": [{
    "parts": [{
      "text": "Read this changelog summary in an informative tone: [TEXT]"
    }]
  }],
  "generationConfig": {
    "responseModalities": ["AUDIO"],
    "speechConfig": {
      "voiceConfig": {
        "prebuiltVoiceConfig": {
          "voiceName": "Charon"
        }
      }
    }
  }
}
```

**Response:** Base64-encoded PCM audio (24kHz, 16-bit, mono)

**Convert to WAV:**
```typescript
function pcmToWav(pcmData: ArrayBuffer): ArrayBuffer {
  const sampleRate = 24000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmData.byteLength;
  const headerSize = 44;

  const buffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(buffer);

  // WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // PCM data
  new Uint8Array(buffer, headerSize).set(new Uint8Array(pcmData));

  return buffer;
}
```

**Available Voices:**
| Voice | Tone |
|-------|------|
| Charon | Informative (default) |
| Puck | Upbeat |
| Kore | Firm |
| Zephyr | Bright |
| Aoede | Breezy |

**Cache Strategy:** Cache audio by text hash in IndexedDB.

---

### 3. Resend (Email Notifications)

**Endpoint:** `https://api.resend.com/emails`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer ${RESEND_API_KEY}
```

**Request Body:**
```json
{
  "from": "Changelog Tracker <onboarding@resend.dev>",
  "to": ["you@example.com"],
  "subject": "Claude Code v2.0.74 Released",
  "html": "<h1>TL;DR</h1><p>...</p><h2>Changes</h2>..."
}
```

**Note:** Use `onboarding@resend.dev` as sender for testing, or verify your own domain.

---

## File Structure

```
app/
├── .env
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── server/
│   └── index.ts          # Express server for email
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── TabNav.tsx
│   │   ├── ChangelogView.tsx
│   │   ├── MattersView.tsx
│   │   ├── AudioPlayer.tsx
│   │   ├── VoiceSelector.tsx
│   │   ├── EmailButton.tsx
│   │   └── LoadingSkeleton.tsx
│   ├── services/
│   │   ├── index.ts
│   │   ├── changelogService.ts
│   │   ├── geminiService.ts
│   │   ├── ttsService.ts
│   │   ├── emailService.ts
│   │   └── cacheService.ts
│   ├── hooks/
│   │   ├── useChangelog.ts
│   │   ├── useAudio.ts
│   │   └── useTheme.ts
│   └── types/
│       └── index.ts
└── to-do.md
```

---

## Component Specifications

### Header
- Latest version badge (e.g., "v2.0.74")
- "Last updated" timestamp
- Refresh button
- Dark/light mode toggle
- Email notification button

### TabNav
- Two tabs: "Changelog" and "What Matters"
- Active tab indicator
- Smooth transitions

### ChangelogView (Default Tab)
- Raw markdown rendered with syntax highlighting
- Organized by version (expandable sections)
- Visual indicators: 🚀 feature, 🔧 fix, ⚠️ removal, 🚨 breaking
- Copy-to-clipboard for individual items

### MattersView (AI-Analyzed Tab)
- TLDR paragraph at top
- Severity-based sections:
  - 🚨 Critical/Breaking Changes (red)
  - ⚠️ Removals (orange)
  - ✨ Major Features (teal)
  - 🔧 Important Fixes (gray)
- Action items checklist
- Sentiment indicator

### AudioPlayer
- Play/pause button
- Progress bar with current time / duration
- Voice selector dropdown
- "Read Latest" and "Read TLDR Only" buttons
- Download audio button
- Loading state during generation

### EmailButton
- "Send to Email" button
- Success/error toast feedback
- Disabled state while sending

---

## Design System

### Colors
```css
/* Light Mode */
--bg-primary: #ffffff;
--bg-secondary: #f3f4f6;
--text-primary: #111827;
--text-secondary: #6b7280;
--accent: #d97706;
--success: #10b981;
--warning: #f59e0b;
--error: #ef4444;

/* Dark Mode */
--bg-primary: #111827;
--bg-secondary: #1f2937;
--text-primary: #f9fafb;
--text-secondary: #9ca3af;
```

### Typography
- Font: System font stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`)
- Headings: Bold, 1.25rem - 2rem
- Body: Regular, 1rem
- Code: Monospace, 0.875rem

### Responsive Breakpoints
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

---

## State Management

Use React hooks and context. Track:

```typescript
interface AppState {
  // Data
  rawChangelog: string | null;
  parsedChangelog: ChangelogVersion[];
  analysis: GeminiAnalysis | null;

  // UI State
  activeTab: 'changelog' | 'matters';
  isLoading: boolean;
  error: string | null;

  // Audio
  audioUrl: string | null;
  isGeneratingAudio: boolean;
  isPlaying: boolean;
  selectedVoice: string;

  // Timestamps
  lastFetched: number | null;
  lastAnalyzed: number | null;
}
```

---

## Error Handling

1. **GitHub fetch fails**: Show cached version if available, otherwise error message
2. **Gemini analysis fails**: Show raw changelog with "Analysis unavailable" notice
3. **TTS generation fails**: Disable audio controls, show "Audio unavailable" toast
4. **Email fails**: Show error toast with retry option

Implement exponential backoff for retries (1s, 2s, 4s, max 3 attempts).

---

## Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "dev:server": "tsx server/index.ts",
    "dev:all": "concurrently \"npm run dev\" \"npm run dev:server\"",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  }
}
```

---

## Task Tracking

Create `to-do.md` in the project root with this template:

```markdown
# Claude Code Changelog Tracker - Implementation Tasks

## Phase Status

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Project Setup | ⬜ Not Started |
| 2 | Core Services | ⬜ Not Started |
| 3 | UI Components | ⬜ Not Started |
| 4 | Audio Features | ⬜ Not Started |
| 5 | Email Integration | ⬜ Not Started |
| 6 | Polish & Testing | ⬜ Not Started |

---

## Phase 1: Project Setup

- [ ] Initialize Vite + React + TypeScript project
- [ ] Install dependencies (tailwindcss, lucide-react, react-markdown, idb-keyval)
- [ ] Configure Tailwind CSS 4
- [ ] Create .env.example with required variables
- [ ] Set up file structure (components/, services/, hooks/, types/)
- [ ] Create base types in types/index.ts

## Phase 2: Core Services

- [ ] Implement changelogService.ts (fetch from GitHub raw URL)
- [ ] Implement markdown parsing logic (extract versions, dates, items)
- [ ] Implement geminiService.ts (Gemini 3 Flash analysis)
- [ ] Implement cacheService.ts (IndexedDB for audio, memory for analysis)
- [ ] Add error handling and retry logic

## Phase 3: UI Components

- [ ] Create Header component (version badge, refresh, theme toggle)
- [ ] Create TabNav component (Changelog / What Matters tabs)
- [ ] Create ChangelogView component (raw markdown display)
- [ ] Create MattersView component (AI-analyzed categories)
- [ ] Create LoadingSkeleton components
- [ ] Implement dark mode with useTheme hook
- [ ] Add responsive styles for mobile/tablet/desktop

## Phase 4: Audio Features

- [ ] Implement ttsService.ts (Gemini TTS API)
- [ ] Implement PCM to WAV conversion
- [ ] Create AudioPlayer component (play/pause, progress, download)
- [ ] Create VoiceSelector dropdown
- [ ] Add audio caching (IndexedDB by text hash)
- [ ] Handle loading states and errors

## Phase 5: Email Integration

- [ ] Create server/index.ts (Express + Resend)
- [ ] Implement /api/send-changelog endpoint
- [ ] Create EmailButton component in frontend
- [ ] Create emailService.ts (frontend API caller)
- [ ] Add success/error toast notifications

## Phase 6: Polish & Testing

- [ ] Add keyboard navigation (tab, enter, escape)
- [ ] Add ARIA labels for accessibility
- [ ] Test dark mode thoroughly
- [ ] Test mobile responsiveness
- [ ] Test all error states
- [ ] Verify caching works correctly
- [ ] Final code cleanup

---

## Notes

- Mark tasks with [x] when complete
- Update phase status when all tasks in phase are done
- Test each phase before moving to next
```

---

## Success Criteria

- [ ] Changelog fetches and displays correctly
- [ ] Gemini analysis returns valid categorized JSON
- [ ] "What Matters" tab shows intelligent summary
- [ ] Audio plays without errors
- [ ] Audio can be downloaded as WAV
- [ ] Email sends successfully via Resend
- [ ] Dark mode works smoothly
- [ ] Mobile layout is usable
- [ ] Keyboard navigation works
- [ ] Caching reduces API calls on refresh

---

## References

- **Gemini 3 Flash**: See `gemini-3.md` for API details and thinking levels
- **Gemini TTS**: See `audio_understanding.md` for voice options and prompting
- **Resend**: [resend.com/docs](https://resend.com/docs)
