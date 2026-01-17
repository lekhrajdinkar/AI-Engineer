#!/usr/bin/env python3
"""
Task 1: Zero-Shot Prompting - Direct Instructions Without Examples
Learn how to write clear, specific prompts that work without providing examples.

Learning Goal: Master zero-shot prompting for immediate AI responses.
"""

import os
from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate

def main():
    print("🎯 Task 1: Zero-Shot Prompting")
    print("=" * 50)

    print("\n📝 Part 1: The Problem with Vague Prompts")
    print("-" * 40)

    # Initialize LLM
    llm = ChatOpenAI(
        model="openai/gpt-4.1-mini",
        api_key=os.getenv("OPENAI_API_KEY"),
        base_url=os.getenv("OPENAI_API_BASE"),
        temperature=0.7
    )

    # TODO 1: Create a vague zero-shot prompt (see the problem!)
    vague_prompt = "write a policy"  # Replace ___ with: "write a policy"

    print(f"❌ Vague prompt: {vague_prompt}")

    # Get response from vague prompt
    vague_response = llm.invoke(vague_prompt)
    print(f"\nVague response preview: {vague_response.content[:100]}...")
    print("Problem: Too generic, not useful for our company!")

    print("\n📝 Part 2: Specific Zero-Shot Prompting")
    print("-" * 40)

    # TODO 2: Create a specific zero-shot prompt (see the improvement!)
    specific_prompt = "Write a 200-word data privacy policy for European customers covering GDPR requirements, data retention periods of 30 days, and user rights to deletion and portability"  # Replace ___ with: ""

    print(f"✅ Specific prompt: {specific_prompt[:50]}...")

    # Get response from specific prompt
    specific_response = llm.invoke(specific_prompt)
    print(f"\nSpecific response preview: {specific_response.content[:200]}...")
    print("Success: Clear, actionable, company-specific!")

    # Show the difference
    print("\n📊 Comparison Results:")
    print(f"Vague response length: {len(vague_response.content)} characters")
    print(f"Specific response length: {len(specific_response.content)} characters")
    print(f"Improvement: {(len(specific_response.content) / len(vague_response.content) - 1) * 100:.0f}% more focused!")

    # Key takeaways
    print("\n💡 Zero-Shot Best Practices:")
    print("  ✓ Be specific about the task")
    print("  ✓ Include constraints (word count, format)")
    print("  ✓ Define the context (European, GDPR)")
    print("  ✓ Specify requirements (retention, rights)")

    # Create marker for completion
    os.makedirs("/root/markers", exist_ok=True)
    with open("/root/markers/task1_complete.txt", "w") as f:
        f.write("COMPLETED")

    print("\n✅ Task 1 completed! Zero-shot prompting mastered!")

if __name__ == "__main__":
    main()

"""
🎯 Task 1: Zero-Shot Prompting
==================================================

📝 Part 1: The Problem with Vague Prompts
----------------------------------------
❌ Vague prompt: write a policy

Vague response preview: Certainly! Could you please provide more details about the type of policy you need? For example, is ...
Problem: Too generic, not useful for our company!

📝 Part 2: Specific Zero-Shot Prompting
----------------------------------------
✅ Specific prompt: Write a 200-word data privacy policy for European ...

Specific response preview: **Data Privacy Policy**

We are committed to protecting the privacy and personal data of our European customers in compliance with the General Data Protection Regulation (GDPR). This policy explains h...
Success: Clear, actionable, company-specific!

📊 Comparison Results:
Vague response length: 256 characters
Specific response length: 1351 characters
Improvement: 428% more focused!

💡 Zero-Shot Best Practices:
  ✓ Be specific about the task
  ✓ Include constraints (word count, format)
  ✓ Define the context (European, GDPR)
  ✓ Specify requirements (retention, rights)

✅ Task 1 completed! Zero-shot prompting mastered!
"""