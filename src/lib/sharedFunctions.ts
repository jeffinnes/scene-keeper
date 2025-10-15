/**
 * A wrapper around fetch that handles rate limiting (HTTP 429) by retrying the request
 * after the specified retry_after duration. It will retry up to maxRetries times before
 * giving up and returning the 429 response.
 */
async function rateLimitedFetch(
  url: string,
  options?: RequestInit,
  maxRetries: number = 3
): Promise<Response> {
  let retryCount = 0;

  while (retryCount <= maxRetries) {
    const response = await fetch(url, options);

    // If not rate limited, return the response
    if (response.status !== 429) {
      return response;
    }

    // If we've hit the max retries, return the 429 response
    if (retryCount >= maxRetries) {
      console.error(`Max retries (${maxRetries}) exceeded for ${url}`);
      return response;
    }

    // Handle rate limiting
    let retryAfter = 1; // Default to 1 second if not specified

    try {
      // Check for retry_after in response headers first (Discord standard)
      const retryAfterHeader = response.headers.get('retry-after');
      if (retryAfterHeader) {
        retryAfter = parseInt(retryAfterHeader, 10);
      } else {
        // Check response body for retry_after value
        const responseBody = await response.text();
        try {
          const bodyJson = JSON.parse(responseBody);
          if (bodyJson.retry_after) {
            retryAfter = bodyJson.retry_after;
          }
        } catch {
          // If parsing fails, use default retry time
        }
      }
    } catch (error) {
      console.warn('Failed to parse retry_after, using default delay:', error);
    }

    console.log(
      `Rate limited (429). Retrying in ${retryAfter} seconds... (attempt ${retryCount + 1}/${maxRetries + 1})`
    );

    // Wait for the retry_after duration (convert to milliseconds)
    await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));

    retryCount++;
  }

  // This should never be reached due to the logic above, but TypeScript needs it
  throw new Error('Unexpected error in rateLimitedFetch');
}

export { rateLimitedFetch };
