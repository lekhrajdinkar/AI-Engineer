#!/usr/bin/env python3
"""
Task 3: Few-Shot Prompting - Learning from Multiple Examples
Provide multiple examples to teach the AI your specific pattern and style.

Learning Goal: Master few-shot prompting for consistent, high-quality responses.
"""

import os
from langchain_openai import ChatOpenAI
from langchain_core.prompts import FewShotPromptTemplate, PromptTemplate

def main():
    print("🎯 Task 3: Few-Shot Prompting")
    print("=" * 50)

    # Initialize LLM
    llm = ChatOpenAI(
        model="openai/gpt-4.1-mini",
        api_key=os.getenv("OPENAI_API_KEY"),
        base_url=os.getenv("OPENAI_API_BASE"),
        temperature=0.7
    )

    print("\n📝 Creating Few-Shot Examples")
    print("-" * 40)

    # TODO 1: Create example input-output pairs for customer support
    examples = [
        {
            "input": "refund request",
            "output": "I understand you'd like a refund. Let me check your order details. Our refund policy allows returns within 30 days. I'll process this for you right away."
        },
        {
            "input": "shipping delay",
            "output": "I apologize for the shipping delay. Let me track your package immediately. I see it's currently in transit and should arrive within 2 days. I'll apply a shipping credit to your account."
        },
        {
            "input": "password reset",
            "output": "I'll help you reset your password. For security, I've sent a reset link to your registered email. The link expires in 1 hour. Please check your spam folder if you don't see it."
        }
    ]

    print("📚 Examples loaded:")
    for i, ex in enumerate(examples, 1):
        print(f"  Example {i}: {ex['input']} → {ex['output'][:50]}...")

    # TODO 2: Create the example template
    example_prompt = PromptTemplate(
        template="Customer Issue: {input}\nSupport Response: {output}",
        input_variables=["input", "output"]  # Replace ___ with: "", "output"
    )

    # TODO 3: Create the few-shot prompt template
    few_shot_prompt = FewShotPromptTemplate(
        examples=examples,
        example_prompt=example_prompt,
        prefix="You are a helpful customer support agent. Here are examples of how to respond:",
        suffix="Customer Issue: {input}\nSupport Response:",
        input_variables=["input"]
    )

    print("\n🔄 Testing Few-Shot Prompting")
    print("-" * 40)

    # TODO 4: Test with a new customer issue
    test_input = "account locked"  # Replace ___ with: "account locked"

    # Format the few-shot prompt
    formatted_prompt = few_shot_prompt.format(input=test_input)

    print(f"📤 New customer issue: {test_input}")
    print("Using few-shot learning from 3 examples...")

    # Get AI response
    response = llm.invoke(formatted_prompt)
    print(f"\n📥 AI Response: {response.content}")

    # Analyze response quality
    print("\n📊 Response Analysis:")
    response_text = response.content.lower()

    # Check if response follows the pattern from examples
    has_empathy = any(word in response_text for word in ["understand", "apologize", "help"])
    has_action = any(word in response_text for word in ["check", "process", "send", "reset"])
    has_timeline = any(word in response_text for word in ["immediately", "hour", "days", "now"])

    quality_score = sum([has_empathy, has_action, has_timeline])

    print(f"  ✓ Shows empathy: {has_empathy}")
    print(f"  ✓ Takes action: {has_action}")
    print(f"  ✓ Provides timeline: {has_timeline}")
    print(f"  Quality Score: {quality_score}/3")

    # Key takeaways
    print("\n💡 Few-Shot Advantages:")
    print("  ✓ Learns your specific tone and style")
    print("  ✓ Maintains consistency across responses")
    print("  ✓ Perfect for customer service")
    print("  ✓ Reduces training time")

    # Create marker for completion
    os.makedirs("/root/markers", exist_ok=True)
    with open("/root/markers/task3_complete.txt", "w") as f:
        f.write("COMPLETED")

    print("\n✅ Task 3 completed! Few-shot prompting mastered!")

if __name__ == "__main__":
    main()



"""
    
    🎯 Task 3: Few-Shot Prompting
==================================================

📝 Creating Few-Shot Examples
----------------------------------------
📚 Examples loaded:
  Example 1: refund request → I understand you'd like a refund. Let me check you...
  Example 2: shipping delay → I apologize for the shipping delay. Let me track y...
  Example 3: password reset → I'll help you reset your password. For security, I...

🔄 Testing Few-Shot Prompting
----------------------------------------
📤 New customer issue: account locked
Using few-shot learning from 3 examples...

📥 AI Response: I see your account is locked. For your security, 
I'll verify your identity before unlocking it. 
Please provide the email or phone number associated with your account, 
and I'll assist you with the next steps.

📊 Response Analysis:
  ✓ Shows empathy: False
  ✓ Takes action: False
  ✓ Provides timeline: False
  Quality Score: 0/3

💡 Few-Shot Advantages:
  ✓ Learns your specific tone and style
  ✓ Maintains consistency across responses
  ✓ Perfect for customer service
  ✓ Reduces training time

✅ Task 3 completed! Few-shot prompting mastered!
"""