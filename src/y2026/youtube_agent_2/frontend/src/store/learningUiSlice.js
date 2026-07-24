import { createSlice } from '@reduxjs/toolkit'

export const DEFAULT_PLANS_PAGE_STATE = {
  query: '',
  sortBy: 'updated',
  labelTab: 'ALL',
}

export const DEFAULT_PLAN_PAGE_STATE = {
  query: '',
  sortBy: 'updated',
  labelFilters: [],
  courseLabelTab: 'ALL',
}

export const DEFAULT_WORKSPACE_STATE = {
  activeModuleId: null,
  activeVideoId: null,
  expandedModuleIds: [],
  search: '',
  videoLabelFilters: [],
  moduleFilters: [],
  deletedVideoVisibility: 'hide',
}

const workspaceKey = (planId, courseId) => `${planId}:${courseId}`

const learningUiSlice = createSlice({
  name: 'learningUi',
  initialState: {
    currentLocation: {
      planId: 'all',
      courseId: 'all',
      moduleId: null,
      videoId: null,
    },
    plansPage: DEFAULT_PLANS_PAGE_STATE,
    planPages: {},
    workspaces: {},
  },
  reducers: {
    rememberLearningLocation: (state, action) => {
      state.currentLocation = {
        ...state.currentLocation,
        ...action.payload,
      }
    },
    updatePlansPage: (state, action) => {
      Object.assign(state.plansPage, action.payload)
    },
    updatePlanPage: (state, action) => {
      const { planId, changes } = action.payload
      state.planPages[planId] = {
        ...DEFAULT_PLAN_PAGE_STATE,
        ...state.planPages[planId],
        ...changes,
      }
    },
    updateWorkspace: (state, action) => {
      const { planId, courseId, changes } = action.payload
      const key = workspaceKey(planId, courseId)
      state.workspaces[key] = {
        ...DEFAULT_WORKSPACE_STATE,
        ...state.workspaces[key],
        ...changes,
      }
    },
  },
})

export const {
  rememberLearningLocation,
  updatePlansPage,
  updatePlanPage,
  updateWorkspace,
} = learningUiSlice.actions

export const selectPlanPageState = (state, planId) => state.learningUi.planPages[planId] || DEFAULT_PLAN_PAGE_STATE
export const selectWorkspaceState = (state, planId, courseId) => (
  state.learningUi.workspaces[workspaceKey(planId, courseId)] || DEFAULT_WORKSPACE_STATE
)

export default learningUiSlice.reducer
