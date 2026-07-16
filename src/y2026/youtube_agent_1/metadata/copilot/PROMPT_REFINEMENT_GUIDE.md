# System Prompt Refinement Guide

This document provides guidance for iterating on and refining the TechVault system prompt based on agent performance.

## Iteration Workflow

1. **Implement & Test**: Deploy current system prompt with actual YouTube content
2. **Evaluate**: Measure categorization accuracy, search quality, relevance scoring
3. **Identify Gaps**: Find categories where agent performs poorly
4. **Refine**: Update prompt sections based on failure patterns
5. **Validate**: Re-test on same dataset to measure improvement
6. **Repeat**: Continuously improve through feedback loops

## Performance Metrics to Track

### Categorization Accuracy
```
Metric: F1 Score (per category)
Target: > 90% overall, > 85% per category
Method: 
  - Sample 100 random videos
  - Manually categorize (ground truth)
  - Compare against agent categorization
  - Calculate precision/recall
```

### Search Relevance
```
Metric: NDCG@10 (Normalized Discounted Cumulative Gain)
Target: > 0.75
Method:
  - Test 20 representative queries
  - Score results (0=irrelevant, 2=perfect match)
  - Measure ranking quality
```

### Relevance Scoring
```
Metric: Correlation with manual importance ratings
Target: Pearson r > 0.8
Method:
  - Rate 50 videos manually (1-10 importance)
  - Compare with agent scores (0.0-1.0)
  - Calculate correlation
```

### User Engagement
```
Metric: Click-through rate on recommendations
Target: > 30%
Method:
  - Track which recommended videos users click
  - Measure path completion rate
  - Analyze user feedback
```

## Common Failure Patterns & Fixes

### Problem: Agent Misclassifies Content

**Symptom**: A Python tutorial gets tagged as "Cloud Computing"

**Root Cause**: Prompt is ambiguous about category boundaries

**Fix**: Add explicit examples to the categorization section
```markdown
## Categorization Examples

❌ WRONG: "Python AWS SDK Tutorial" → 01_PROGRAMMING_LANGUAGE  
✅ RIGHT: "Python AWS SDK Tutorial" → 03_CLOUD_COMPUTING  
Reason: Focus is on cloud service usage, not language features

❌ WRONG: "Kubernetes in AWS" → 03_CLOUD_COMPUTING  
✅ RIGHT: "Kubernetes in AWS" → 04_DOCKER_KUBERNETES  
Reason: Focus is on orchestration, not cloud provider
```

### Problem: Agent Assigns Low Relevance to High-Value Content

**Symptom**: Obscure channel gets 0.9 score, major conference talk gets 0.6

**Root Cause**: Relevance scoring formula over-weights view count

**Fix**: Adjust the weighting formula
```
OLD: relevance = (0.1 * depth) + (0.2 * freshness) + (0.4 * authority) + ...
NEW: relevance = (0.3 * depth) + (0.2 * freshness) + (0.2 * authority) + ...
```

### Problem: Semantic Search Finds Unrelated Videos

**Symptom**: Query "Load balancing" returns results about "mental load"

**Root Cause**: Embeddings are too generic

**Fix**: Use domain-specific embedding model or fine-tune descriptions
```python
# Instead of generic sentence-transformers
# Use: "all-minilm-l6-v2" (technical domain)
# Or: Fine-tune on technical corpus
```

### Problem: Deduplication Misses Similar Content

**Symptom**: 5 different creators covering "Docker basics" → all indexed as separate

**Root Cause**: Similarity threshold too high

**Fix**: Lower threshold and add manual review queue
```markdown
## Deduplication Strategy

If similarity > 0.85: Mark as duplicate, keep highest authority
If similarity 0.70-0.85: Flag for manual review (learning path)
If similarity < 0.70: Index as separate content
```

## Prompt Sections to Refine

### 1. Category Definitions
- Add "ambiguous boundary" examples between categories
- Clarify when content spans multiple categories
- Provide decision trees for edge cases

