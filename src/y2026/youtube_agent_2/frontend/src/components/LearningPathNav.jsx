import React from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { LabelIcon, WorkspaceIcon } from './Icons'

function ChevronIcon() {
  return <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>
}

function CheckIcon() {
  return <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8 3 3 7-7" /></svg>
}

function ItemLogo({ item, fallback = 'A' }) {
  const source = item?.logo_url || item?.logo
  return source
    ? <img className="learning-path-item-logo" src={source} alt="" />
    : <span className="learning-path-item-logo learning-path-item-logo-fallback" aria-hidden="true">{fallback}</span>
}

function CourseViewIcon({ id }) {
  if (['bookmarked', 'watched', 'mark_for_delete'].includes(id)) {
    return <LabelIcon label={id} />
  }
  return <WorkspaceIcon name={id === 'refresh_needed' ? 'progress' : 'menu'} />
}

function sortItems(items, sort, nameField) {
  return [...items].sort((left, right) => {
    if (sort === 'created') {
      return new Date(right.created_at || right.updated_at || 0) - new Date(left.created_at || left.updated_at || 0)
    }
    return (left[nameField] || '').localeCompare(right[nameField] || '')
  })
}

function MenuTools({ value, onChange, sort, onSortChange, label }) {
  return (
    <div className="learning-path-menu-tools">
      <label>
        <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.5" /><path d="m10.5 10.5 3 3" /></svg>
        <input autoFocus type="search" value={value} onChange={event => onChange(event.target.value)} placeholder={`Search ${label}...`} aria-label={`Search ${label}`} />
      </label>
      <div className="learning-path-sort" role="group" aria-label={`Sort ${label}`}>
        <button type="button" className={sort === 'name' ? 'active' : ''} onClick={() => onSortChange('name')}>Name</button>
        <button type="button" className={sort === 'created' ? 'active' : ''} onClick={() => onSortChange('created')}>Created</button>
      </div>
    </div>
  )
}

