import { createSlice } from '@reduxjs/toolkit'

const sourcesSlice = createSlice({
  name: 'sources',
  initialState: {
    subscribedChannels: null,
    playlistsByChannel: {},
  },
  reducers: {
    setSubscribedChannels: (state, action) => {
      state.subscribedChannels = action.payload
    },
    setChannelPlaylists: (state, action) => {
      state.playlistsByChannel[action.payload.channelId] = action.payload.playlists
    },
  },
})

export const { setSubscribedChannels, setChannelPlaylists } = sourcesSlice.actions
export default sourcesSlice.reducer
