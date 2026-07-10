# Core/s
## CPU 
- central processing unit.
- general purpose task

---
## GPU
- primarily multiplications task
- GPU Type: 4090,  h100,  b200, etc
- designed for parallel processing tasks and are the engine behind modern AI.
- **Deployment Options**
  - **renting Dedicated GPU Servers**
    -  Offer maximum control, but require high maintenance and costs
    -  setups often involve complex Docker and configuration overhead.
  - **serverless GPU**
    - https://www.youtube.com/watch?v=Png_oUi_jQk (skip)
    - pay only for compute (per second) 
    - scale to multi-GPU clusters without architectural changes
    - try https://www.runpod.io/ | `runPod` 

---
# AI Hardware/Chips
- https://youtu.be/iQ9arr3TTMA?si=9Au4E1zV0mJngFvS | CPU vs GPU
- https://www.youtube.com/watch?v=GRDuzLMYOE8 | Nvidia Dominance

## ✔️NVIDIA GPU AI chips
Software (CUDA):
- The true competitive advantage isn't just the chip itself, 
- but the 15 years of software infrastructure built on top of it.
- **CUDA** allows developers to program GPUs efficiently, 
- and the massive ecosystem of libraries (cuDNN, NCCL) 
- and pre-optimized code makes it extremely difficult for developers to switch to alternative hardware.

Systems Engineering: 
- Modern AI training requires **massive clusters of thousands of GPUs** working in perfect sync. 
- NVIDIA doesn't just sell a chip; they sell an entire system, including 
  - high-speed interconnects (NVLink, NVSwitch) and networking (InfiniBand)

Supply Chain Control: 
- NVIDIA has secured massive manufacturing capacity at **TSMC**, 
- specifically for critical packaging steps like CoWoS and high-bandwidth memory (HBM), 
- making it difficult for competitors to even get their chips physically produced.

## ✔️TPU (Google)
- Tensor processing unit

## ✔️Tranium (Amazon)


