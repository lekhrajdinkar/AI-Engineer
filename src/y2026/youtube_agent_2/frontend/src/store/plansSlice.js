import { createSlice } from '@reduxjs/toolkit'

const plansSlice = createSlice({
  name: 'plans',
  initialState: {
    items: [],
    selectedId: null,
  },
  reducers: {
    setPlans: (state, action) => {
      state.items = action.payload
    },
    addPlan: (state, action) => {
      state.items.push(action.payload)
    },
    updatePlan: (state, action) => {
      state.items = state.items.map(p => p.id === action.payload.id ? action.payload : p)
    },
    deletePlan: (state, action) => {
      state.items = state.items.filter(p => p.id !== action.payload)
      if (state.selectedId === action.payload) state.selectedId = null
    },
    selectPlan: (state, action) => {
      state.selectedId = action.payload
    },
    clearSelection: (state) => {
      state.selectedId = null
    },
  },
})

export const { setPlans, addPlan, updatePlan, deletePlan, selectPlan, clearSelection } = plansSlice.actions
export default plansSlice.reducer