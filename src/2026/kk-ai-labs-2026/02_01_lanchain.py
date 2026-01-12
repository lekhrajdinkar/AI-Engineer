#!/usr/bin/env python3
import os
import json
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser, JsonOutputParser
from langchain_core.output_parsers import CommaSeparatedListOutputParser
from langchain_core.prompts import PromptTemplate

def task_1_langchain_approach():
    """LangChain - clean and simple"""
    print("\n🟢 TASk-1 LANGCHAIN APPROACH")
    from langchain_openai import ChatOpenAI
    llm = ChatOpenAI(
        model="openai/gpt-4.1-mini",
        api_key=os.getenv("OPENAI_API_KEY"),
        base_url=os.getenv("OPENAI_API_BASE")
    )
    response = llm.invoke("Explain machine learning in one sentence")  # Replace ___ with: "Explain machine learning in one sentence"
    if response:
        print(f"Response: {response.content[:100]}...")
        return response.content
    return None


def task_2_multi_model():
    print("🎯 Task 2: Multi-Model Support with LangChain")
    print("=" * 50)

    print("\n🌐 Initialize Multiple AI Providers")
    print("=" * 50)

    print("Setting up OpenAI GPT-4.1-mini...")
    openai_llm = ChatOpenAI(
        model="openai/gpt-4.1-mini",
        api_key=os.getenv("OPENAI_API_KEY"),
        base_url=os.getenv("OPENAI_API_BASE") ,
        temperature=0.7
    )

    print("Setting up Google Gemini...")
    google_llm = ChatOpenAI(
        model="google/gemini-2.5-flash",                    # Replace ___ with: ""
        api_key=os.getenv("OPENAI_API_KEY"),      # Replace ___ with: "OPENAI_API_KEY"
        base_url=os.getenv("OPENAI_API_BASE")      # Replace ___ with: "OPENAI_API_BASE"
    )

    print("Setting up X.AI Grok...")
    xai_llm = ChatOpenAI(
        model="x-ai/grok-code-fast-1",                    # Replace ___ with: "x-ai/grok-code-fast-1"
        api_key=os.getenv("OPENAI_API_KEY"),      # Replace ___ with: "OPENAI_API_KEY"
        base_url=os.getenv("OPENAI_API_BASE")      # Replace ___ with: "OPENAI_API_BASE"
    )

    # Compare all models with the same prompt
    print("\n✅ All models initialized! Now let's compare them...")
    print("\nModel Comparison - Same Prompt, Different Models")
    print("=" * 50)

    template = PromptTemplate(
        input_variables=["topic", "style"],
        template="Explain {topic} in {style}"
    )

    test_prompt = template.format(
        topic="artificial intelligence",
        style="exactly 5 words"
    )

    print(f"📝 Prompt: '{test_prompt}'\n")

    # Test all models with the same prompt
    if openai_llm:
        response = openai_llm.invoke(test_prompt)
        print(f"OpenAI: {response.content[:100]}...")

    if google_llm:
        response = google_llm.invoke(test_prompt)
        print(f"Google: {response.content[:100]}...")

    if xai_llm:
        response = xai_llm.invoke(test_prompt)
        print(f"X.AI: {response.content[:100]}...")

    print("\n💡 Same code, different providers - perfect for A/B testing!")


def task_4_output_parser():
    print("🎯 Task 4: Output Parsers - Text to Data")
    print("=" * 50)

    # Initialize LLM once for all examples
    llm = ChatOpenAI(
        model="openai/gpt-4.1-mini",
        api_key=os.getenv("OPENAI_API_KEY"),
        base_url=os.getenv("OPENAI_API_BASE"),
        temperature=0
    )

    # Example 1: List Parser - Simple structured data
    print("\n📋 List Output Parser")
    print("=" * 50)

    list_parser = CommaSeparatedListOutputParser()

    # Create prompt for list output
    list_prompt = PromptTemplate(
        template="List 3 benefits of {technology} (comma-separated):",
        input_variables=["technology"]
    )

    list_chain = list_prompt | llm | list_parser

    # Test the list chain
    if list_chain:
        result = list_chain.invoke({
            "technology": "cloud computing"
        })
        print(f"✅ Input: 'List 3 benefits of cloud computing'")
        print(f"✅ Parsed Output: {result}")
        print(f"✅ Type: {type(result)} - It's a Python list!")
        print(f"✅ Access items: result[0] = '{result[0] if result else ''}'")

    # Example 2: JSON Output - Complex structured data
    print("\n📦 JSON Output Parser")
    print("=" * 50)

    # Create JSON parser (automatically adds format instructions)
    json_parser = JsonOutputParser()

    # Prompt that requests JSON format with auto-generated instructions
    json_prompt = PromptTemplate(
        template="""Analyze {technology} and respond with JSON containing:
        - benefits: array of 2 benefits
        - complexity: low/medium/high
        - use_case: one main use case

        Technology: {technology}

        {format_instructions}""",
        input_variables=["technology"],
        partial_variables={"format_instructions": json_parser.get_format_instructions()}
    )

    json_chain = json_prompt | llm | json_parser

    # Test the JSON chain
    if json_chain:
        result = json_chain.invoke({
            "technology": "machine learning"
        })

        print(f"✅ Input: 'Analyze machine learning'")

        try:
            parsed = result
            print("✅ Parsed JSON Output:")
            print(f"   Benefits: {parsed.get('benefits', [])}")
            print(f"   Complexity: {parsed.get('complexity', 'N/A')}")
            print(f"   Use Case: {parsed.get('use_case', 'N/A')}")
            print(f"✅ Type: {type(parsed)} - It's a Python dict!")
        except (json.JSONDecodeError, TypeError, AttributeError):
            print(f"⚠️ Parsing failed (rare with JsonOutputParser): {result}")

    # Show the transformation
    print("\n💡 Parser Magic:")
    print("  ✓ List parser: Text → Python list")
    print("  ✓ JSON parser: Text → Python dict")
    print("  ✓ Direct data access: result[0], parsed['benefits']")
    print("  ✓ Ready for your application!")

    # Create marker for completion
    os.makedirs("/root/markers", exist_ok=True)
    with open("/root/markers/task4_complete.txt", "w") as f:
        f.write("COMPLETED")

    print("\n✅ Task 4 completed! You can now parse AI outputs into data structures!")

if __name__ == "__main__":
    task_1_langchain_approach()
    task_2_multi_model()
    task_4_output_parser()