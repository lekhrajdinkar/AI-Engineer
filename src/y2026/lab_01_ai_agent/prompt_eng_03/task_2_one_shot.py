#!/usr/bin/env python3
"""
Task 2: One-Shot Prompting - Learning from a Single Example
Provide one example for the AI to follow, ensuring consistent format and style.

Learning Goal: Master one-shot prompting for format consistency.
"""

import os
from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate

def main():
    print("🎯 Task 2: One-Shot Prompting")
    print("=" * 50)

    # Initialize LLM
    llm = ChatOpenAI(
        model="openai/gpt-4.1-mini",
        api_key=os.getenv("OPENAI_API_KEY"),
        base_url=os.getenv("OPENAI_API_BASE"),
        temperature=0.7
    )

    print("\n📝 Creating One-Shot Template with Example")
    print("-" * 40)

    # TODO 1: Provide an example policy format
    example_policy = """REFUND POLICY\n1. Eligibility: Within 30 days of purchase\n2. Conditions: Product unused and in original packaging\n3. Process: Submit request via support@company.com\n4. Timeline: Refund processed within 5-7 business days\n5. Exceptions: Digital products and custom orders non-refundable"""

    print("📋 Example provided:")
    print(example_policy)

    # TODO 2: Create the one-shot prompt template
    one_shot_template = PromptTemplate(
        template="""Here's an example of our policy format:

{example}

Now write a {policy_type} policy following this EXACT format with numbered sections:""",
        input_variables=["example", "policy_type"]
    )

    print("\n🔄 Testing One-Shot Prompting")
    print("-" * 40)

    # TODO 3: Apply the template to create a new policy
    # Format the prompt with our example and new policy type
    formatted_prompt = one_shot_template.format(
        example=example_policy,
        policy_type="remote work"
    )

    print(f"📤 Sending one-shot prompt for: remote work policy")

    # Get AI response
    response = llm.invoke(formatted_prompt)
    print(f"\n📥 Generated Policy:\n{response.content}")

    # Verify format consistency
    print("\n✅ Format Verification:")
    has_numbered_sections = any(f"{i}." in response.content for i in range(1, 6))
    has_consistent_structure = all(
        keyword in response.content.lower()
        for keyword in ["eligibility", "conditions", "process", "timeline"]
    )

    if has_numbered_sections and has_consistent_structure:
        print("  ✓ Follows the exact format of our example!")
        print("  ✓ Numbered sections maintained")
        print("  ✓ Consistent structure achieved")
    else:
        print("  ⚠️ Format needs adjustment - check your example!")

    # Key takeaways
    print("\n💡 One-Shot Benefits:")
    print("  ✓ Ensures format consistency")
    print("  ✓ Teaches style through example")
    print("  ✓ Perfect for policy documents")
    print("  ✓ Maintains company standards")

    # Create marker for completion
    os.makedirs("/root/markers", exist_ok=True)
    with open("/root/markers/task2_complete.txt", "w") as f:
        f.write("COMPLETED")

    print("\n✅ Task 2 completed! One-shot prompting mastered!")

if __name__ == "__main__":
    main()