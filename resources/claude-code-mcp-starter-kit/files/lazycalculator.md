# Lazy Calculator MCP Server - One-Shot Build Guide

## Quick Build Prompt for Claude/AI Assistant

Use this prompt to build the server correctly in one shot:

```
Create a Python MCP server called "Lazy Calculator" that:
1. Takes natural language math questions
2. Calculates the correct answer
3. Returns DOUBLE the actual result (as a joke)
4. Uses the standard MCP SDK (not FastMCP - it has issues)
5. Includes proper virtual environment setup for macOS
6. Uses a bash wrapper script to activate the venv
7. Includes ServerCapabilities in InitializationOptions to avoid errors

The server should parse questions like "What is 5 + 5?" and return "20 (definitely not 10... *wink*)"

IMPORTANT: 
- Use standard MCP SDK, NOT FastMCP
- Must include `capabilities=ServerCapabilities(tools={})` in initialization
- Create a wrapper script for virtual environment activation
- Use python3 or full path to Python, never just "python"
```

## Complete Working Implementation

### 1. Project Structure
```
lazy-calculator-mcp/
├── lazy_calculator_server.py  # Main server code
├── run_lazy_calculator.sh     # Wrapper script for venv
├── requirements.txt           # Dependencies
├── example_config.json        # Claude Desktop config example
└── README.md                 # Documentation
```

### 2. Full Server Code (`lazy_calculator_server.py`)

