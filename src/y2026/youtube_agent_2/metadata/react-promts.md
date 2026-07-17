## UI Design - update set 1
### 1.
- call /auth/google/debug on screen load first
- if response json has `"has_access_token": true`.
- then mark it signed in.

### 2. create plan with 3 input only :
- name,
- desc,
- logo (optional)

### 3. view created plan/s page
Action buttons:
- Add course manually
- AI suggested Course creation
- Delete

### 4. Add course manually button:
It will input 4 things:
- course name
- desc
- upload logo (optional)
- content Source:
- youtube subscribed channel/s  multi-select tiles (title, Alphabet circle logo)
- For selected channels tile show dynamically multi-select playlist list ( title, desc, thumbnail )
- user will click : **load videos** button
- video list ( title + thumbnail + desc trimmed)
- after that **create course** button
- it will create course with single module (chapter-1) and all videos into that module.
- then similarly user can add more courses.

### 5. AI suggest Course create button.
Similar input
- channel
- playlist (optional)

AI will return complete learning plan object with automatically suggested course and modules (chapters inside it)

## UI Design - update set 2
### 1. Create plan
- Show all dialog box as side drawer from left with 100% vh
- material theme tabs
- parent tab - channels. first tab - ALL
- child tab - playlists. first tab - ALL
- body panel - playlist thumbnail, desc , and underlying video tiles
- all tile must have same width, so look better.

### 1. theme
- light and dark theme
- keep primary color - navy blue and its shade as secondary color.
- Also dont want rainbow thing and soo many colour.
- material theme

### 2. navigation for learning plan and course
- tabbed view
- parent tab - Learning plans.
- child tab - courses.
- body panel, left (fixed lenght width, 30%) : add expandable module/chapter and videos
- body panel, right (rest all width, 70%) : show YouTube video frame and palyer actions. don't want o open in new window

## UI Design - update set 3
1. update playlist tile.
- thumbnail  and title.
- remove desc.
- so that all will have same height.

2. Leaning Plan > overview tab > courses > show then in card tiles.
- circular logo on left, if missing then add starting Alphabat logo
- make tile clickable to its page.
- on hover shadow effect

3. Delete plan action btn : Add confirmation.

4,. Add redux state store to keep learning plan object