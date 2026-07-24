import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { selectDashboardAnalytics, setDashboardPlan } from '../store/dashboardSlice'
import { firebaseAuth } from '../firebase'
import { LearningPlanDropdown } from '../components/LearningPathNav'

function DashboardIcon({ name }) {
  const paths = {
    plans: 'M5 4h11a3 3 0 0 1 3 3v13H7a2 2 0 0 1-2-2V4Zm2 0v14a2 2 0 0 0-2-2m5-7h6m-6 4h6',
    courses: 'M4 5h16v14H4zM8 9h8m-8 4h5',
    videos: 'M4 5h16v14H4zM10 9l5 3-5 3V9Z',
    time: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v5l3 2',
    arrow: 'M5 12h14m-5-5 5 5-5 5',
    inbox: 'M4 5h16v14H4zM4 14h5l1.5 2h3L15 14h5',
    bookmark: 'M7 4h10v16l-5-3-5 3V4Z',
    ai: 'm12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3Zm7 12 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z',
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={paths[name]} /></svg>
}

function formatHours(seconds) {
  if (!seconds) return '0h'
  const hours = seconds / 3600
  return hours >= 10 ? `${Math.round(hours)}h` : `${hours.toFixed(1)}h`
}

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function Dashboard({ onOpenAiModels }) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const plans = useSelector(state => state.plans.items)
  const selectedPlanId = useSelector(state => state.dashboard.selectedPlanId)
  const analytics = useSelector(selectDashboardAnalytics)
  const aiModels = useSelector(state => state.aiModels.items)
  const aiModelStatus = useSelector(state => state.aiModels.status)
  const enabledAiModels = aiModels.filter(model => model.enabled)
  const defaultAiModel = aiModels.find(model => model.is_default) || enabledAiModels[0]
  const selectedPlan = plans.find(plan => plan.id === selectedPlanId)
  const firstName = firebaseAuth?.currentUser?.displayName?.split(' ')[0]
  const number = new Intl.NumberFormat()

  return (
    <div className="dashboard-page">
      <header className="dashboard-hero">
        <div>
          <span className="dashboard-eyebrow">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
          <h1>{greeting()}{firstName ? `, ${firstName}` : ''}</h1>
          <p>Pick up where you left off and keep your learning library moving.</p>
        </div>
        <div className="dashboard-hero-actions">
          <div className="dashboard-view-switcher"><span>View</span><LearningPlanDropdown plans={plans} selectedPlan={selectedPlan} includeAll onSelect={plan => dispatch(setDashboardPlan(plan?.id || 'all'))} /></div>
          <button className="btn btn-primary" onClick={() => navigate('/plans')}>Open learning plans <DashboardIcon name="arrow" /></button>
        </div>
      </header>

      <div className="dashboard-scroll-body">
      <section className="dashboard-stat-grid" aria-label="Learning summary">
        {[
          ['plans', analytics.plans, 'Learning plans', `${analytics.courses} courses`],
          ['courses', analytics.modules, 'Modules', `${analytics.videos} videos`],
          ['videos', analytics.watched, 'Videos watched', `${analytics.videos - analytics.watched} remaining`],
          ['time', formatHours(analytics.durationSeconds), 'Library duration', `${analytics.bookmarked} bookmarked`],
        ].map(([icon, value, label, detail]) => (
          <article className="dashboard-stat-card" key={label}>
            <span className={`dashboard-stat-icon ${icon}`}><DashboardIcon name={icon} /></span>
            <div><strong>{typeof value === 'number' ? number.format(value) : value}</strong><span>{label}</span><small>{detail}</small></div>
          </article>
        ))}
      </section>

      <div className="dashboard-main-grid">
        <section className="dashboard-panel dashboard-progress-panel">
          <div className="dashboard-panel-heading"><div className="dashboard-progress-heading-main">
            {selectedPlan ? <div className="dashboard-plan-logo">{selectedPlan.logo_url || selectedPlan.logo ? <img src={selectedPlan.logo_url || selectedPlan.logo} alt="" /> : <span>{selectedPlan.name?.charAt(0).toUpperCase() || '?'}</span>}</div> : <div className="dashboard-plan-logo-stack" aria-label={`${plans.length} learning plans`}>{plans.slice(0, 4).map(plan => plan.logo_url || plan.logo ? <img src={plan.logo_url || plan.logo} alt="" key={plan.id} /> : <span key={plan.id}>{plan.name?.charAt(0).toUpperCase() || '?'}</span>)}{plans.length === 0 && <span><DashboardIcon name="plans" /></span>}</div>}
            <div><span>Overall progress</span><h2>{selectedPlan?.name || 'All learning plans'}</h2></div>
          </div><small>{analytics.watched} of {analytics.videos} videos</small></div>
          <div className="dashboard-progress-content">
            <div className="dashboard-progress-ring" style={{ '--dashboard-progress': `${analytics.progress * 3.6}deg` }}>
              <div><strong>{analytics.progress}%</strong><span>complete</span></div>
            </div>
            <div className="dashboard-progress-copy">
              <strong>{analytics.progress >= 75 ? 'The finish line is in sight.' : analytics.progress >= 25 ? 'You are building real momentum.' : 'Every lesson moves you forward.'}</strong>
              <p>{analytics.videos ? `${analytics.videos - analytics.watched} videos remain across the selected learning plans.` : 'Add videos to a course to begin tracking your progress.'}</p>
              <div><span><i className="watched" /> Watched <b>{analytics.watched}</b></span><span><i /> Remaining <b>{Math.max(analytics.videos - analytics.watched, 0)}</b></span></div>
            </div>
          </div>
        </section>

        <section className="dashboard-panel dashboard-inbox-panel">
          <div className="dashboard-panel-heading"><div><span>Source feed</span><h2>Content inbox</h2></div><span className={`dashboard-feed-badge ${analytics.pendingFeeds ? 'has-pending' : ''}`}>{analytics.pendingFeeds} new</span></div>
          <div className="dashboard-inbox-visual"><span><DashboardIcon name="inbox" /></span><div><strong>{analytics.pendingFeeds ? `${analytics.pendingFeeds} videos ready to review` : 'Your source inbox is clear'}</strong><p>{analytics.syncedChannels} synced channel{analytics.syncedChannels === 1 ? '' : 's'}{analytics.sourceUpdatedAt ? ` · Updated ${new Date(analytics.sourceUpdatedAt).toLocaleDateString()}` : ''}</p></div></div>
          <button type="button" className="dashboard-text-action" onClick={() => navigate('/plans')}>Review through learning plans <DashboardIcon name="arrow" /></button>
        </section>
      </div>

      <div className="dashboard-lower-grid">
        <section className="dashboard-panel">
          <div className="dashboard-panel-heading"><div><span>Resume</span><h2>Continue learning</h2></div></div>
          {analytics.continueLearning.length ? <div className="dashboard-continue-list">
            {analytics.continueLearning.map(course => (
              <article key={`${course.planId}:${course.courseId}`}>
                <div className="dashboard-course-mark">{course.title?.charAt(0).toUpperCase() || '?'}</div>
                <div className="dashboard-course-copy">
                  <small>{course.planName}</small>
                  <strong>{course.title}</strong>
                  <span>{course.nextVideoTitle ? `Next: ${course.nextVideoTitle}` : `${course.modules} modules`}</span>
                  <div className="dashboard-mini-progress"><i style={{ width: `${course.progress}%` }} /></div>
                </div>
                <b>{course.progress}%</b>
                <button type="button" onClick={() => navigate(`/plans/${course.planId}/courses/${course.courseId}/learn`)} aria-label={`Continue ${course.title}`}><DashboardIcon name="arrow" /></button>
              </article>
            ))}
          </div> : <div className="dashboard-empty"><DashboardIcon name="courses" /><strong>No active courses yet</strong><p>Open a learning plan and add course videos to see your next lesson here.</p><button className="btn btn-secondary btn-sm" onClick={() => navigate('/plans')}>Browse plans</button></div>}
        </section>

        <section className="dashboard-panel">
          <div className="dashboard-panel-heading"><div><span>Portfolio</span><h2>Progress by plan</h2></div><small>{analytics.planProgress.length} plans</small></div>
          {analytics.planProgress.length ? <div className="dashboard-plan-progress">
            {analytics.planProgress.slice(0, 6).map(plan => (
              <button type="button" key={plan.id} onClick={() => navigate(`/plans/${plan.id}`)}>
                <span><strong>{plan.name}</strong><small>{plan.watched}/{plan.videos} watched</small></span>
                <div><i style={{ width: `${plan.progress}%` }} /></div>
                <b>{plan.progress}%</b>
              </button>
            ))}
          </div> : <div className="dashboard-empty compact"><DashboardIcon name="plans" /><strong>No learning plans</strong><p>Create your first plan to populate this dashboard.</p></div>}
        </section>
      </div>

      <section className="dashboard-ai-summary">
        <span className="dashboard-ai-icon"><DashboardIcon name="ai" /></span>
        <div><small>AI workspace</small><strong>{defaultAiModel ? defaultAiModel.name : aiModelStatus === 'loading' ? 'Loading configured models…' : 'No default model configured'}</strong><p>{defaultAiModel ? `${defaultAiModel.provider} · ${defaultAiModel.model}` : 'Configure a model to enable AI-assisted course and feed organization.'}</p></div>
        <div className="dashboard-ai-metrics"><span><b>{enabledAiModels.length}</b> enabled</span><span><b>{aiModels.filter(model => model.test_status === 'passed').length}</b> tested</span></div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onOpenAiModels}>Manage models <DashboardIcon name="arrow" /></button>
      </section>
      </div>
    </div>
  )
}