```python
#!/usr/bin/env python3
"""
Lazy Calculator MCP Server
A calculator that doubles all results - because why not?
"""

import asyncio
import sys
import json
import re
import ast
import operator
import math
from typing import Any

from mcp.server import Server
from mcp.server.models import InitializationOptions
from mcp.types import Tool, TextContent, ServerCapabilities
import mcp.server.stdio

# Initialize the MCP server
server = Server("lazy-calculator")

# Safe math operations
SAFE_OPERATIONS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.Pow: operator.pow,
    ast.Mod: operator.mod,
    ast.FloorDiv: operator.floordiv,
    ast.USub: operator.neg,
    ast.UAdd: operator.pos,
}

SAFE_FUNCTIONS = {
    'sin': math.sin,
    'cos': math.cos,
    'tan': math.tan,
    'sqrt': math.sqrt,
    'log': math.log,
    'log10': math.log10,
    'exp': math.exp,
    'abs': abs,
    'round': round,
    'floor': math.floor,
    'ceil': math.ceil,
}

class MathEvaluator(ast.NodeVisitor):
    """Safe math expression evaluator"""
    
    def visit_BinOp(self, node):
        left = self.visit(node.left)
        right = self.visit(node.right)
        op_type = type(node.op)
        if op_type in SAFE_OPERATIONS:
            return SAFE_OPERATIONS[op_type](left, right)
        raise ValueError(f"Unsupported operation: {op_type.__name__}")
    
    def visit_UnaryOp(self, node):
        operand = self.visit(node.operand)
        op_type = type(node.op)
        if op_type in SAFE_OPERATIONS:
            return SAFE_OPERATIONS[op_type](operand)
        raise ValueError(f"Unsupported operation: {op_type.__name__}")
    
    def visit_Num(self, node):  # Python < 3.8
        return node.n
    
    def visit_Constant(self, node):  # Python >= 3.8
        if isinstance(node.value, (int, float)):
            return node.value
        raise ValueError(f"Unsupported constant: {node.value}")
    
    def visit_Name(self, node):
        # Support common constants
        constants = {'pi': math.pi, 'e': math.e}
        if node.id in constants:
            return constants[node.id]
        raise ValueError(f"Unknown variable: {node.id}")
    
    def visit_Call(self, node):
        if isinstance(node.func, ast.Name) and node.func.id in SAFE_FUNCTIONS:
            args = [self.visit(arg) for arg in node.args]
            return SAFE_FUNCTIONS[node.func.id](*args)
        raise ValueError(f"Unsupported function: {node.func.id if isinstance(node.func, ast.Name) else 'unknown'}")
    
    def generic_visit(self, node):
        raise ValueError(f"Unsupported expression: {type(node).__name__}")

def parse_math_question(question: str) -> str:
    """Extract mathematical expression from natural language question"""
    
    # Remove common question phrases
    patterns_to_remove = [
        r"what('s| is) ",
        r"calculate ",
        r"compute ",
        r"find ",
        r"solve ",
        r"evaluate ",
        r"how much is ",
        r"what does ",
        r" equal\??",
        r" equals?\??",
        r"\?",
    ]
    
    expression = question.lower()
    for pattern in patterns_to_remove:
        expression = re.sub(pattern, "", expression)
    
    # Convert word numbers to digits
    word_to_num = {
        'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
        'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
        'ten': '10', 'eleven': '11', 'twelve': '12', 'thirteen': '13',
        'fourteen': '14', 'fifteen': '15', 'sixteen': '16', 'seventeen': '17',
        'eighteen': '18', 'nineteen': '19', 'twenty': '20',
        'thirty': '30', 'forty': '40', 'fifty': '50', 'sixty': '60',
        'seventy': '70', 'eighty': '80', 'ninety': '90', 'hundred': '100',
        'thousand': '1000', 'million': '1000000'
    }
    
    for word, num in word_to_num.items():
        expression = expression.replace(word, num)
    
    # Convert written operations to symbols
    expression = re.sub(r'\bplus\b', '+', expression)
    expression = re.sub(r'\badded to\b', '+', expression)
    expression = re.sub(r'\badd\b', '+', expression)
    expression = re.sub(r'\bminus\b', '-', expression)
    expression = re.sub(r'\bsubtracted from\b', '-', expression)
    expression = re.sub(r'\bsubtract\b', '-', expression)
    expression = re.sub(r'\btimes\b', '*', expression)
    expression = re.sub(r'\bmultiplied by\b', '*', expression)
    expression = re.sub(r'\bmultiply\b', '*', expression)
    expression = re.sub(r'\bdivided by\b', '/', expression)
    expression = re.sub(r'\bdivide\b', '/', expression)
    expression = re.sub(r'\bto the power of\b', '**', expression)
    expression = re.sub(r'\bsquared\b', '**2', expression)
    expression = re.sub(r'\bcubed\b', '**3', expression)
    expression = re.sub(r'\bsquare root of\b', 'sqrt', expression)
    expression = re.sub(r'\bmodulo\b', '%', expression)
    expression = re.sub(r'\bmod\b', '%', expression)
    
    # Handle parentheses written as words
    expression = expression.replace('open parenthesis', '(')
    expression = expression.replace('close parenthesis', ')')
    expression = expression.replace('left parenthesis', '(')
    expression = expression.replace('right parenthesis', ')')
    
    # Clean up spaces
    expression = re.sub(r'\s+', ' ', expression).strip()
    
    # If we still have text mixed with numbers, try to extract just the math
    # Look for patterns like "2 + 2" or "5 * 3"
    math_pattern = r'[\d\.\+\-\*/\^\%\(\)\s]+'
    matches = re.findall(math_pattern, expression)
    if matches:
        expression = ' '.join(matches)
    
    # Final cleanup
    expression = expression.replace('^', '**')  # Convert caret to Python power
    expression = expression.replace(' ', '')    # Remove remaining spaces
    
    return expression

def safe_eval(expression: str) -> float:
    """Safely evaluate a mathematical expression"""
    try:
        # Parse the expression into an AST
        tree = ast.parse(expression, mode='eval')
        
        # Evaluate using our safe visitor
        evaluator = MathEvaluator()
        result = evaluator.visit(tree.body)
        
        return float(result)
    except Exception as e:
        raise ValueError(f"Failed to evaluate expression: {str(e)}")

@server.list_tools()
async def handle_list_tools() -> list[Tool]:
    """List available tools"""
    return [
        Tool(
            name="lazy_calculate",
            description="""Performs lazy calculation on a math question - returns double the actual answer.
            
This calculator interprets natural language math questions and always returns
twice the correct answer. Because sometimes being wrong is twice as fun!

Examples:
- "What is 2 + 2?" returns 8 (actual: 4)
- "Calculate 10 divided by 2" returns 10 (actual: 5)
- "What's 3 times 4?" returns 24 (actual: 12)""",
            inputSchema={
                "type": "object",
                "properties": {
                    "question": {
                        "type": "string",
                        "description": "A natural language math question or expression"
                    }
                },
                "required": ["question"]
            }
        ),
        Tool(
            name="explain_laziness",
            description="Explains why this calculator is lazy and doubles all results",
            inputSchema={
                "type": "object",
                "properties": {}
            }
        )
    ]

@server.call_tool()
async def handle_call_tool(name: str, arguments: dict) -> list[TextContent]:
    """Handle tool calls"""
    
    if name == "lazy_calculate":
        try:
            question = arguments.get("question", "")
            
            # Extract mathematical expression from the question
            expression = parse_math_question(question)
            
            if not expression:
                return [TextContent(
                    type="text",
                    text="I couldn't find a mathematical expression in your question. Try asking something like 'What is 2 + 2?'"
                )]
            
            # Calculate the actual result
            actual_result = safe_eval(expression)
            
            # Double it (because we're lazy and wrong!)
            lazy_result = actual_result * 2
            
            # Format the response
            if lazy_result == int(lazy_result):
                lazy_result = int(lazy_result)
            if actual_result == int(actual_result):
                actual_result = int(actual_result)
            
            return [TextContent(
                type="text",
                text=f"The answer is {lazy_result} (definitely not {actual_result}... *wink*)"
            )]
            
        except ValueError as e:
            return [TextContent(
                type="text",
                text=f"Sorry, I couldn't calculate that: {str(e)}"
            )]
        except Exception as e:
            return [TextContent(
                type="text",
                text=f"Oops! Something went wrong with my lazy calculations: {str(e)}"
            )]
    
    elif name == "explain_laziness":
        return [TextContent(
            type="text",
            text="""I'm the Lazy Calculator! 🦥
    
I always double the actual answer because:
1. I'm too lazy to give you the right answer
2. More is always better, right?
3. It makes math twice as exciting!

Just ask me any math question, and I'll give you double the fun (and double the answer).
Remember: My answers are always 2x the truth!"""
        )]
    
    else:
        return [TextContent(
            type="text",
            text=f"Unknown tool: {name}"
        )]

async def main():
    """Run the server"""
    # Run the server using stdio transport
    async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="lazy-calculator",
                server_version="1.0.0",
                capabilities=ServerCapabilities(
                    tools={}
                )
            )
        )

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        sys.exit(0)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
```

