import { saveRepoChunks } from "../github/vector.js";
import { searchPrContext } from "../github/vector.js";
export function buildFeatureRequestNamespace(requestId: number) {
  return `feature-request--${requestId}`;
}
export async function indexFeatureRequestText(
  requestId: number,
  id: string,
  text: string,
  kind: string,
) {
  if (!text.trim()) return;
  await saveRepoChunks(buildFeatureRequestNamespace(requestId), [{ id, text, filePath: kind }]);
}
export { searchPrContext };
