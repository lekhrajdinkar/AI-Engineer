# Accessing Claude with the API
## reference
- https://anthropic-partners.skilljar.com/claude-with-the-anthropic-api/287726
- [README.md](../README.md)

## API Request
```body
  API Key - Identifies your request to Anthropic
  Model - Name of the model to use (like "claude-3-sonnet")
  Messages - List containing the user's input text
  Max Tokens - Limit for how many tokens Claude can generate
```

Tokenization > Embedding > **Contextualization** > Generation
- Claude refines each embedding based on surrounding words to determine the most likely **meaning** in context

When Claude Stops Generating
- Max tokens reached - Has it hit the limit you specified?
- Natural ending - Did it generate an end-of-sequence token?
- Stop sequence - Did it encounter a predefined stop phrase?

## API Response
```feilds
Message - The generated text
Usage - Count of input and output tokens
Stop Reason - Why generation ended
```
---
## types of messages
- **User messages** - Content you want to send to Claude (written by humans)
- **Assistant messages** - Responses that Claude has generated

```python
# ANTHROPIC_API_KEY="your-api-key-here"

from dotenv import load_dotenv
load_dotenv()

from anthropic import Anthropic

client = Anthropic()
model = "claude-sonnet-4-0"

message = client.messages.create(
    model=model,
    max_tokens=1000,
    messages=[
        {
            "role": "user",
            "content": "What is quantum computing? Answer in one sentence"
        }
    ]
)
```

## Multi-Turn conversations
```Steps
Send your initial user message to Claude
Take Claude's response and add it to your message list as an assistant message
Add your follow-up question as another user message
Send the entire conversation history to Claude
```

Building Helper Functions

```python
def add_user_message(messages, text):
    user_message = {"role": "user", "content": text}
    messages.append(user_message)

def add_assistant_message(messages, text):
    assistant_message = {"role": "assistant", "content": text}
    messages.append(assistant_message)

def chat(messages):
    message = client.messages.create(
        model=model,
        max_tokens=1000,
        messages=messages,
    )
    return message.content[0].text
```

## System prompts
- are a powerful way to customize how Claude responds to user input. 
- Instead of getting generic answers, 
- you can shape Claude's tone, style, 
- and approach to match your specific use case.
> Guidance on how to respond.

## Temperature
- is a powerful parameter that controls how predictable or creative Claude's responses will be

```python
    answer = client.messages.create(
    model=model,
    max_tokens=1000,
    messages=messages,
    temperature=1.0
)
```

```blueprint
Low Temperature (0.0 - 0.3)
    Factual responses
    Coding assistance
    Data extraction
    Content moderation
    
Medium Temperature (0.4 - 0.7)
    Summarization
    Educational content
    Problem-solving
    Creative writing with constraints
    
High Temperature (0.8 - 1.0)
    Brainstorming
    Creative writing
    Marketing content
    Joke generation
```
>  temperature doesn't guarantee different outputs - it just changes the probability of getting them

## Streaming
```python
stream = client.messages.create(
    model=model,
    max_tokens=1000,
    messages=messages,
    stream=True
)

for event in stream:
    print(event)
```

Rather than manually parsing events, you can use the SDK's simplified streaming interface

```python
with client.messages.stream(
    model=model,
    max_tokens=1000,
    messages=messages
) as stream:
    for text in stream.text_stream:
        print(text, end="")

    # # Get the complete message for database storage    
    final_message = stream.get_final_message()
```

```
Message
├── ContentBlock
│   ├── Delta
│   ├── Delta
│   └── Stop
│
├── ContentBlock
│   ├── Delta
│   └── Stop
│
└── MessageDelta
    ↓
MessageStop
```

| Event                 | Meaning                                                                                                                        |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **MessageStart**      | A new assistant message has begun. Usually contains initial message metadata, such as an ID and role.                          |
| **ContentBlockStart** | A particular content block is starting. The block might contain text, tool use, or another supported content type.             |
| **ContentBlockDelta** | An incremental piece of that block has arrived. For text streaming, these are the chunks you append to the displayed response. |
| **ContentBlockStop**  | That individual content block is finished.                                                                                     |
| **MessageDelta**      | Message-level information is finalized or updated, often including stop information or usage statistics.                       |
| **MessageStop**       | The entire message stream has ended.                                                                                           |

## structured formatting

combine **assistant message** prefilling with **stop sequences** to get exactly the content you want

```python
messages = []

add_user_message(messages, "Generate a very short event bridge rule as json")
add_assistant_message(messages, "```json")

text = chat(messages, stop_sequences=["```"])
```