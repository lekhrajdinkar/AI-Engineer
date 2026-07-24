Refactor the React/Vite frontend in:

src/y2026/youtube_agent_2/frontend

to use a mobile-first responsive layout, optimized first for iPhone 16 Pro portrait at approximately 402 × 874 CSS pixels.

Before changing code, inspect:
- src/App.jsx
- src/App.css
- src/pages/Dashboard.jsx
- src/pages/Plans.jsx
- src/pages/PlanOverview.jsx
- src/pages/CourseOverview.jsx
- src/pages/CourseWorkspace.jsx
- src/components/PlanDetail.jsx
- src/components/LearningPathNav.jsx

Primary target screens:
1. Dashboard
2. Learning Plans
3. Plan and Course views
4. Course Learning Workspace

Requirements:

1. Global application navigation
- On mobile, move the existing vertical .right-nav sidebar to the top.
- Make the app layout vertical on mobile and restore the side navigation on larger screens.
- The mobile navigation must be sticky, respect env(safe-area-inset-top), and remain above drawers and normal content without covering it.
- Arrange navigation actions horizontally.
- Preserve all existing navigation actions, active states, labels, accessibility attributes, theme behavior, drawers, and authentication controls.
- Interactive controls must have touch targets of at least 44 × 44 CSS pixels.
- Handle navigation overflow without causing page-level horizontal scrolling.

2. Mobile-first styling
- Treat the smallest viewport as the base layout and use min-width media queries for wider layouts where practical.
- Do not perform an unrelated visual redesign.
- Preserve the existing themes and CSS custom properties.
- Eliminate horizontal page overflow at 320px, 375px, 390px, and 402px widths.
- Use min-width: 0 on flex/grid children that contain text.
- Avoid fixed card widths and fixed minimum widths on mobile.
- Use 12–16px mobile content padding and appropriate safe-area insets.
- Prefer CSS changes over JavaScript viewport detection.

3. Cards and grids
- Dashboard cards and panels must be one column on mobile.
- Learning-plan and course cards must fit the available viewport width.
- Remove or override fixed widths such as 440px and 424px on mobile.
- Card actions must remain visible and usable without hover.
- Reposition vertically centered absolute card actions into an accessible mobile layout when necessary.
- Long titles, timestamps, badges, and labels must not push cards wider than the viewport.
- Restore multi-column grids progressively for tablet and desktop.

4. Forms and iOS keyboard behavior
- Prevent iOS Safari from automatically zooming when input, textarea, or select elements receive focus.
- Ensure all text-entry controls have a computed font size of at least 16px on mobile.
- Include dynamically created and screen-specific search fields.
- Do not use user-scalable=no, maximum-scale=1, or any other technique that disables user zoom.
- Keep focus indicators accessible and visible.

5. Dashboard
- Stack the dashboard hero content and controls naturally.
- Make filters/selectors full width where appropriate.
- Use one-column statistic, main, and lower grids on mobile.
- Ensure progress visuals, continue-learning rows, AI summary, and action buttons fit at 402px.
- Do not truncate essential actions.

6. Learning Plans and Course views
- Make page headers stack cleanly.
- Make search, sort, refresh, and create actions fit without overflow.
- Allow filter/label tabs to scroll horizontally inside their own container.
- Cards must be width: 100% on mobile.
- Ensure plan and course overview pages use normal document scrolling on mobile instead of fixed-height clipped containers.
- Drawers should fill the usable mobile viewport and respect top/bottom safe areas.

7. Course Learning Workspace
- On mobile portrait, display the video player above the module/video list.
- Give the YouTube iframe a responsive 16:9 container using aspect-ratio.
- The iframe must fill that container.
- Remove the current mobile max-height behavior that makes the video too small.
- Do not constrain the complete workspace to a fixed-height overflow-hidden container on mobile.
- The module list should appear below the player and use normal scrolling.
- If the video is made sticky while scrolling, position it directly below the mobile top navigation and ensure it does not cover content.
- Video information and actions must remain usable beneath the frame.
- Preserve video selection, watched/bookmarked labels, editing, and YouTube integration behavior.

8. Responsive breakpoints
- Optimize the base/mobile layout for 320–599px.
- Add progressive enhancement around 600px, 768px, 900px, and wider desktop widths only where needed.
- Test portrait and landscape behavior.
- Avoid device-name-specific CSS; use content-driven breakpoints.

9. Accessibility and quality
- Preserve keyboard navigation and visible focus styles.
- Maintain semantic buttons and existing aria-label attributes.
- Respect prefers-reduced-motion for any new animation.
- Do not hide functionality solely to make the mobile layout fit.
- Avoid horizontal body scrolling.
- Do not change API contracts, Redux behavior, routing, authentication, or backend code.

10. Validation
- Run npm run build from src/y2026/youtube_agent_2/frontend.
- Report any pre-existing warnings separately.
- Check the following viewport sizes:
    - 320 × 568
    - 375 × 667
    - 390 × 844
    - 402 × 874 (primary)
    - 874 × 402 landscape
    - 768 × 1024 tablet
    - 1440 × 900 desktop
- Confirm:
    - no page-level horizontal overflow
    - navigation is at the top on mobile and at the side on desktop
    - inputs do not trigger iOS focus zoom
    - cards fit the viewport
    - the video maintains a visible 16:9 frame
    - Dashboard, Learning Plans, Course views, and Learning Workspace remain functional

Implement the changes, run the build, and summarize:
- files changed
- important responsive decisions
- validation performed
- any remaining mobile issues

Do not only provide recommendations—make the code changes.