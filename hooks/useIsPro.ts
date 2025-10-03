import { useProStatus } from "./useProStatus";

/**
 * Simple boolean hook to check if user is Pro
 * @param userId - Firebase user ID
 * @returns boolean (true if Pro, false if Free/loading/error)
 */
export function useIsPro(userId?: string): boolean {
  const status = useProStatus(userId);
  return status === "pro";
}