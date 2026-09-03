# prompt evaluation
## reference
- https://anthropic-partners.skilljar.com/claude-with-the-anthropic-api/287739
- [README.md](../README.md)

---
## Overview 
- Prompt engineering : toolkit for crafting effective prompts.
- Prompt evaluation takes a different approach
-  it's about measuring their effectiveness through automated testing.

```
example:
    Test against expected answers
    Compare different versions of the same prompt
    Review outputs for errors
```

## 3 options
Option 1: Test the prompt once and decide it's good enough. 

Option 2: Test the prompt a few times and tweak it to handle a corner case

Option 3: ⭐
- Run the prompt through an **evaluation pipeline to score it,** 
- then iterate on the prompt based on objective metrics. 
- This approach requires more work and cost, but gives you much more confidence in your **prompt's reliability.**

## prompt evaluation workflow
Step 1: Draft a Prompt template

```python
prompt = f"""
Please provide a solution to the following task:
{task}
"""
```
Step 2: Create an Eval Dataset
- sample inputs that represent the types of questions or requests your prompt will handle in production
- assemble these datasets by hand or use Claude to generate them for you.

```python
dataset = generate_dataset()

with open('dataset.json', 'w') as f:
    json.dump(dataset, f, indent=2)
```

Step 3: Feed Through Claude
- Take each question from your dataset and merge it with your prompt template to create complete prompts.

```python
def run_prompt(dataset):
    """Merges the prompt and test case input, then returns the result"""
    prompt = f"""
    Please solve the following task:
    {dataset["task"]}
    """
    
    messages = []
    add_user_message(messages, prompt)
    output = chat(messages)
    return output
```

Step 4: **Feed Through a Grader**
- evaluates the **quality** of Claude's responses 
- by examining both the original question and Claude's answer. 
- This step provides objective scoring `1 to 10`

Step 5: Change Prompt and Repeat

---
### Grader : overview
**Code graders** - Programmatically evaluate outputs using custom logic
```
Checking output length
Verifying output does/doesn't have certain words
Syntax validation for JSON, Python, or regex
Readability scores
```

**Model graders** - Use another AI model to assess the quality
```
Response quality
Quality of instruction following
Completeness
Helpfulness
Safety
```

**Human graders** - Have people manually review and score outputs

---
### Grader : Defining Evaluation Criteria
Example:

Code grader
- `Format` - Should return only Python, JSON, or Regex without explanation
- `Valid Syntax `- Produced code should have valid syntax

```python
def validate_json(text):
    try:
        json.loads(text.strip())
        return 10
    except json.JSONDecodeError:
        return 0

def validate_python(text):
    try:
        ast.parse(text.strip())
        return 10
    except SyntaxError:
        return 0

def validate_regex(text):
    try:
        re.compile(text.strip())
        return 10
    except re.error:
        return 0
```

Model graders
- `Task Following` - Response should directly address the user's task with accurate code


```python
def grade_by_model(test_case, output):
    # Create evaluation prompt
    eval_prompt = """
    You are an expert code reviewer. Evaluate this AI-generated solution.
    
    Task: {task}
    Solution: {solution}
    
    Provide your evaluation as a structured JSON object with:
    - "strengths": An array of 1-3 key strengths
    - "weaknesses": An array of 1-3 key areas for improvement  
    - "reasoning": A concise explanation of your assessment
    - "score": A number between 1-10
    """
    
    messages = []
    add_user_message(messages, eval_prompt)
    add_assistant_message(messages, "```json")
    
    eval_text = chat(messages, stop_sequences=["```"])
    return json.loads(eval_text)
```

