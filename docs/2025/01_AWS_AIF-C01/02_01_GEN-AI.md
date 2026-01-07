# GenAI
- genAI generates new data/content (ext, images, audio, code, or video) that is similar to the **data it was trained on**.
- **Inference** is the process of using  FM to make predictions or generate **new** outputs

![img_2.png](../../99_img/genai/03/img_2.png)

## ✔️Models
### FM
- pretrained on **internet-scale data**
    - images, video, text, code, audio, website, article, books, etc.
- **backed by NN neural network/s** that can be adapted to many tasks.
- **Multimodal**
    ```
    - input/output = text or images
    - text --> image
    - image --> text
    - text --> graphics
    ```
- Can also serve as the starting point for developing more **specialized models**
- **Specialized AI datacenters**
    - requires massive compute, typically across thousands of GPUs over weeks/months. NVIDIA A100  H100.
    - supercomputers with 10,000–25,000 GPUs, interconnected by high-speed NVLink
    - Training data is stored in fast, distributed SSD/NVMe storage. Needs hundreds of TBs to petabytes.
    - Infiniband : 400 Gbps
  
### LLM (Specialized FM) 👈🏻
- [02_01_LLM.md](02_02_LLM.md)

### Diffusion models (DL)
- Used for generating images and videos
- **forward diffusion** : the system gradually introduces a small amount of noise to an input image until only the noise is left over.
- **Reverse diffusion** :the noisy image is gradually introduced to denoising until a new image is generated

### GANs

### VAEs 


---
## ✔️Concepts

![img_3.png](../../99_img/genai/03/img_3.png)

### ▶️training
#### ➖ Training Data
- **Structure data** - csv,rdbms, timeseries data, etc
- **un-Structure data** - image(pixel),object, comments etc | have specific type of ML alog to deal with these.
- **label Data** - input+label | added by human/auto, use to define mapping x1 --> o1 | **supervised leaning**
- **un-label Data** - input | model itself tries to find pattern -inheritance,relationship, etc | **un-supervised leaning**

#### ➖ Pretraining
- the initial phase where FM learns general patterns from diverse data

#### ➖ Fine-tuning
- subsequent phase where FM is adapted to **specific tasks**,
- using datasets/trainingData (smaller & task-specific)
- unfreeze some layers and train both new and selected old layers

#### ➖ Transfer Learning
- Freeze pretrained layer
- Add new Layer for our specific task and train only this layer

#### ➖ Retraining
- Train all layers from scratch (no pre-learned knowledge)

```
Analogy:
    Retraining = Teach a student everything from zero 📖
    Transfer learning = Student already knows basics, you teach just the last chapter 📘
    Fine-tuning = Student knows a lot, but you adjust what they’ve learned to your topic ✏️
```
#### ➖ parameter
- tuning knobs
- internal to the model and learned from training data (`weights`, `biases`)
    - weight - how word is expressed.
    - baise - how to shift the word.
- Type:
    - **model parameters** : learned during training (weights, biases)
    - **prompt parameters** : context-specific adjustments during inference (temperature, max tokens)

#### ➖ Hyperparameters
- set before training and control the learning algorithm and process
- tuning hyperparameters can significantly impact model performance and training efficiency.
- Example:
    - **learning rate** : how fast weight being updated
    - **batch size** : no og training item. 1000 in one go, or 50, 50, 50,,,
    - **number of epochs** : iterations
    - **regularization** : to adjust over/under fitting
    - **number of layers**

#### ➖ Bias and Variance
- **bias** : Difference between - predicted vs actual **value**
- **Variance (sensitive)** : How much the **performance** of a model, on changes of similar training datasSet.
    - eg: worked well/overfited in dev, but underfit/prod in prod data.

#### ➖ Confusion Matrix 

#### ➖ Regression Matrix 

#### ➖ Evaluation
```
Describes how well your model captures the patterns in training data.

    ✳️Underfitting    : 
        Model is too simple 
        misses patterns
    
    ✳️Overfitting     : 
        Model is too complex
        memorizes noise.
        model gives good predictions for training databut not for the new data
        
    ✳️balanced fit    : Balances bias and variance, performs well on both train and test data
```
![img_1.png](../../99_img/genai/03/img_1.png)

---
### ▶️Embeddings, Vectors, RAG
#### ➖ embedding
- numerical representations of data (text, images, etc.) in a high-dimensional space.
- algo: FastText, Word2Vec

#### ➖ Vector
- the actual multi-dimension arrays of numbers that represent these embeddings.
- Capture semantic relationships between data points.
- Used in similarity search, clustering, and as input to ML models.
- Techniques: `cosine similarity`, `Euclidean distance`
- eg: "king", "queen" have similar embeddings because they share semantic meaning.
- **Vector databases** 
  - stores and manage these embeddings for efficient retrieval.
  - Format: FAISS
  - eg: Amazon OpenSearch, Pinecone, Redis with KNN
- **use cases**:
  - Used in RAG (Retrieval Augmented Generation) to enhance LLMs with external knowledge.
  - [udemy demo 1](https://www.udemy.com/course/aws-ai-practitioner-certified/learn/lecture/44886393#overview)
  - [udemy demo 2](https://www.udemy.com/course/aws-ai-practitioner-certified/learn/lecture/44901525#overview)

#### ➖ RAG (Retrieval Augmented Generation)
- RAG combines LLMs with vector search to provide more accurate and context-aware responses.
- eg: LangChain, LlamaIndex
- Popular libraries: `sentence-transformers`, `transformers`, `faiss`, `chromadb`
- Applications: semantic search, recommendation systems, document retrieval


