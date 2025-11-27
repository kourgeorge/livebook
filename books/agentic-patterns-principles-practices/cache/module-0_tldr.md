# Constrained Tool Use (Mask, Don't Remove)

In a workshop, you might have a full toolbox but only need a few tools for a specific job. Constrained Tool Use applies this principle by limiting tool availability through programmatic constraints while keeping the full toolset defined. This mechanism manages tool availability using constraints like logit masking to prevent selection without modifying tool definitions.

This pattern is used when the set of available tools must remain stable, but the agent's capability to use a tool changes based on the current state. It is critical to maintain stable tool definitions to preserve KV-Cache efficiency and prevent model confusion. Dynamically altering tool definitions mid-run can lead to significant cost increases and confusion, as previous actions may refer to tools that are no longer defined.

Key concepts include logit masking, KV-Cache stability, response prefilling, and context engineering. The pattern is essential for managing complex action spaces while ensuring performance and reliability. It is best to keep the tool set fixed during a problem-solving episode and use masking rather than physically altering tool definitions.

**Main Concepts, Keywords, and Key Takeaways:**
- Constrained Tool Use
- Logit Masking
- KV-Cache Stability
- Response Prefilling
- Context Engineering
- Fixed Tool Definitions
- State-Aware Constraints
- Tool Availability Management