export function LearningPlanDropdown({ plans, selectedPlan, onSelect, includeAll = false }) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const [sort, setSort] = React.useState('name')
  const pickerRef = React.useRef(null)

  React.useEffect(() => {
    const close = event => {
      if (!pickerRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [])

  const visiblePlans = sortItems(
    plans.filter(item => `${item.name || ''} ${item.description || ''}`.toLowerCase().includes(search.trim().toLowerCase())),
    sort,
    'name',
  )

  const choose = item => {
    onSelect(item)
    setOpen(false)
  }

  return (
    <div className="learning-path-picker" ref={pickerRef}>
      <button type="button" className="learning-path-trigger" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(value => !value)}>
        <ItemLogo item={selectedPlan} fallback={selectedPlan?.name?.charAt(0)?.toUpperCase() || 'A'} />
        <span>{selectedPlan?.name || 'All learning plans'}</span>
        <ChevronIcon />
      </button>
      {open && <div className="learning-path-menu" role="menu" aria-label="Select learning plan">
        <strong>Select learning plan</strong>
        <MenuTools value={search} onChange={setSearch} sort={sort} onSortChange={setSort} label="plans" />
        {includeAll && <button type="button" role="menuitem" className={`learning-path-menu-item-with-logo ${!selectedPlan ? 'active' : ''}`} onClick={() => choose(null)}>
          <span className="learning-path-menu-check">{!selectedPlan && <CheckIcon />}</span>
          <ItemLogo fallback="A" />
          <span><b>ALL Plans</b><small>{plans.length} plans combined</small></span>
        </button>}
        {visiblePlans.map(item => <button type="button" role="menuitem" className={`learning-path-menu-item-with-logo ${item.id === selectedPlan?.id ? 'active' : ''}`} key={item.id} onClick={() => choose(item)}>
          <span className="learning-path-menu-check">{item.id === selectedPlan?.id && <CheckIcon />}</span>
          <ItemLogo item={item} fallback={item.name?.charAt(0)?.toUpperCase() || '?'} />
          <span><b>{item.name}</b><small>{item.courses?.length || 0} courses</small></span>
        </button>)}
        {visiblePlans.length === 0 && <p className="learning-path-menu-empty">No plans match your search.</p>}
      </div>}
    </div>
  )
}

export function CourseViewDropdown({ options, value, onSelect }) {
  const [open, setOpen] = React.useState(false)
  const pickerRef = React.useRef(null)
  const selected = options.find(option => option.id === value) || options[0]

  React.useEffect(() => {
    const close = event => {
      if (!pickerRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [])

  const choose = id => {
    onSelect(id)
    setOpen(false)
  }

  return (
    <div className="learning-path-picker course-view-picker" ref={pickerRef}>
      <button type="button" className="learning-path-trigger current-course" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(current => !current)}>
        <span className="learning-path-view-icon"><CourseViewIcon id={selected.id} /></span>
        <span>{selected.shortLabel || selected.label}</span>
        <ChevronIcon />
      </button>
      {open && <div className="learning-path-menu course-view-menu" role="menu" aria-label="Filter courses">
        <strong>Show courses</strong>
        {options.map(option => <button type="button" role="menuitemradio" aria-checked={option.id === selected.id} className={`learning-path-menu-item-with-logo ${option.id === selected.id ? 'active' : ''}`} key={option.id} onClick={() => choose(option.id)}>
          <span className="learning-path-menu-check">{option.id === selected.id && <CheckIcon />}</span>
          <span className="learning-path-view-icon"><CourseViewIcon id={option.id} /></span>
          <span><b>{option.label}</b><small>{option.count} {option.count === 1 ? 'course' : 'courses'}</small></span>
        </button>)}
      </div>}
    </div>
  )
}

export default function LearningPathNav({ plan, course, mode = 'overview', actions = null, showHome = true, className = '' }) {
  const navigate = useNavigate()
  const plans = useSelector(state => state.plans.items)
  const [openMenu, setOpenMenu] = React.useState(null)
  const [planSearch, setPlanSearch] = React.useState('')
  const [courseSearch, setCourseSearch] = React.useState('')
  const [planSort, setPlanSort] = React.useState('name')
  const [courseSort, setCourseSort] = React.useState('name')
  const navRef = React.useRef(null)

  React.useEffect(() => {
    const closeMenus = event => {
      if (!navRef.current?.contains(event.target)) setOpenMenu(null)
    }
    document.addEventListener('pointerdown', closeMenus)
    return () => document.removeEventListener('pointerdown', closeMenus)
  }, [])

  const sortedPlans = sortItems(
    plans.filter(item => `${item.name || ''} ${item.description || ''}`.toLowerCase().includes(planSearch.trim().toLowerCase())),
    planSort,
    'name',
  )
  const sortedCourses = sortItems(
    (plan.courses || []).filter(item => `${item.title || ''} ${item.description || ''}`.toLowerCase().includes(courseSearch.trim().toLowerCase())),
    courseSort,
    'title',
  )

  const choosePlan = selectedPlan => {
    setOpenMenu(null)
    if (selectedPlan.id !== plan.id) navigate(`/plans/${selectedPlan.id}`)
  }

  const chooseCourse = selectedCourse => {
    setOpenMenu(null)
    const suffix = mode === 'learn' ? '/learn' : ''
    navigate(`/plans/${plan.id}/courses/${selectedCourse.id}${suffix}`)
  }

  return (
    <nav className={`learning-path-nav ${className}`.trim()} aria-label="Learning navigation" ref={navRef}>
      {showHome && <><button type="button" className="learning-path-home" onClick={() => navigate('/')} title="Home" aria-label="Home">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V10Z" /></svg>
      </button>
      <span className="learning-path-separator" aria-hidden="true">/</span></>}

      <div className="learning-path-picker">
        <button
          type="button"
          className="learning-path-trigger"
          aria-haspopup="menu"
          aria-expanded={openMenu === 'plans'}
          onClick={() => setOpenMenu(current => current === 'plans' ? null : 'plans')}
        >
          <ItemLogo item={plan} fallback={plan.name?.charAt(0)?.toUpperCase() || '?'} />
          <span>{plan.name}</span>
          <ChevronIcon />
        </button>
        {openMenu === 'plans' && (
          <div className="learning-path-menu" role="menu" aria-label="Switch learning plan">
            <strong>Switch learning plan</strong>
            <MenuTools value={planSearch} onChange={setPlanSearch} sort={planSort} onSortChange={setPlanSort} label="plans" />
            {sortedPlans.map(item => (
              <button type="button" role="menuitem" className={`learning-path-menu-item-with-logo ${item.id === plan.id ? 'active' : ''}`} key={item.id} onClick={() => choosePlan(item)}>
                <span className="learning-path-menu-check">{item.id === plan.id && <CheckIcon />}</span>
                <ItemLogo item={item} fallback={item.name?.charAt(0)?.toUpperCase() || '?'} />
                <span><b>{item.name}</b><small>{item.courses?.length || 0} courses</small></span>
              </button>
            ))}
            {sortedPlans.length === 0 && <p className="learning-path-menu-empty">No plans match your search.</p>}
          </div>
        )}
      </div>

      <span className="learning-path-separator" aria-hidden="true">/</span>

      <div className="learning-path-picker">
        <button
          type="button"
          className="learning-path-trigger current-course"
          aria-haspopup="menu"
          aria-expanded={openMenu === 'courses'}
          onClick={() => setOpenMenu(current => current === 'courses' ? null : 'courses')}
        >
          <ItemLogo item={course} fallback={course.title?.charAt(0)?.toUpperCase() || '?'} />
          <span>{course.title}</span>
          <ChevronIcon />
        </button>
        {openMenu === 'courses' && (
          <div className="learning-path-menu course-menu" role="menu" aria-label={`Switch course in ${plan.name}`}>
            <strong>Courses in {plan.name}</strong>
            <MenuTools value={courseSearch} onChange={setCourseSearch} sort={courseSort} onSortChange={setCourseSort} label="courses" />
            {sortedCourses.map(item => (
              <button type="button" role="menuitem" className={`learning-path-menu-item-with-logo ${item.id === course.id ? 'active' : ''}`} key={item.id} onClick={() => chooseCourse(item)}>
                <span className="learning-path-menu-check">{item.id === course.id && <CheckIcon />}</span>
                <ItemLogo item={item} fallback={item.title?.charAt(0)?.toUpperCase() || '?'} />
                <span><b>{item.title}</b><small>{item.modules?.length || 0} modules</small></span>
              </button>
            ))}
            {sortedCourses.length === 0 && <p className="learning-path-menu-empty">No courses match your search.</p>}
          </div>
        )}
      </div>
      {actions && <div className="learning-path-actions">{actions}</div>}
    </nav>
  )
}
