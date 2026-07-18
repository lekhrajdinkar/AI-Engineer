import { configureStore } from '@reduxjs/toolkit'
import plansReducer from './plansSlice'
import sourcesReducer from './sourcesSlice'

export const store = configureStore({
  reducer: {
    plans: plansReducer,
    sources: sourcesReducer,
  },
})
