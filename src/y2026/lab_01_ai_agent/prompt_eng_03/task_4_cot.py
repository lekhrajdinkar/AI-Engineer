#!/usr/bin/env python3
"""
Task 4: Chain-of-Thought Prompting - Step-by-Step Reasoning
Guide the AI through a logical thinking process to solve complex problems.

Learning Goal: Master chain-of-thought prompting for complex reasoning tasks.
"""

import os
from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate

def main():
    print("🎯 Task 4: Chain-of-Thought Prompting")
    print("=" * 50)

    # Initialize LLM
    llm = ChatOpenAI(
        model="openai/gpt-4.1-mini",
        api_key=os.getenv("OPENAI_API_KEY"),
        base_url=os.getenv("OPENAI_API_BASE"),
        temperature=0.7
    )

    print("\n📝 Part 1: Direct Approach (Without Chain-of-Thought)")
    print("-" * 40)

    # Direct prompt without reasoning steps
    direct_prompt = "Fix our data retention policy to comply with GDPR."

    print(f"❌ Direct prompt: {direct_prompt}")
    direct_response = llm.invoke(direct_prompt)
    print(f"\nDirect response preview: {direct_response.content[:200]}...")
    print("Problem: Lacks structure and may miss important details!")

    print("\n📝 Part 2: Chain-of-Thought Approach")
    print("-" * 40)

    # TODO 1: Create reasoning steps for the AI to follow
    reasoning_steps = """
    Step 1: Review current GDPR requirements for data retention\n
    Step 2: Identify gaps in our existing policy\n
    Step 3: Research industry best practices\n
    Step 4: Draft specific recommendations\n
    Step 5: Create implementation timeline 
    """

    print("🧠 Reasoning steps defined:")
    print(reasoning_steps)

    # TODO 2: Build chain-of-thought prompt template
    cot_template = PromptTemplate(
        template="""To solve this problem, think through it step-by-step:

{steps}

Problem: {problem}

Now, let's work through each step systematically:""",
        input_variables=["steps", "steps"]
    )

    # TODO 3: Apply chain-of-thought to the problem
    cot_prompt = cot_template.format(
        steps=reasoning_steps,
        problem="Fix our data retention policy to comply with GDPR"
    )

    print("\n🔄 Applying Chain-of-Thought Reasoning")
    print("-" * 40)

    # Get AI response with chain-of-thought
    cot_response = llm.invoke(cot_prompt)
    print(f"\n📥 Chain-of-Thought Response:\n{cot_response.content[:500]}...")

    # Analyze the improvement
    print("\n📊 Comparison Analysis:")
    print(f"Direct response length: {len(direct_response.content)} characters")
    print(f"CoT response length: {len(cot_response.content)} characters")

    # Check for structured thinking
    has_steps = any(f"Step {i}" in cot_response.content for i in range(1, 6))
    has_analysis = "requirement" in cot_response.content.lower()
    has_recommendations = "recommend" in cot_response.content.lower()

    print(f"\n✅ Chain-of-Thought Benefits:")
    print(f"  ✓ Structured approach: {has_steps}")
    print(f"  ✓ Thorough analysis: {has_analysis}")
    print(f"  ✓ Clear recommendations: {has_recommendations}")

    # Key takeaways
    print("\n💡 Chain-of-Thought Best Practices:")
    print("  ✓ Break complex problems into steps")
    print("  ✓ Guide the AI's thinking process")
    print("  ✓ Ensure comprehensive analysis")
    print("  ✓ Get detailed, reasoned responses")

    # Create marker for completion
    os.makedirs("/root/markers", exist_ok=True)
    with open("/root/markers/task4_complete.txt", "w") as f:
        f.write("COMPLETED")

    print("\n✅ Task 4 completed! Chain-of-thought prompting mastered!")

if __name__ == "__main__":
    main()

"""
🎯 Task 4: Chain-of-Thought Prompting
==================================================

📝 Part 1: Direct Approach (Without Chain-of-Thought)
----------------------------------------
❌ Direct prompt: Fix our data retention policy to comply with GDPR.

Direct response preview: Absolutely, I can help with that! Please provide the current version of your data retention policy, and I will review it and suggest changes to ensure it complies with the GDPR requirements....
Problem: Lacks structure and may miss important details!

📝 Part 2: Chain-of-Thought Approach
----------------------------------------
🧠 Reasoning steps defined:

    Step 1: Review current GDPR requirements for data retention

    Step 2: Identify gaps in our existing policy

    Step 3: Research industry best practices

    Step 4: Draft specific recommendations

    Step 5: Create implementation timeline 
    

🔄 Applying Chain-of-Thought Reasoning
----------------------------------------

📥 Chain-of-Thought Response:
Great! Let's work through each step systematically to fix your data retention policy and ensure GDPR compliance.

---

### Step 1: Review current GDPR requirements for data retention

**Key GDPR principles related to data retention:**

- **Purpose limitation:** Personal data must be collected for specified, explicit, and legitimate purposes and not further processed in a manner incompatible with those purposes (Article 5(1)(b)).
- **Storage limitation:** Personal data must be kept in a form tha...

📊 Comparison Analysis:
Direct response length: 190 characters
CoT response length: 3760 characters

✅ Chain-of-Thought Benefits:
  ✓ Structured approach: True
  ✓ Thorough analysis: True
  ✓ Clear recommendations: True

💡 Chain-of-Thought Best Practices:
  ✓ Break complex problems into steps
  ✓ Guide the AI's thinking process
  ✓ Ensure comprehensive analysis
  ✓ Get detailed, reasoned responses

✅ Task 4 completed! Chain-of-thought prompting mastered!

"""