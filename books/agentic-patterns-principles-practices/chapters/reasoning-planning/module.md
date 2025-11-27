
# Reasoning & Planning (The Brain)

## **The Core Loop: Thinking Before Acting**

The defining feature of an Agentic system is its ability to *reason* and *plan*—to simulate the process of problem-solving internally before committing to an external action. This moves beyond simple content generation to goal-directed decision-making. The quality of this reasoning is paramount, as a flawed thought leads to a failed action, resulting in costly, time-consuming loops.

In the simplest form, effective reasoning is achieved by engineering the agent’s system prompt to enforce a structured output format, such as the widely adopted **ReAct** pattern.

### **Pattern: Chain-of-Thought (CoT)**

Before an agent can act, it must think. The simplest and most powerful reasoning pattern is the Chain-of-Thought (CoT). CoT is a prompting technique that explicitly instructs the model to generate a series of intermediate steps leading to the final answer. It essentially forces the model to document its internal monologue.

* **Mechanism:** Append an instruction like "Think step-by-step" or "Before performing any action, always generate a 'Thought:' block explaining your reasoning." This instruction is placed in the system prompt to guide every output.  
* **Benefits:**  
  * **Improves Accuracy:** By forcing the model to allocate tokens to reasoning, it significantly reduces factual errors and hallucinations, particularly in mathematical or logical tasks.  
  * **Enables Transparency:** This directly addresses the **Prioritize Transparency** principle, providing a crucial debugging log for the engineer and building trust with the user.  
  * **Foundation for Action:** The output of the CoT block becomes the input for the next step, serving as a mandate for the subsequent tool call.

#### **Variations of CoT**

CoT is a flexible concept with several variations used to enhance robustness:

* **Zero-Shot CoT:** The simplest form, where only the instruction "Let's think step by step" is added, relying purely on the model's in-context learning.  
* **Self-Consistency CoT (SCC):** The agent generates several different, independent Chain-of-Thoughts for the same problem. It then uses a voting mechanism to select the final answer that appears most frequently, significantly improving accuracy but increasing computational cost.  
* **Tree-of-Thoughts (ToT):** (See below) This can be considered a highly structured, branch-and-prune version of CoT where multiple chains are evaluated strategically.

It is important to remember that CoT increases the overall context length with every step, creating a direct trade-off with the **Cost & Latency** challenge of the context window.

## **Pattern: ReAct (Reason \+ Act)**

ReAct is the foundational pattern for decision-making in autonomous agents. It explicitly intertwines the model's internal **Thought** process with its external **Action** and subsequent **Observation**. This forms the basic, self-correcting agentic loop:

1. **Thought:** The agent reasons about the current state, its long-term plan (Recitation Pattern), and the available tools. *Example: "I need the current stock price of Google. I should use the get\_stock\_price tool, passing the correct symbol."*  
2. **Action:** The agent generates the structured code or JSON necessary to call a tool based on the Thought. *Example: get\_stock\_price(symbol='GOOG')*  
3. **Observation:** The system executes the tool and returns the result (or an error) to the agent. *Example: Observation: 175.45*  
4. **Loop:** The agent returns to the Thought step, incorporating the new Observation into its context to plan the next move (e.g., summarizing the result or moving on to the next item on the plan).

### **ReAct Prompt Structure and Adaptive Control**

The ReAct pattern is non-negotiable for building adaptive agents because it allows for immediate, intelligent error correction. This is governed by a strict system prompt template:

* **Tool Definitions:** The prompt clearly lists all available tools and their precise function signatures (the ACI principle).  
* **The State Template:** The prompt provides a template the model *must* follow for every turn:  
  Thought: \[Your reasoning here.\]  
  Action: \[Tool call or FINAL ANSWER here.\]

* **Error Handling:** If the tool execution in Step 3 returns an Observation that contains an error message (e.g., Error: Invalid stock symbol), the agent’s subsequent **Thought** must analyze that error and propose a remedy (e.g., *“The symbol was invalid. I will now use the search tool to find the correct symbol for Google before retrying.”*). This level of adaptive control is what differentiates an agent from a pipeline.

### **Pattern: Tree-of-Thoughts (ToT)**

For problems requiring deeper strategic foresight and where the initial path is highly ambiguous, simple linear planning (ReAct) is insufficient. **Tree-of-Thoughts (ToT)** expands the planning process into a tree structure, allowing the agent to explore multiple potential future paths before committing to the best one.

* **Mechanism:** At a key decision point, the agent generates several distinct **Thought** branches (e.g., three different approaches to debugging a complex bug: "Check deployment logs," "Review recent Git commits," "Run local replication script").  
* **Evaluation and Heuristics:** The agent uses an internal or external scoring mechanism, known as a **heuristic function**, to evaluate the quality of these partial plans. This heuristic might be another LLM call that judges the plan's *likelihood of success* or its *cost-effectiveness*. For example, a "Review commits" branch might be scored low if no commits occurred recently.  
* **Pruning:** The agent prunes (discards) the lower-scoring branches, only committing to the optimal, highest-scoring path. This prevents the agent from wasting tokens and time pursuing dead ends.

ToT is computationally expensive, often multiplying the cost of a single CoT step by the number of branches explored. Therefore, it is essential for high-stakes, open-ended tasks like complex code generation, competitive game playing, or detailed strategic planning, where the cost of failure outweighs the token cost.

## **Orchestrating the Brain: State Management**

The reasoning process relies entirely on the **AgentState** object (introduced in Chapter 2). This object is the canonical source of truth for the agent's current situation and how it interacts with the physical world (Memory and Tools).

| State Component | Role in Reasoning | Pattern Relation |
| :---- | :---- | :---- |
| messages (Context) | Provides immediate history and tool inputs/outputs. | ReAct, CoT |
| todo\_list | The macro-goal, preventing goal drift by injecting the plan. | Recitation Pattern |
| scratchpad\_file | Pointer to external information for grounding the reasoning. | Filesystem as Memory |

### **The Reasoning Life Cycle in Practice**

Effective reasoning requires a disciplined approach to reading from and writing to this state object within the ReAct loop:

1. **Input:** The agent first reads the latest user message and the current **todo\_list** (Recitation) to establish context and goal.  
2. **Thought Generation:** The LLM generates the **Thought**, utilizing recent **messages** (the Observations from the previous step) and the **todo\_list** to decide the next best **Action**.  
3. **Action Execution:** If the agent decides to read a file, the system executes the tool. If the file is large, the raw data is written to **scratchpad\_file**.  
4. **Observation Return:** The system generates a clean Observation (e.g., "File contents: \[first 50 tokens\]... full file available in scratchpad").  
5. **State Update:** This new Observation is appended to the **messages** list, providing the agent with fresh, up-to-date context for its next Thought.

This disciplined life cycle ensures the agent always has the most critical information—its goal, its recent results, and its available tools—at the forefront of its consciousness, driving continuous and adaptive progress.
