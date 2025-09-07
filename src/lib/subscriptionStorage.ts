// Keys used for local storage
const KEYS = {
  JUST_PAID: "justPaid",
  SUBSCRIPTION_STATE: "subscriptionState",
} as const;

export type StoredSubscriptionState = {
  plan: string;
  status: string;
  updatedAt: string;
};

/**
 * Set the just-paid flag after successful payment
 */
export function setJustPaid() {
  try {
    localStorage.setItem(KEYS.JUST_PAID, "true");
    // Clear the flag after 5 minutes if webhook hasn't processed
    setTimeout(() => clearJustPaid(), 5 * 60 * 1000);
  } catch (error) {
    console.warn("Failed to set just-paid flag:", error);
  }
}

/**
 * Clear the just-paid flag
 */
export function clearJustPaid() {
  try {
    localStorage.removeItem(KEYS.JUST_PAID);
  } catch (error) {
    console.warn("Failed to clear just-paid flag:", error);
  }
}

/**
 * Check if user has just paid
 */
export function hasJustPaid(): boolean {
  try {
    return localStorage.getItem(KEYS.JUST_PAID) === "true";
  } catch (error) {
    console.warn("Failed to read just-paid flag:", error);
    return false;
  }
}

/**
 * Store subscription state for faster initial load
 */
export function storeSubscriptionState(state: StoredSubscriptionState) {
  try {
    localStorage.setItem(KEYS.SUBSCRIPTION_STATE, JSON.stringify(state));
  } catch (error) {
    console.warn("Failed to store subscription state:", error);
  }
}

/**
 * Get stored subscription state
 */
export function getStoredSubscriptionState(): StoredSubscriptionState | null {
  try {
    const stored = localStorage.getItem(KEYS.SUBSCRIPTION_STATE);
    if (!stored) return null;
    
    const state = JSON.parse(stored) as StoredSubscriptionState;
    const stateAge = Date.now() - new Date(state.updatedAt).getTime();
    
    // Only return stored state if it's less than 1 hour old
    if (stateAge > 60 * 60 * 1000) {
      localStorage.removeItem(KEYS.SUBSCRIPTION_STATE);
      return null;
    }
    
    return state;
  } catch (error) {
    console.warn("Failed to read subscription state:", error);
    return null;
  }
}

/**
 * Clear all subscription-related storage
 */
export function clearSubscriptionStorage() {
  try {
    localStorage.removeItem(KEYS.JUST_PAID);
    localStorage.removeItem(KEYS.SUBSCRIPTION_STATE);
  } catch (error) {
    console.warn("Failed to clear subscription storage:", error);
  }
}
