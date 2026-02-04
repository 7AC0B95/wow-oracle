interface ItemCache {
    [key: string]: string; // key "Era:Name" -> value "URL"
}

const cache: ItemCache = {};

export async function resolveWowheadLink(itemName: string, era: string): Promise<string> {
    let cleanName = itemName.trim();
    let forcedType: string | null = null;

    // Check for type prefix like {{spell:Shadow Mastery}}
    if (cleanName.includes(':')) {
        const parts = cleanName.split(':');
        const typeHint = parts[0].toLowerCase();
        if (['item', 'spell', 'quest', 'npc', 'object', 'achievement'].includes(typeHint)) {
            forcedType = typeHint;
            cleanName = parts.slice(1).join(':').trim();
        }
    }

    const cacheKey = `${era}:${forcedType || ''}:${cleanName.toLowerCase()}`;

    // 1. Check Cache
    if (cache[cacheKey]) {
        console.log(`[Resolver] Cache hit for "${forcedType ? forcedType + ':' : ''}${cleanName}"`);
        return cache[cacheKey];
    }

    // Determine subdomain
    let subdomain = 'classic';
    if (era === 'Retail') subdomain = 'www';
    else if (era === 'TBC') subdomain = 'tbc';
    else if (era === 'WotLK') subdomain = 'wotlk';
    else if (era === 'Anniversary') subdomain = 'classic';

    const baseUrl = `https://${subdomain}.wowhead.com`;
    const apiUrl = `${baseUrl}/search/suggestions-template?q=${encodeURIComponent(cleanName)}`;

    console.log(`[Resolver] Fetching API (Hint: ${forcedType || 'none'}): ${apiUrl}`);

    try {
        const response = await fetch(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        const results = data.results || [];

        // Map internal Wowhead types to our slugs
        const typeMap: Record<number, string> = {
            3: 'item',
            6: 'spell',
            5: 'quest',
            1: 'npc',
            2: 'object',
            10: 'achievement'
        };

        let bestMatch = null;

        if (results.length > 0) {
            if (forcedType) {
                // Find first result matching the forced type
                bestMatch = results.find((r: any) => typeMap[r.type] === forcedType);
            } else {
                // 1. Prioritize exact name match
                const exactMatches = results.filter((r: any) => r.name.toLowerCase() === cleanName.toLowerCase());

                if (exactMatches.length > 0) {
                    // If multiple exact matches, prioritize Item > Spell > Quest
                    const priorities = ['item', 'spell', 'quest', 'npc', 'object'];
                    bestMatch = exactMatches.sort((a: any, b: any) => {
                        const pA = priorities.indexOf(typeMap[a.type] || '');
                        const pB = priorities.indexOf(typeMap[b.type] || '');
                        return (pA === -1 ? 99 : pA) - (pB === -1 ? 99 : pB);
                    })[0];
                } else {
                    // 2. Just take the first result (usually highest relevance)
                    bestMatch = results[0];
                }
            }
        }

        if (bestMatch && bestMatch.id) {
            const typeSlug = typeMap[bestMatch.type] || 'item';
            const resultUrl = `${baseUrl}/${typeSlug}=${bestMatch.id}`;
            console.log(`[Resolver] SUCCESS - Found ${typeSlug} ID ${bestMatch.id}: ${resultUrl}`);
            cache[cacheKey] = resultUrl;
            return resultUrl;
        }

        // Fallback to search
        console.warn(`[Resolver] FALLBACK - No direct match for "${cleanName}"`);
        const searchUrl = `${baseUrl}/search?q=${encodeURIComponent(cleanName)}`;
        cache[cacheKey] = searchUrl;
        return searchUrl;

    } catch (error) {
        console.error(`[Resolver] ERROR for "${cleanName}":`, error);
        return `https://${subdomain}.wowhead.com/search?q=${encodeURIComponent(cleanName)}`;
    }
}