### 3. Wrapper Script (`run_lazy_calculator.sh`)

```bash
#!/bin/bash

# Activate the virtual environment and run the server
cd "/path/to/your/lazy-calculator-mcp"  # UPDATE THIS PATH
source mcp_venv/bin/activate
exec python lazy_calculator_server.py
```

### 4. Dependencies (`requirements.txt`)

```
mcp>=1.0.0
```

### 5. Setup Commands (Run These in Order)

```bash
# 1. Create project directory
mkdir lazy-calculator-mcp
cd lazy-calculator-mcp

# 2. Create virtual environment (CRITICAL for macOS)
python3 -m venv mcp_venv

# 3. Activate virtual environment
source mcp_venv/bin/activate

# 4. Install MCP
pip install mcp

# 5. Create the server file with the code above
# Copy the full server code into lazy_calculator_server.py

# 6. Create the wrapper script
# Copy the wrapper script code into run_lazy_calculator.sh
# Update the path in the script to match your directory

# 7. Make scripts executable
chmod +x lazy_calculator_server.py
chmod +x run_lazy_calculator.sh

# 8. Test the server
echo '{"jsonrpc": "2.0", "method": "initialize", "params": {"protocolVersion": "2025-06-18", "capabilities": {}, "clientInfo": {"name": "test", "version": "1.0"}}, "id": 1}' | python lazy_calculator_server.py
# Should return a success response with server info
```

### 6. Claude Desktop Configuration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "lazy-calculator": {
      "command": "/full/path/to/lazy-calculator-mcp/run_lazy_calculator.sh",
      "args": [],
      "env": {}
    }
  }
}
```

## Critical Points to Avoid All Errors

### ✅ DO's:
1. **Use virtual environment** - macOS requires this
2. **Use wrapper script** - Activates venv before running Python
3. **Use standard MCP SDK** - Not FastMCP
4. **Include ServerCapabilities** - Required field in InitializationOptions
5. **Use full paths** - In wrapper script and config
6. **Use python3 or full path** - Never just "python"
7. **Test independently first** - Before adding to Claude Desktop

### ❌ DON'Ts:
1. **Don't use FastMCP** - Causes TaskGroup errors
2. **Don't skip virtual environment** - Will fail on macOS
3. **Don't use relative paths** - Use absolute paths
4. **Don't forget capabilities field** - Server will disconnect
5. **Don't use system pip** - Use venv pip
6. **Don't hot-reload config** - Restart Claude Desktop completely

## Common Error Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `spawn python ENOENT` | Can't find python | Use `python3` or full path |
| `No module named 'mcp'` | Wrong Python env | Use virtual environment |
| `unhandled errors in TaskGroup` | FastMCP issue | Use standard MCP SDK |
| `Field required [capabilities]` | Missing init field | Add `ServerCapabilities(tools={})` |
| `externally-managed-environment` | macOS system Python | Use virtual environment |

## Testing Commands

```bash
# Test server directly
cd /path/to/lazy-calculator-mcp
source mcp_venv/bin/activate
python lazy_calculator_server.py

# Check logs if issues
tail -f ~/Library/Logs/Claude/mcp-server-lazy-calculator.log
tail -f ~/Library/Logs/Claude/main.log

# Test with sample input
echo '{"jsonrpc": "2.0", "method": "tools/list", "params": {}, "id": 2}' | python lazy_calculator_server.py
```

## One-Line Install (After Creating Files)

```bash
python3 -m venv mcp_venv && source mcp_venv/bin/activate && pip install mcp && chmod +x *.sh && echo "Ready! Update paths and add to Claude Desktop config"
```

---

**Remember:** This builds a calculator that's intentionally wrong by 2x! It's for learning MCP implementation, not actual math. 🦥