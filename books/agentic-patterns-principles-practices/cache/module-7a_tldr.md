# Constrained Tool Use (Mask, Don't Remove)

In a workshop, you might have a full toolbox but only need a few tools for a specific job. Constrained Tool Use applies this principle by limiting tool availability through programmatic constraints while keeping the full toolset defined. This mechanism manages tool availability using constraints like logit masking, preventing selection without modifying tool definitions.

This pattern is used when the set of available tools must remain stable, but the agent's capability to use a tool changes based on the current state. Dynamically altering tool definitions mid-run breaks the KV-Cache and confuses the model. Maintaining stable tool definitions is critical for performance and cost efficiency. The Constrained Tool Use pattern preserves KV-Cache efficiency and ensures reliable tool invocation by programmatically constraining which tools can be selected at any moment.

Key concepts include logit masking, KV-Cache stability, response prefilling, context engineering, fixed tool definitions, and state-aware constraints. This pattern is essential for managing complex action spaces while maintaining performance and reliability.

**Main Concepts, Keywords, and Key Takeaways:**
- Constrained Tool Use
- Logit Masking
- KV-Cache Stability
- Response Prefilling
- Context Engineering
- Fixed Tool Definitions
- State-Aware Constraints
- Tool Availability
- Performance Optimization