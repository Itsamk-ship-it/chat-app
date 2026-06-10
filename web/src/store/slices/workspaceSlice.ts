import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Org } from '@/lib/types';

interface WorkspaceState {
  orgs: Org[];
  org: Org | null;
  pendingJoinCode: string | null;
}

const initialState: WorkspaceState = {
  orgs: [],
  org: null,
  pendingJoinCode: null,
};

const workspaceSlice = createSlice({
  name: 'workspace',
  initialState,
  reducers: {
    setOrgs(state, action: PayloadAction<Org[]>) {
      state.orgs = action.payload;
    },
    addOrg(state, action: PayloadAction<Org>) {
      state.orgs.push(action.payload);
    },
    setOrg(state, action: PayloadAction<Org>) {
      state.org = action.payload;
    },
    setPendingCode(state, action: PayloadAction<string | null>) {
      state.pendingJoinCode = action.payload;
    },
  },
});

export const { setOrgs, addOrg, setOrg, setPendingCode } = workspaceSlice.actions;
export default workspaceSlice.reducer;
