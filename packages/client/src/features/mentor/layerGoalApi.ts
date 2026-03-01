import { apiClient } from '../../services/apiClient';
import { auth } from '../../config/firebase';

// Helper function for auth headers (same as in mentorApi)
const withAuthHeaders = async (): Promise<HeadersInit> => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('User is not authenticated');
  }
  const token = await currentUser.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
  };
};

/**
 * Update layer goal in knowledge graph
 */
export async function updateLayerGoal(
  graphId: string,
  layerNumber: number,
  goal: string
): Promise<{ success: boolean; goal: string }> {
  const headers = await withAuthHeaders();
  return apiClient.fetch(`/api/knowledge-graphs/${graphId}/layers/${layerNumber}/goal`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ goal }),
  });
}

