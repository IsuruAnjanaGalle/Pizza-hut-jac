/**
 * Jac Client API Helper
 * Communicates with Jac Scale / Jaseci walker endpoints.
 */

const JAC_BASE_URL = 'http://localhost:8000';

export interface WalkerResponse<T = any> {
  reports?: T[];
  data?: T;
  error?: string;
  [key: string]: any;
}

/**
 * Reusable helper function to call Jac walkers via HTTP POST.
 *
 * @param walkerName The name of the Jac walker to execute (e.g., 'get_catalog', 'track_order')
 * @param payload Key-value dictionary containing arguments passed to the walker
 * @returns Promise resolving to the parsed JSON response
 */
export async function callWalker<T = any>(
  walkerName: string,
  payload: Record<string, any> = {}
): Promise<WalkerResponse<T>> {
  const url = `${JAC_BASE_URL}/walker/${walkerName}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Walker ${walkerName} failed with HTTP ${response.status}: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`[JacClient] Error calling walker "${walkerName}":`, error);
    throw error;
  }
}

export default callWalker;
