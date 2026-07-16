# PRD project requirement doc

## problem
- YouTube does not have coherent structure to study.
- random videos from multiple channels subscribed to.
- can solve by structuring it.
- Also, daily new videos gets added, also need to organize them on daily basis

## Objective
- build learning platform like udemy from reactjs.
- backend services with python
- Simpler version for my personal use.
- Just to solve above problem

## features
### feature-1 : login
- login with Google account

### feature-2 : Add Learning plan
- Add name
- Add description
- Add Source 
  - show dropdown > YouTube channel list from subscriptions
  - pull videos metadata.
- Add courses
  - AI Agent 1 (course builder agent) will help to create course's for the learning plan from metadata
  - capture learning plan object data in json. Define it well.
- define json objects well.
  - hierachy : learnig plan >> courses >> modules >> videos
  - note following same hierachy like used in plateform like udemy.
  - ```json
    {
    ...
    "createData": "",
    "updatedDate": "",
    "channels":[ {}, {}, ...],
    "courses": [ {}, {}, ...],
    ...
    }
    ```
    
### feature-3 : search and sort
- at plans level
- at modules + videos level

### feature-4 : update Learning plan, way-1
- refresh plan with daily feed.
- fetch ONLY new videos from last update date of plan
- updated courses collection then by AI Agent 1 (course builder agent)

### feature-5 : update Learning plan, way-2
- update channels list
- create course by organizing video's metadata
  - take course - capture progress
- source data from youtube channel
  - list all videos
  - list channel
  - list videos from a specific channel's playlist

### feature-6 : archive/delete Learning plan

---

## execution
### phase-1 UI with react
### phase-2 backend services without AI Agent 1
### phase-3 build AI Agents
### phase-4 integrate with AI agent 1

## Future Enhancement
### Will integrate with more AI Agents
- Recommendation Agent
- Sematic search Agent