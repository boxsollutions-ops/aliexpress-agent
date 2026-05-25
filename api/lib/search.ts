/**
 * Web Search Utility
 * Uses web_search tool to find trending products
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
    // Use web_search API
    const response = await fetch("https://api.bing.microsoft.com/v7.0/search?q=" + encodeURIComponent(query), {
      method: "GET",
      headers: {
        "Ocp-Apim-Subscription-Key": process.env.BING_API_KEY ?? "",
      },
    });

    if (!response.ok) {
      return { organic_results: [] };
    }

    const data = (await response.json()) as {
      webPages?: { value?: Array<{ name?: string; url?: string; snippet?: string }> };
    };

    const results = (data.webPages?.value ?? []).map((item) => ({
      title: item.name ?? "",
      link: item.url ?? "",
      snippet: item.snippet ?? "",
    }));

    return { organic_results: results };
  } catch {
    // Fallback: return empty results
    return { organic_results: [] };
  }
}
