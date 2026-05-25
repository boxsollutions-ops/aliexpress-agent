/**
 * Web Search Utility - uses web_search tool via API
 */

export interface SearchResult {
  organic_results?: Array<{
    title?: string;
    link?: string;
    snippet?: string;
  }>;
}

export async function search(query: string): Promise<SearchResult> {
  try {
    // Call the web_search through the API
    const response = await fetch("https://api.bflow.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, num: 10 }),
    });

    if (!response.ok) {
      return { organic_results: [] };
    }

    return (await response.json()) as SearchResult;
  } catch {
    return { organic_results: [] };
  }
}
