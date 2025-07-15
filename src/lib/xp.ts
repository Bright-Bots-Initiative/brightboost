
interface XPGrantResult {
  success: boolean;
  message: string;
  xpAwarded?: number;
}

const sessionXPGrants = new Set<string>();

export const grantXp = async (action: string): Promise<boolean> => {
  try {
    if (sessionXPGrants.has(action)) {
      console.log(`XP already granted for action: ${action} in this session`);
      return false;
    }

    const mockApiCall = new Promise<XPGrantResult>((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          message: `XP awarded for ${action}`,
          xpAwarded: 10
        });
      }, 100);
    });

    const result = await mockApiCall;
    
    if (result.success) {
      sessionXPGrants.add(action);
      
      const sessionKey = `xp_granted_${action}_${Date.now()}`;
      localStorage.setItem(sessionKey, 'true');
      
      console.log(`XP granted successfully for action: ${action}`, result);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error granting XP:', error);
    return false;
  }
};

export const wasXpGrantedInSession = (action: string): boolean => {
  return sessionXPGrants.has(action);
};

export const clearSessionXpGrants = (): void => {
  sessionXPGrants.clear();
};
