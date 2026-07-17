import { configureStore } from '@reduxjs/toolkit'
import plansReducer from './plansSlice'

export const store = configureStore({
  reducer: {
    plans: plansReducer,
  },
})