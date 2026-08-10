# Phase 3: PDF Tools

Copy and paste this prompt into Claude Code to implement PDF tools:

---

## PROMPT

```
Let's implement Phase 3: PDF Tools (Merge & Split) for Media Toolkit.

## Feature Requirements

### PDF Merge
- Upload multiple PDF files
- Drag to reorder files in the list
- Merge all PDFs in the specified order
- Download the combined PDF

### PDF Split
Two modes:
1. **Split All**: Split every page into individual PDFs, download as ZIP
2. **Extract Pages**: Extract specific pages using range syntax (e.g., "1,3,5-7,10")

### Technical Details
- Use pypdf library for PDF manipulation
- Preserve PDF metadata and formatting
- Support page range parsing: "1-5" means pages 1 through 5, "1,3,5" means pages 1, 3, and 5
- Create ZIP in-memory for split operations
- Validate page numbers against actual PDF page count

## Files to Create/Modify

### 1. Update requirements.txt
Add:
```
pypdf>=4.0.1
```

### 2. Create app/services/pdf_service.py
Functions needed:
- `merge_pdfs(pdf_paths)` - returns merged PDF path
- `split_pdf_all(pdf_path)` - returns ZIP path with all pages
- `split_pdf_range(pdf_path, page_range)` - returns PDF path or ZIP path
- `parse_page_range(range_string, max_pages)` - returns list of page numbers
- `get_pdf_info(pdf_path)` - returns page count and other metadata

### 3. Create app/routers/pdf.py
Endpoints:
- `POST /api/pdf/merge` - Merge multiple PDFs
  - Form data: files[] (ordered)
  - Returns: FileResponse with merged PDF
- `POST /api/pdf/split` - Split a PDF
  - Form data: file, mode ("all" or "range"), pages (optional)
  - Returns: ZIP for "all" mode, PDF or ZIP for "range" mode

### 4. Update app/main.py
- Import and include the pdf router

### 5. Create static/js/pdf.js
- Tab navigation between Merge and Split modes
- Merge mode:
  - File upload with drag-and-drop
  - Sortable file list (drag to reorder)
  - Merge button
  - Download result
- Split mode:
  - Single file upload
  - Show PDF info (page count)
  - Mode toggle: "Split All" vs "Extract Pages"
  - Page range input (for extract mode)
  - Split button
  - Download result

### 6. Update templates/index.html
Add the PDF Tools panel with:
- Tab bar: [Merge] [Split]
- Merge content:
  - Drop zone for multiple PDFs
  - Sortable file list
  - Merge button
- Split content:
  - Drop zone for single PDF
  - PDF info display (pages)
  - Mode selector
  - Page range input
  - Split button
- Results section

### 7. Update static/css/styles.css
Add styles for:
- Tab navigation
- Sortable list with drag handles
- Drag-over states for reordering
- Page range input field
- Mode toggle buttons

## UI Design

### Merge Tab
```
┌─────────────────────────────────────────┐
│ ← Back to Menu                          │
│                                         │
│ PDF TOOLS                               │
│ [■ Merge] [ Split ]                     │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │   📁 Drop PDF files here           │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Files to Merge (drag to reorder):       │
│ ┌─────────────────────────────────────┐ │
│ │ ≡ document1.pdf  12 pages    [×]   │ │
│ │ ≡ document2.pdf   8 pages    [×]   │ │
│ │ ≡ document3.pdf   4 pages    [×]   │ │
│ └─────────────────────────────────────┘ │
│ Total: 24 pages                         │
│                                         │
│ [  Merge PDFs  ]                        │
└─────────────────────────────────────────┘
```

### Split Tab
```
┌─────────────────────────────────────────┐
│ ← Back to Menu                          │
│                                         │
│ PDF TOOLS                               │
│ [ Merge ] [■ Split]                     │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │   📁 Drop a PDF file here          │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Selected: document.pdf (24 pages)       │
│                                         │
│ Split Mode:                             │
│ (●) Split all pages                     │
│ ( ) Extract specific pages              │
│                                         │
│ Page Range: [1-5, 10, 15-20          ]  │
│ (e.g., "1-5, 10, 15-20")               │
│                                         │
│ [  Split PDF  ]                         │
│                                         │
│ Result: ✓ Split into 11 pages           │
│ [  Download ZIP  ]                      │
└─────────────────────────────────────────┘
```

## Deliverables
After this phase:
1. I can upload multiple PDFs and merge them
2. I can drag to reorder PDFs before merging
3. I can split a PDF into individual pages
4. I can extract specific pages using range syntax
5. Downloads work correctly (single PDF or ZIP)

Implement this feature now. Ensure the drag-to-reorder is smooth and the tab navigation integrates with the existing theme.
```

---

## Verification Steps

After Claude completes this phase:

1. Test PDF Merge:
   - [ ] Upload multiple PDFs
   - [ ] Drag to reorder works
   - [ ] Merge creates combined PDF
   - [ ] Page count is correct

2. Test PDF Split:
   - [ ] "Split All" creates ZIP with individual pages
   - [ ] "Extract Pages" with "1,3,5" extracts those pages
   - [ ] "Extract Pages" with "1-5" extracts range
   - [ ] Invalid page numbers show error

Once verified, proceed to `04-audio-extraction.md`.
