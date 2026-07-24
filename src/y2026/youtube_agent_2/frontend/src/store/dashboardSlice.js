import { createSelector, createSlice } from '@reduxjs/toolkit'

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState: {
    selectedPlanId: 'all',
  },
  reducers: {
    setDashboardPlan: (state, action) => {
      state.selectedPlanId = action.payload
    },
  },
})

const isWatched = video => Boolean(video.watched || video.labels?.includes('watched'))

export const selectDashboardAnalytics = createSelector(
  [
    state => state.plans.items,
    state => state.sources.syncMetadata,
    state => state.dashboard.selectedPlanId,
  ],
  (allPlans, syncMetadata, selectedPlanId) => {
    const plans = selectedPlanId === 'all'
      ? allPlans
      : allPlans.filter(plan => plan.id === selectedPlanId)
    const courses = plans.flatMap(plan => (plan.courses || []).map(course => ({ ...course, plan })))
    const modules = courses.flatMap(course => course.modules || [])
    const videos = modules.flatMap(module => module.videos || [])
    const watchedVideos = videos.filter(isWatched)
    const bookmarkedVideos = videos.filter(video => video.labels?.includes('bookmarked'))
    const durationSeconds = videos.reduce((total, video) => total + (Number(video.duration_secs) || 0), 0)
    const progress = videos.length ? Math.round((watchedVideos.length / videos.length) * 100) : 0
    const pendingFeeds = (syncMetadata?.channels || []).reduce((total, channel) => (
      total
      + (channel.new_videos?.length || 0)
      + (channel.playlists || []).reduce((playlistTotal, playlist) => playlistTotal + (playlist.new_videos?.length || 0), 0)
    ), 0)

    const planProgress = plans.map(plan => {
      const planVideos = (plan.courses || []).flatMap(course => (
        (course.modules || []).flatMap(module => module.videos || [])
      ))
      const watched = planVideos.filter(isWatched).length
      return {
        id: plan.id,
        name: plan.name,
        courses: plan.courses?.length || 0,
        videos: planVideos.length,
        watched,
        progress: planVideos.length ? Math.round((watched / planVideos.length) * 100) : 0,
        updatedAt: plan.updated_at,
      }
    }).sort((left, right) => right.progress - left.progress || left.name.localeCompare(right.name))

    const continueLearning = courses.map(course => {
      const courseVideos = (course.modules || []).flatMap(module => module.videos || [])
      const watched = courseVideos.filter(isWatched).length
      const nextVideo = courseVideos.find(video => !isWatched(video))
      return {
        planId: course.plan.id,
        planName: course.plan.name,
        courseId: course.id,
        title: course.title,
        description: course.description,
        modules: course.modules?.length || 0,
        videos: courseVideos.length,
        watched,
        progress: courseVideos.length ? Math.round((watched / courseVideos.length) * 100) : 0,
        nextVideoTitle: nextVideo?.title,
        updatedAt: course.updated_at || course.plan.updated_at,
      }
    }).filter(course => course.videos > 0 && course.watched < course.videos)
      .sort((left, right) => new Date(right.updatedAt || 0) - new Date(left.updatedAt || 0))
      .slice(0, 4)

    return {
      plans: plans.length,
      courses: courses.length,
      modules: modules.length,
      videos: videos.length,
      watched: watchedVideos.length,
      bookmarked: bookmarkedVideos.length,
      durationSeconds,
      progress,
      pendingFeeds,
      syncedChannels: syncMetadata?.channels?.length || 0,
      sourceUpdatedAt: syncMetadata?.updated_at,
      planProgress,
      continueLearning,
    }
  },
)

export const { setDashboardPlan } = dashboardSlice.actions
export default dashboardSlice.reducer
