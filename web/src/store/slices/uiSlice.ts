import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { ModalType } from '@/lib/types';

interface UIState {
  modal: ModalType;
}

const initialState: UIState = {
  modal: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setModal(state, action: PayloadAction<ModalType>) {
      state.modal = action.payload;
    },
  },
});

export const { setModal } = uiSlice.actions;
export default uiSlice.reducer;
