import { combineReducers } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import conceptsReducer from '../features/concepts/conceptSlice';
import knowledgeGraphsReducer from '../features/knowledge-graph/knowledgeGraphSlice';
import { graphOperationReducer } from '../features/knowledge-graph/redux';

const rootReducer = combineReducers({
  auth: authReducer,
  concepts: conceptsReducer,
  knowledgeGraphs: knowledgeGraphsReducer,
  graphOperations: graphOperationReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
export default rootReducer;