### 2. Relevance Scoring
- Document the exact formula
- Provide threshold guidelines
- Add examples with expected scores

### 3. Accuracy Guarantees
- Specify "Unknown" usage more explicitly
- Add examples of when to use "Unknown" vs. estimate
- Define confidence levels for different data points

### 4. Search Behavior
- Clarify full-text vs. semantic ranking
- Specify how to handle typos & variations
- Document query expansion strategy

### 5. Learning Path Logic
- Add examples of valid vs. invalid paths
- Specify how to handle loops (prerequisites)
- Document recommendation cutoff thresholds

## A/B Testing Strategy

### Test 1: Category Definitions
**Current**: Implicit in prompt  
**Variant A**: Explicit decision trees (if-then rules)  
**Variant B**: Examples + counter-examples  
**Metric**: F1 score on 100-video test set

### Test 2: Relevance Formula
**Current**: Formula not explicitly stated  
**Variant A**: Stated formula with weights  
**Variant B**: Dynamic weighting based on category  
**Metric**: Correlation with manual ratings

### Test 3: Search Ranking
**Current**: Simple BM25 + embedding cosine  
**Variant A**: Add recency boost  
**Variant B**: Add personalization signals  
**Metric**: NDCG@10 on representative queries

## Prompt Expansion Ideas

### For Better Categorization
```markdown
## Categorization Sub-Rules

### Rule 1: Focus Over Tools
If a video uses Tool X to solve Problem Y:
- Categorize by Problem Y (system design, databases, etc.)
- Mention Tool X in subcategories

### Rule 2: Hierarchy Preference
If content fits multiple categories:
- Choose the deepest/most specific category
- Note secondary categories in tags
- Example: "Kafka in AWS" → MESSAGE_BROKER (primary), CLOUD_COMPUTING (secondary)

### Rule 3: Freshness & Maturity
- Mature topics: Focus on accuracy
- Emerging topics: Flag as "emerging_technology": true
```

### For Better Search
```markdown
## Search Enhancement Strategy

### Query Expansion
- Synonym mapping: "container" ↔ "docker"
- Acronym expansion: "K8s" → "kubernetes"
- Domain glossary: "RPC" → "remote procedure call"

### Ranking Signals
1. Relevance (embedding similarity): 40%
2. Authority (channel metrics): 30%
3. Freshness (publication date): 20%
4. Engagement (likes/comments): 10%
```

### For Better Learning Paths
```markdown
## Path Construction Algorithm

### Prerequisites Detection
- Extract topics from each video
- Build directed graph: topic → prerequisite topics
- Use transitive reduction to remove redundant edges

### Path Scoring
- Path length: prefer shorter (3-5 videos)
- Coherence: videos should have < 0.3 topic overlap
- Authority: prefer high-score creators
- Difficulty progression: strictly increasing
```

## Monitoring & Alerts

### Setup Continuous Metrics
```bash
# Track daily
- New videos indexed
- Average relevance score distribution
- Categorization F1 (on random sample)
- Top search queries & CTR
- User path completion rates

# Alert thresholds
- If F1 drops below 85%: Investigate categorization
- If avg relevance < 0.65%: Review scoring formula
- If semantic search NDCG < 0.70: Check embeddings
```

## Documentation Updates

When refining the system prompt:
1. Update `System_Prompt_v1.md` with changes
2. Add version note: "v1.1 — Improved categorization examples"
3. Document rationale in this file
4. Run full evaluation before deploying
5. Archive old version for comparison

## Template for Refinement Request

Use this when reporting issues:

```markdown
## Refinement Request: [Title]

**Problem**: [Concise description]

**Evidence**: 
- Example 1: [Video URL] → Wrong category
- Example 2: [Query] → Poor results
- Metric impact: Categorization F1 dropped 3%

**Hypothesis**: [Why it's happening]

**Proposed Fix**: [Change to system prompt]

**Expected Outcome**: [Measurable improvement]

**Effort**: [High/Medium/Low]
```

---

**Remember**: The system prompt is a living document. Refine iteratively based on real data, not assumptions.

