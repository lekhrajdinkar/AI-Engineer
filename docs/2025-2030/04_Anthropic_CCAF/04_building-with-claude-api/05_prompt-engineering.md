# PE
## Reference
- [claudeApIProject](../../../../src/y2026/claudeApIProject)
- https://anthropic-partners.skilljar.com/claude-with-the-anthropic-api/287745
- [README.md](../README.md)

---
## Iterative Improvement Process
| Step  | Action                                  | Description                                                                      |
| ----- | --------------------------------------- | -------------------------------------------------------------------------------- |
| **1** | **Set a goal**                          | Define what you want your prompt to accomplish.                                  |
| **2** | **Write an initial prompt**             | Create a basic first attempt.                                                    |
| **3** | **Evaluate the prompt**                 | Test it against your criteria.                                                   |
| **4** | **Apply prompt engineering techniques** ⭐ | Use specific methods to improve the prompt's performance.                        |
| **5** | **Re-evaluate**                         | Verify that your changes actually improved the results.                          |
|  | Repeat 4 and 5                             |  |

## 2. Writing Your Initial Prompt
```python
def run_prompt(prompt_inputs):
    prompt = f"""
What should this person eat?

- Height: {prompt_inputs["height"]}
- Weight: {prompt_inputs["weight"]}
- Goal: {prompt_inputs["goal"]}
- Dietary restrictions: {prompt_inputs["restrictions"]}
"""
    messages = []
    add_user_message(messages, prompt)
    return chat(messages)
```

## 3. Evaluate prompt
### Generating Test Data
`PromptEvaluator` - PromptEvaluator class that handles dataset generation and model grading

```python
dataset = evaluator.generate_dataset(
    task_description="Write a compact, concise 1 day meal plan for a single athlete",
    prompt_inputs_spec={
        "height": "Athlete's height in cm",
        "weight": "Athlete's weight in kg", 
        "goal": "Goal of the athlete",
        "restrictions": "Dietary restrictions of the athlete"
    },
    output_file="dataset.json",
    num_cases=3
)
```
### Adding Evaluation Criteria (Grader)
```python
results = evaluator.run_evaluation(
    run_prompt_function=run_prompt,
    dataset_file="dataset.json",
    extra_criteria="""
The output should include:
- Daily caloric total
- Macronutrient breakdown  
- Meals with exact foods, portions, and timing
"""
)
```

### Analyzing Results
- After running an evaluation, you'll get both a numerical score and a detailed HTML report
- was bad, will improve with next steps.

---
## 4. Apply prompt engineering techniques
### Clear and direct Communication
- State exactly what you want without beating around the bush
- Lead with a straightforward statement 
- Use instructions, not questions
- Start with direct action verbs like "Write," "Create," or "Generate"

example: Generate a one-day meal plan for an athlete that meets their dietary restrictions
- What action to take (generate)
- What to create (a meal plan)
- Key constraints (one day, for an athlete, meeting dietary restrictions)

###  Be Specific
- Instead of leaving everything up to the model's interpretation, 
- you can **provide clear guidelines** or steps that direct Claude toward the kind of output you're looking for.

Two Types of Guidelines:
- Output Quality Guidelines: specifies the characteristics of a good response
- Process Steps: breaks down the task into smaller steps

```
Output Quality: 
    Length of the response
    Structure and format
    Specific attributes or elements to include
    Tone or style requirements

---
Process Steps:
    Brainstorm three talents that would create dramatic tension
    Pick the most interesting talent
    Outline a pivotal scene that reveals the talent
    Brainstorm supporting character types that could increase the impact
```

### Structure with XML tags
- If you ask Claude to debug code using provided documentation, mixing everything together creates confusion:

```
You are an expert Python debugger. Use the code and the documentation to find and fix bugs.

<code_reference>
[insert relevant code documentation]
</code_reference>

<code_snippet>
[insert code to debug]
</code_snippet>

Find bugs and fix them.
```

XML tags are most useful when:
- Including large amounts of context or data
- Mixing different types of content (code, documentation, data)
- You want to be extra clear about content boundaries
- Working with complex prompts that interpolate multiple variables

### Providing examples
Examples are particularly useful for:
- Capturing corner cases or edge scenarios
- Defining complex output formats (like specific JSON structures)
- Showing the exact style or tone you want
- Demonstrating how to handle ambiguous inputs

One-Shot: Provide a single example to establish the pattern

Multi-Shot: Provide multiple examples to cover different scenarios

Best Practices
- Always use XML tags to structure your examples clearly
- Include examples that address your most common failure cases
- Keep examples relevant to your specific task

---
## Code Block
Complex program, dont check all
@[code:238-238](../../../../src/y2026/claudeApIProject/002_prompting.ipynb)