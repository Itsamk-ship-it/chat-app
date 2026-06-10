import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import workspaceReducer from './slices/workspaceSlice';
import channelsReducer from './slices/channelsSlice';
import messagesReducer from './slices/messagesSlice';
import dmsReducer from './slices/dmsSlice';
import uiReducer from './slices/uiSlice';
import notificationsReducer from './slices/notificationsSlice';
import contentReducer from './slices/contentSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    workspace: workspaceReducer,
    channels: channelsReducer,
    messages: messagesReducer,
    dms: dmsReducer,
    ui: uiReducer,
    notifications: notificationsReducer,
    content: contentReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
