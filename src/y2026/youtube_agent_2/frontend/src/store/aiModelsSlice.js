import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { getAiModelConfigs, getAiModelProviders } from '../api/client'

export const loadAiModels = createAsyncThunk('aiModels/load', async () => {
  const [configResponse, providerResponse] = await Promise.all([
    getAiModelConfigs(),
    getAiModelProviders(),
  ])
  return {
    items: configResponse.items || [],
    providers: providerResponse.items || [],
  }
})

const aiModelsSlice = createSlice({
  name: 'aiModels',
  initialState: {
    items: [],
    providers: [],
    status: 'idle',
    error: null,
  },
  reducers: {
    updateAiModelInStore: (state, action) => {
      const index = state.items.findIndex(item => item.id === action.payload.id)
      if (index >= 0) state.items[index] = action.payload
      else state.items.push(action.payload)
    },
  },
  extraReducers: builder => {
    builder
      .addCase(loadAiModels.pending, state => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(loadAiModels.fulfilled, (state, action) => {
        state.status = 'ready'
        state.items = action.payload.items
        state.providers = action.payload.providers
      })
      .addCase(loadAiModels.rejected, (state, action) => {
        state.status = 'error'
        state.error = action.error.message || 'Unable to load AI models'
      })
  },
})

export const { updateAiModelInStore } = aiModelsSlice.actions
export default aiModelsSlice.reducer
