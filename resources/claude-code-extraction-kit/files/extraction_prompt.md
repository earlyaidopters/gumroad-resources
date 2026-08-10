# Extraction Super Prompt

Use this prompt after creating any impressive document (Excel, PowerPoint, Word, PDF) with Claude AI. It reverse-engineers exactly how the file was built so you can recreate it programmatically.

---

I just created a [EXCEL / POWERPOINT / DOCX / PDF] file that demonstrates impressive functionality and professional business output. My goal is to understand exactly how this was built so I can recreate this capability programmatically using Claude Code or similar development environments.

PLEASE PROVIDE A COMPLETE EXTRACTION GUIDE:

1. STRUCTURE & ARCHITECTURE
   - Document/workbook structure: How many sheets/slides/sections? How are they organized?
   - Hierarchy and relationships: How do different parts connect?
   - Data flow: If applicable, how does data flow through the document?
   - Design system: What are the core design elements (colors, fonts, spacing, hierarchy)?

2. CONTENT GENERATION STRATEGY
   - Content methodology: How was the narrative structure determined?
   - Data organization: How is information logically grouped and sequenced?
   - Realistic data: How were the specific numbers, metrics, and examples created?
   - Messaging framework: What's the core story/message arc?

3. FORMATTING & STYLING
   - Color palette: Exact hex/RGB values for all colors used
   - Typography: Font names, sizes, weights, line heights for all text elements
   - Layout: Spacing, margins, padding, sizing systems
   - Visual elements: Charts, tables, icons, images—how are they structured?
   - For POWERPOINT specifically: slide master details, theme information
   - For DOCX specifically: paragraph styles, heading hierarchy, table formatting
   - For EXCEL specifically: cell formatting, conditional formatting, number formats, named ranges
   - For PDF specifically: font embedding, image resolution, layout specifications

4. FORMULAS & CALCULATIONS (if applicable)
   - For EXCEL: Complete list of all formulas used, including:
     * Cell references and ranges
     * Function types (SUM, IF, VLOOKUP, etc.)
     * Named ranges used
     * Data validation rules
   - For other formats: Any calculation logic or dynamic content rules

5. DATA LOGIC
   - For EXCEL: How data connects across sheets? How are assumptions applied to calculations?
   - For POWERPOINT: How are charts data-linked to underlying data?
   - For DOCX/PDF: Is any content conditionally generated? How are tables populated?

6. IMPLEMENTATION STEPS (CRITICAL)
   - Step-by-step creation process as if building from scratch:
     * Step 1: [Specific action]
     * Step 2: [Specific action]
     * Continue until complete...
   - For each step, explain: What exactly to create, Where to place it, What properties/formatting to apply
   - Include the order in which to build components (sometimes order matters for references)

7. CODE/PSEUDO-CODE (CRITICAL)
   - If building in EXCEL using openpyxl (Python): Show the code for creating sheets, adding data, applying formatting, embedding charts
   - If building in POWERPOINT using python-pptx: Show how to create slides, add text, apply styling, embed visuals
   - If building in DOCX using python-docx: Show how to create sections, add paragraphs, apply styles, embed tables/images
   - If using PDF generation library (e.g., reportlab or pypdf): Show the code structure
   - Include actual code snippets wherever possible
   - Show import statements, class instantiation, and complete workflows
   - Include error handling and best practices

8. KEY ASSETS REQUIRED
   - List every asset needed to recreate this:
     * Data files (spreadsheets with base data)
     * Images or graphics (with specifications)
     * Brand assets (logos, color codes)
     * Fonts (with fallbacks)
     * Templates or style guides
     * Any external data sources or APIs
     * Specific libraries or tools required

9. VARIABLES & CONFIGURATION
   - What inputs/variables make this flexible?
   - Which values would need to change for different use cases?
   - How would you parameterize this for different scenarios?
   - Configuration options available

10. REUSABILITY & MODULARITY
    - How could this be built as modular, reusable components?
    - Which parts are generic and which are specific to this use case?
    - How would you structure this for easy customization?
    - Suggestions for making this a template-based system

11. QUALITY CHECKLIST
    - What formatting and styling checks ensure quality?
    - How to validate that output matches the original?
    - Performance considerations if scaling this?
    - Common mistakes to avoid when recreating this

12. COMPLETE RECREATION PACKAGE
    - Provide everything needed in a single reference guide:
      * Complete code (as a single code block if Python-based)
      * All configuration values
      * Step-by-step instructions
      * Asset specifications
      * Testing/validation approach

FORMAT THE RESPONSE AS:
- Code sections in clearly marked code blocks with language specified
- Structured headings and bullet points for easy scanning
- Actual values (colors, fonts, sizes) not placeholders
- Complete, working code not pseudo-code (unless actual implementation isn't possible)
- A final "QUICK START" section that provides the essential 5-step process to recreate this

GOAL: After reading this extraction, someone with basic programming knowledge should be able to recreate this file with the same structure, styling, data, and functionality using Claude Code, Python, or similar development environments.
