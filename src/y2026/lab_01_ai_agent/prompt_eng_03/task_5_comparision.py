#!/usr/bin/env python3
"""
Task 5: Technique Comparison - Test All 4 Prompting Methods
Compare all prompting techniques on the same problem to see the differences.

Learning Goal: Understand when to use each prompting technique.
"""

import os
from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate, FewShotPromptTemplate

def main():
    print("🎯 Task 5: Prompting Technique Comparison")
    print("=" * 50)

    # Initialize LLM
    llm = ChatOpenAI(
        model="openai/gpt-4.1-mini",
        api_key=os.getenv("OPENAI_API_KEY"),
        base_url=os.getenv("OPENAI_API_BASE"),
        temperature=0.7
    )

    # TODO 1: Set the test problem for all techniques
    test_problem = "Create an employee remote work policy"

    print(f"🎯 Test Problem: {test_problem}")
    print("Testing all 4 prompting techniques...\n")

    results = {}

    # 1. ZERO-SHOT PROMPTING
    print("1️⃣ Zero-Shot Prompting")
    print("-" * 40)

    # TODO 2: Apply zero-shot (just the problem, no examples)
    zero_shot_result = llm.invoke(test_problem)

    results["zero_shot"] = zero_shot_result.content
    print(f"Response length: {len(zero_shot_result.content)} characters")
    print(f"Preview: {zero_shot_result.content[:100]}...\n")

    # 2. ONE-SHOT PROMPTING
    print("2️⃣ One-Shot Prompting")
    print("-" * 40)

    one_shot_template = PromptTemplate(
        template="""Example Policy:
VACATION POLICY
1. Eligibility: All full-time employees
2. Accrual: 15 days per year
3. Request: Submit 2 weeks in advance
4. Approval: Manager discretion

Now create: {policy_type}""",
        input_variables=["policy_type"]
    )

    # TODO 3: Apply one-shot with the example
    one_shot_prompt = one_shot_template.format(
        policy_type= test_problem
    )
    one_shot_result = llm.invoke(one_shot_prompt)

    results["one_shot"] = one_shot_result.content
    print(f"Response length: {len(one_shot_result.content)} characters")
    print(f"Preview: {one_shot_result.content[:100]}...\n")

    # 3. FEW-SHOT PROMPTING
    print("3️⃣ Few-Shot Prompting")
    print("-" * 40)

    examples = [
        {"policy": "sick leave", "format": "1. Coverage: 10 days/year\n2. Documentation: Doctor's note after 3 days"},
        {"policy": "training", "format": "1. Budget: $2000/employee/year\n2. Approval: Required for external courses"},
    ]

    few_shot_template = """Examples of our policy format:
{examples}

Now create: {policy_type}"""

    # TODO 4: Apply few-shot with multiple examples
    examples_text = "\n".join([f"- {ex['policy']}: {ex['format']}" for ex in examples])
    few_shot_prompt = few_shot_template.format(
        examples=examples_text,
        policy_type=test_problem
    )
    few_shot_result = llm.invoke(few_shot_prompt)

    results["few_shot"] = few_shot_result.content
    print(f"Response length: {len(few_shot_result.content)} characters")
    print(f"Preview: {few_shot_result.content[:100]}...\n")

    # 4. CHAIN-OF-THOUGHT PROMPTING
    print("4️⃣ Chain-of-Thought Prompting")
    print("-" * 40)

    cot_template = PromptTemplate(
        template="""Think through this step-by-step:
1. Consider who needs remote work
2. Define eligibility criteria
3. Set communication requirements
4. Establish work hours and availability
5. Specify equipment and security needs

Problem: {problem}

Work through each step to create the policy:""",
        input_variables=["problem"]
    )

    # TODO 5: Apply chain-of-thought reasoning
    cot_prompt = cot_template.format(
        problem=test_problem
    )
    cot_result = llm.invoke(cot_prompt)

    results["chain_of_thought"] = cot_result.content
    print(f"Response length: {len(cot_result.content)} characters")
    print(f"Preview: {cot_result.content[:100]}...\n")

    # COMPARISON ANALYSIS
    print("📊 Technique Comparison Results")
    print("=" * 50)

    for technique, response in results.items():
        print(f"\n{technique.upper()}:")
        print(f"  Length: {len(response)} characters")
        print(f"  Has structure: {'numbered' in response.lower() or '1.' in response}")
        print(f"  Specificity: {'employee' in response.lower() and 'remote' in response.lower()}")

    # Find the best technique
    lengths = {k: len(v) for k, v in results.items()}
    most_detailed = max(lengths, key=lengths.get)

    print(f"\n🏆 Most Detailed: {most_detailed} ({lengths[most_detailed]} characters)")

    # Key insights
    print("\n💡 When to Use Each Technique:")
    print("  ✓ Zero-Shot: Quick, general responses")
    print("  ✓ One-Shot: When you need specific formatting")
    print("  ✓ Few-Shot: For consistent style across multiple outputs")
    print("  ✓ Chain-of-Thought: For complex, multi-step problems")

    # Create marker for completion
    os.makedirs("/root/markers", exist_ok=True)
    with open("/root/markers/task5_complete.txt", "w") as f:
        f.write("COMPLETED")

    print("\n✅ Task 5 completed! You've mastered all prompting techniques!")
    print("🎉 Congratulations on completing the Prompt Engineering lab!")

if __name__ == "__main__":
    main()

"""

🎯 Task 5: Prompting Technique Comparison
==================================================
🎯 Test Problem: Create an employee remote work policy
Testing all 4 prompting techniques...

1️⃣ Zero-Shot Prompting
----------------------------------------
Response length: 3698 characters
Preview: Certainly! Here's a comprehensive example of an **Employee Remote Work Policy** that you can customi...

2️⃣ One-Shot Prompting
----------------------------------------
Response length: 766 characters
Preview: REMOTE WORK POLICY

1. Eligibility: All full-time employees whose job responsibilities can be effect...

3️⃣ Few-Shot Prompting
----------------------------------------
Response length: 441 characters
Preview: - remote work:  
1. Eligibility: Available to full-time employees after 3 months of employment  
2. ...

4️⃣ Chain-of-Thought Prompting
----------------------------------------
Response length: 3827 characters
Preview: Certainly! Let’s work through each step to create a comprehensive employee remote work policy:

---
...

📊 Technique Comparison Results
==================================================

ZERO_SHOT:
  Length: 3698 characters
  Has structure: True
  Specificity: True

ONE_SHOT:
  Length: 766 characters
  Has structure: True
  Specificity: True

FEW_SHOT:
  Length: 441 characters
  Has structure: True
  Specificity: True

CHAIN_OF_THOUGHT:
  Length: 3827 characters
  Has structure: True
  Specificity: True

🏆 Most Detailed: chain_of_thought (3827 characters)

💡 When to Use Each Technique:
  ✓ Zero-Shot: Quick, general responses
  ✓ One-Shot: When you need specific formatting
  ✓ Few-Shot: For consistent style across multiple outputs
  ✓ Chain-of-Thought: For complex, multi-step problems

✅ Task 5 completed! You've mastered all prompting techniques!
🎉 Congratulations on completing the Prompt Engineering lab!

"""