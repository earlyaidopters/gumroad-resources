# Agent Council Prompt Guide

A comprehensive guide to setting up and invoking multi-perspective AI agent councils in Claude Code.

---

## Table of Contents

1. [Discovery: Understanding Available Agents](#1-discovery-understanding-available-agents)
2. [Foundation: Creating the Council Infrastructure](#2-foundation-creating-the-council-infrastructure)
3. [Expansion: Adding New Council Members](#3-expansion-adding-new-council-members)
4. [Invocation: Gathering Your Council](#4-invocation-gathering-your-council)
5. [Debate: Making Agents Challenge Each Other](#5-debate-making-agents-challenge-each-other)
6. [Advanced Patterns](#6-advanced-patterns)

---

## 1. Discovery: Understanding Available Agents

### Purpose
Before building a custom council, understand what agent capabilities already exist out of the box.

### Refined Prompt

```
Provide a comprehensive breakdown of all sub-agents available through the Task tool.
For each agent, include:

1. Name and primary function
2. Ideal use cases
3. Key capabilities and limitations
4. How to invoke it (parameters, thoroughness levels if applicable)

Group them by category (general purpose, development, utility, etc.) and indicate
which agents can run in parallel vs. which require sequential execution.
```

### Expected Output
A structured table or list categorizing all available agents with actionable guidance on when and how to use each one.

---

## 2. Foundation: Creating the Council Infrastructure

### Purpose
Establish the foundational files and protocols that enable multi-agent deliberation with persistent reasoning trails.

### Refined Prompt

```
I want to establish a multi-agent deliberation system with the following requirements:

1. **Trigger Protocol**: Create a trigger phrase (e.g., "agents gather") that, when
   followed by an idea or proposal, automatically launches all council agents in parallel.

2. **Shared Reasoning Log**: Create a `shared_reasoning.md` file where all agents
   document their thinking process during deliberations. This should include:
   - Session timestamp and idea under review
   - Each agent's initial reaction
   - Key considerations and analysis process
   - Critical insights discovered
   - Confidence levels with justification

3. **Scalable Architecture**: Design the system so that any new agents added to
   `.claude/agents/` automatically participate in future council gatherings without
   requiring manual updates to the protocol.

4. **Documentation**: Update CLAUDE.md to document this entire workflow so future
   sessions understand and follow the protocol.

The goal is persistent, traceable multi-perspective analysis where I can see not
just conclusions, but how each agent arrived at them.
```

### Expected Output
- A `shared_reasoning.md` file with templated structure
- Updated `CLAUDE.md` with the council gathering protocol
- Clear workflow diagram showing parallel execution and documentation flow

---

## 3. Expansion: Adding New Council Members

### Purpose
Add specialized agents that fill gaps in your council's analytical capabilities.

### Refined Prompt: Creating a Balanced Agent

```
Create a new council agent with the following specifications:

**Role**: [Neutral Analyst / Domain Expert / Technical Reviewer / etc.]

**Positioning**: This agent should complement the existing council by providing
[objective synthesis / specialized expertise / technical validation]. It should
neither skew optimistic nor pessimistic, but anchor discussions in [evidence /
feasibility / technical constraints].

**Requirements**:
1. Follow the existing agent configuration format (YAML frontmatter + Markdown)
2. Define clear analytical frameworks and output structures
3. Include guidelines for how this agent interacts with other council members
4. Specify when this agent's perspective is most valuable
5. Ensure compatibility with the "agents gather" protocol

**File Location**: `.claude/agents/[agent-name].md`

After creation, update CLAUDE.md to reflect the expanded council composition
and when to leverage this new perspective.
```

### Template: Agent Archetypes

| Archetype | Role | Balances Against |
|-----------|------|------------------|
| **Optimist-Strategist** | Best-case scenarios, success pathways | Skeptics, risk-focused agents |
| **Devil's Advocate** | Risk identification, assumption stress-testing | Optimists, visionaries |
| **Neutral Analyst** | Evidence synthesis, trade-off mapping | Both extremes |
| **Technical Validator** | Feasibility assessment, implementation reality | Business-focused agents |
| **Market Realist** | Competitive analysis, demand validation | Product visionaries |
| **Ethics Guardian** | Ethical implications, unintended consequences | Move-fast mentalities |

---

## 4. Invocation: Gathering Your Council

### Purpose
Summon all council members to deliberate on an idea, proposal, or decision.

### Refined Prompt: Standard Invocation

```
Agents gather.

**Proposal**: [Clear, specific description of the idea]

**Context**: [Relevant background, constraints, or goals]

**Key Questions I Need Answered**:
1. [Specific question for the council]
2. [Another angle you want explored]
3. [Risk or opportunity you're uncertain about]

**Decision Timeline**: [When you need to decide / urgency level]

Each agent should:
1. Document reasoning in shared_reasoning.md before returning their report
2. Provide perspective-aligned analysis (optimists → opportunities, skeptics → risks, etc.)
3. Include confidence levels for key claims
4. Highlight where they agree/disagree with likely positions of other agents
```

### Example: Full Council Invocation

```
Agents gather.

**Proposal**: Build "AI Avatar Academy" — an automated platform that:
- Monitors new AI/ML developments via scheduled jobs (Google, Anthropic, OpenAI, X trends)
- Scrapes and synthesizes information from primary sources and documentation
- Uses HeyGen API to generate avatar-based video tutorials automatically
- Provides an ever-growing library of AI-generated educational content
- Includes a knowledge-base chatbot trained on the same content

**Context**:
- Target audience: Professionals wanting to stay current on AI without hours of research
- Differentiator: Transparent AI-generated content + real-time knowledge updates
- Initial investment capacity: ~$50K for MVP

**Key Questions**:
1. Is the unit economics model viable at scale?
2. What legal risks exist around content scraping and avatar usage?
3. What defensible moat could this platform build?
4. Who are the likely competitors and what's the competitive response timeline?

**Decision Timeline**: Need to decide whether to pursue within 2 weeks.
```

---

## 5. Debate: Making Agents Challenge Each Other

### Purpose
Force agents to directly confront and critique each other's positions to surface stronger arguments and expose weak reasoning.

### Refined Prompt: Structured Debate

```
The council has delivered initial reports. Now I want direct confrontation.

**Instructions for All Agents**:

1. **Identify the strongest claims** from opposing agents
2. **Challenge specific assertions** — name the agent and the claim you're disputing
3. **Expose logical gaps** — where is the reasoning flawed or based on assumptions?
4. **Defend your position** — respond to likely criticisms of your own analysis
5. **Acknowledge valid points** — where do opposing agents have legitimate concerns?

**Debate Format**:
- Each agent should directly address at least 2-3 specific claims from other agents
- Use the format: "To [Agent Name] on '[specific claim]': [Your challenge]"
- Provide evidence or reasoning, not just disagreement
- End with a revised confidence level based on the debate

**Goal**: Surface the strongest version of each argument. I want to see where
the real disagreements lie and which positions survive scrutiny.
```

### Refined Prompt: Adversarial Deep-Dive

```
Focus the debate on [specific contested claim or decision point].

**The Contested Claim**: "[Exact claim from one agent]"

**Instructions**:
- Agents who support this claim: Provide your strongest defense with evidence
- Agents who oppose: Provide your most rigorous takedown
- Neutral agents: Evaluate the quality of arguments on both sides

**Scoring Criteria**:
- Strength of evidence cited
- Logical coherence of argument
- Acknowledgment of legitimate counter-points
- Falsifiability of claims

Conclude with a verdict on which position is better supported and what would
need to be true for the weaker position to become stronger.
```

---

## 6. Advanced Patterns

### Pattern A: Staged Deliberation

```
Let's approach this in stages:

**Stage 1 - Individual Analysis** (parallel)
Each agent analyzes independently without seeing others' work. Document in
shared_reasoning.md under separate sections.

**Stage 2 - Cross-Examination** (sequential)
Agents review each other's documented reasoning and identify:
- Points of agreement (potential consensus)
- Points of disagreement (requires debate)
- Blind spots (things no one addressed)

**Stage 3 - Synthesis**
Neutral analyst synthesizes all perspectives into:
- Areas of consensus
- Unresolved tensions
- Recommended path forward with confidence level
```

### Pattern B: Red Team / Blue Team

```
Split the council into adversarial teams:

**Blue Team (Build the Case FOR)**:
- Optimist-Strategist leads
- Goal: Construct the strongest possible argument for proceeding
- Must address known risks preemptively

**Red Team (Destroy the Case)**:
- Devil's Advocate leads
- Goal: Find every possible failure mode, legal risk, and competitive threat
- Must propose specific scenarios that would kill the venture

**Adjudicator**:
- Neutral Analyst evaluates both cases
- Declares which team made the stronger argument
- Identifies what additional information would change the verdict
```

### Pattern C: Pre-Mortem Analysis

```
Agents gather for a pre-mortem analysis.

**The Scenario**: It's 18 months from now. [The project] has failed completely.

**Each Agent's Task**:
Write a post-mortem explaining WHY it failed from your analytical perspective:
- Optimist: What success conditions didn't materialize? What did we overestimate?
- Skeptic: Which risks that you identified actually materialized? What did we ignore?
- Neutral: What trade-offs did we get wrong? What evidence did we misinterpret?

**Output**: A unified "lessons learned" document as if the failure already happened,
then evaluate: How likely is this failure scenario? What would prevent it?
```

### Pattern D: Confidence Calibration

```
Before finalizing recommendations, calibrate confidence across the council.

**For Each Major Claim or Recommendation**:

| Claim | Optimist Confidence | Skeptic Confidence | Neutral Confidence | Spread |
|-------|---------------------|--------------------|--------------------|--------|
| [Claim 1] | X% | Y% | Z% | |
| [Claim 2] | X% | Y% | Z% | |

**Analysis**:
- High spread (>30%) = Significant uncertainty, needs more investigation
- Low spread (<15%) = Likely consensus, higher confidence in conclusion
- All low confidence = Insufficient information to decide

**Action**: For high-spread items, what specific evidence would resolve the disagreement?
```

---

## Quick Reference Card

| Goal | Trigger Phrase |
|------|----------------|
| Summon full council | `"Agents gather. [Your proposal]"` |
| Force debate | `"Make them fight each other"` or `"Challenge each other's positions"` |
| Deep-dive on one claim | `"Focus the debate on [specific claim]"` |
| Add new agent | `"Create a [role] agent that [purpose]"` |
| Pre-mortem | `"Agents gather for a pre-mortem. Assume [project] failed..."` |
| Confidence check | `"Calibrate confidence levels across all agents"` |
| Synthesis only | `"Neutral analyst: synthesize the council's positions"` |

---

## Best Practices

1. **Be Specific**: Vague ideas get vague analysis. Include context, constraints, and specific questions.

2. **Request Evidence**: Ask agents to cite reasoning, not just conclusions.

3. **Embrace Conflict**: The value is in surfacing disagreement, not false consensus.

4. **Document Everything**: The shared_reasoning.md file is your audit trail. Reference it in future sessions.

5. **Iterate**: First-round analysis often surfaces questions that warrant a second round.

6. **Know When to Stop**: If agents converge on "need more data," go get the data rather than debating further.

---

*Guide Version 1.0 | Created for Claude Code Agent Councils*
