| Problem Type                           | Use...           |
| -------------------------------------- | ---------------- |
| Fixed rules, business logic            | Code/Service/API |
| Prediction, classification, generation | AI/ML Model      |

## ✅ When to Use Service/API
```
Problem has clear rules, business logic, or deterministic behavior

Input → predictable processing → output

Examples:
    Validate email, calculate tax, apply discount rules
    CRUD operations
    REST APIs for form submission or user management
    Use standard coding + services (Java/Python API, Lambda, etc.)
```

## ✅ When to Use an AI/ML Model
```
Problem involves uncertainty, prediction, or pattern recognition
No clear rules — you need the model to “learn” from data

Examples:
    Predict customer churn or product demand
    Extract insights from documents (NLP/IDP)
    Analyze sentiment, classify images, recommend products
    Strategic tasks like content generation or forecasting
    Use ML/AI models (SageMaker, Bedrock, Comprehend, etc.)
```

---
## Reference/s
- [🗨️ chapgpt - gen ai 1](https://chatgpt.com/c/685dfae8-a808-800d-bc8c-4d992926601d) 
- [🗨️ chapgpt - gen ai 2](https://chatgpt.com/c/685e3233-8420-800d-a08a-2cd8b933dad6)
- [🟠 Udemy - practitioner cert ](https://www.udemy.com/course/aws-ai-practitioner-certified/learn/lecture/44901525?start=15#overview)
    - [🔸slides](https://courses.datacumulus.com/downloads/certified-ai-practitioner-9u8/)
- [AWS demo - agents](https://aistylist.awsplayer.com/)
- [🟠 AWS training plan on gen AI - 8 courses](https://skillbuilder.aws/learning-plan/G8ENMJ5QBE/aws-artificial-intelligence-practitioner-learning-plan/SU2A1EJM1A)

```
    --- 8 sections ---
    Fundamentals of AI and ML
    Exploring AI :: Use Cases and Applications
    Responsible AI Practices
    Developing ML Solutions
  
    Developing GenAI Solutions
    Optimizing FM
    Security, Compliance, and Governance for AI Solutions
    Essentials of Prompt Engineering
```

---

```
- AI Artificial Intelligence
  ├── ML Machine Learning
  │   └── DL Deep Learning (Neural n/w, stacker layer)
  │       └── GenAI Generative AI (CSE)

``` 

| Term       | Full Form               | What It Means                                                                     | Examples                                              |
| ---------- | ----------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------- |
| **AI**     | Artificial Intelligence | The broad field of building machines that mimic human intelligence                | Chatbots, self-driving cars, recommendation systems   |
| **ML**     | Machine Learning        | A subset of AI where machines learn from data without being explicitly programmed | Spam detection, fraud detection, image classification |
| **DL**     | Deep Learning           | A subset of ML using deep neural networks for complex tasks                       | Face recognition, speech-to-text, GPT models          |
| **Gen AI** | Generative AI           | A type of AI (often using DL) that generates new content (text, image, etc.)      | ChatGPT, DALL·E, GitHub Copilot, Sora                 |

---
## Conversation-1 
```
So now what I understood so there are lots of Machine learning models already exists 
    like IDP, Natural Language Processing, WaveNet, LLM, GAN And so many 
    help me list on all other models which I missed and most popular ones.
     
And  foundational model which are designed to adapt  
change and are more creative to generate new content
and under the hood relying on other models which were 
already built in past one or two decades.

So list down all the models On which foundational models relied on and 
Also tell me The Python library which I can use to connect with those models.
 
for example : There is a langchain Library to connect with LLM Model, so similarly do for rest
```
###  Popular ML/DL Models That Shaped Foundational Models
| **Model Type**                          | **Model Name / Concept**                            | **Purpose / Use Case**                  | **Foundation Model Dependency**                | **Python Library**                                   |
| --------------------------------------- | --------------------------------------------------- | --------------------------------------- | ---------------------------------------------- | ---------------------------------------------------- |
| ✅ Transformers                          | **BERT, GPT, T5, XLNet, RoBERTa**                   | Language understanding & generation     | Core of all LLMs                               | `transformers` (HuggingFace), `LangChain`            |
| ✅ RNNs / LSTMs                          | LSTM, GRU                                           | Early NLP & time series                 | Predecessors of transformers                   | `keras`, `torch.nn`                                  |
| ✅ CNNs                                  | AlexNet, VGG, ResNet                                | Image classification, vision tasks      | Used in multi-modal models                     | `torchvision`, `tensorflow.keras.applications`       |
| ✅ GANs                                  | DCGAN, StyleGAN, CycleGAN                           | Image generation, augmentation          | Used in diffusion, creative GenAI              | `tensorflow`, `torch`, `diffusers`                   |
| ✅ VAEs                                  | Variational Autoencoders                            | Image generation, compression           | Inspired diffusion models                      | `Pyro`, `TensorFlow Probability`                     |
| ✅ Diffusion Models                      | DDPM, Stable Diffusion                              | Image & video generation                | Part of GenAI stack (e.g. Bedrock Titan Image) | `diffusers`, `comfyui`, `invokeAI`                   |
| ✅ Seq2Seq                               | Encoder-Decoder (attention)                         | Translation, summarization              | BERT, T5, GPT follow this architecture         | `OpenNMT`, `Fairseq`, `transformers`                 |
| ✅ Audio Models                          | WaveNet, Tacotron                                   | Speech synthesis (TTS)                  | Underlies Amazon Polly, Google TTS             | `ESPnet`, `torchaudio`                               |
| ✅ RL (Reinforcement Learning)           | DQN, PPO, A3C                                       | Model training with reward (e.g., RLHF) | Used in ChatGPT/Claude refinement              | `stable-baselines3`, `Ray RLlib`                     |
| ✅ IDP (Intelligent Document Processing) | LayoutLM, Donut                                     | Form understanding, OCR+NLP             | Supports document GenAI use cases              | `transformers`, `paddleocr`, `layoutparser`          |
| ✅ Multi-modal                           | CLIP, Flamingo, BLIP                                | Text + image understanding              | Supports image captioning, vision+LLM models   | `transformers`, `OpenCLIP`, `vision-language-models` |
| ✅ Retrieval Models                      | BM25, Dense Passage Retrieval (DPR), FAISS, ColBERT | RAG & semantic search                   | Used in Bedrock RAG, LangChain                 | `faiss`, `chromadb`, `sentence-transformers`         |


### Key Python Libraries to Work with These Models
| **Library**                      | **Use Case**                                              |
| -------------------------------- | --------------------------------------------------------- |
| `transformers` (HuggingFace)     | NLP, LLMs, vision-language, BERT/GPT/etc.                 |
| `diffusers`                      | Diffusion-based image generation (e.g., Stable Diffusion) |
| `torch`, `tensorflow`            | Low-level DL model building                               |
| `LangChain`                      | Orchestration of LLMs, agents, tools, memory              |
| `llama-index`                    | RAG pipelines, document ingestion, vector integration     |
| `faiss`, `chromadb`              | Vector storage and semantic search                        |
| `sentence-transformers`          | Sentence embeddings, semantic similarity                  |
| `OpenNMT`, `Fairseq`             | Seq2Seq model training (translation, summarization)       |
| `ESPnet`, `torchaudio`           | Speech/audio models                                       |
| `layoutparser`, `paddleocr`      | Document layout and OCR for IDP                           |
| `stable-baselines3`, `Ray RLlib` | Reinforcement learning (e.g., RLHF)                       |

---
## project/POC idea
- [fine tune Haiku model](https://chatgpt.com/c/68621d61-7174-800d-87b4-487c189953d3)
- RAG
- chatbot
- run SLM locally
- llm agent
- ...
