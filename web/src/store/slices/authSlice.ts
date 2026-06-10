import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { User, AppScreen } from '@/lib/types';

interface AuthState {
  screen: AppScreen;
  token: string | null;
  user: User | null;
}

const initialState: AuthState = {
  screen: 'loading',
  token: null,
  user: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setScreen(state, action: PayloadAction<AppScreen>) {
      state.screen = action.payload;
    },
    setAuth(state, action: PayloadAction<{ token: string; user: User }>) {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.screen = 'loading';
    },
    noSession(state) {
      state.screen = 'auth';
    },
    logout(state) {
      state.screen = 'auth';
      state.token = null;
      state.user = null;
    },
  },
});

export const { setScreen, setAuth, noSession, logout } = authSlice.actions;
export default authSlice.reducer;
