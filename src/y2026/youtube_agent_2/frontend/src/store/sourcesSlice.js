import { createSlice } from '@reduxjs/toolkit'

const sourcesSlice = createSlice({
  name: 'sources',
  initialState: {
    subscribedChannels: null,
    playlistsByChannel: {},
    syncMetadata: { channels: [], updated_at: null },
  },
  reducers: {
    setSubscribedChannels: (state, action) => {
      state.subscribedChannels = action.payload
    },
    setChannelPlaylists: (state, action) => {
      state.playlistsByChannel[action.payload.channelId] = action.payload.playlists
    },
    setSourceSyncMetadata: (state, action) => {
      state.syncMetadata = action.payload || { channels: [], updated_at: null }
    },
  },
})

export const { setSubscribedChannels, setChannelPlaylists, setSourceSyncMetadata } = sourcesSlice.actions
export default sourcesSlice.reducer
