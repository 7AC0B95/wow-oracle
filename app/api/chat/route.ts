import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { resolveWowheadLink } from "@/lib/wowhead";


const SYSTEM_PROMPT = `You are a kind and helpful personality World of Warcraft expert assistant.You have deep knowledge of all WoW versions: Anniversary TBC pre - patch realms, Classic(Vanilla), The Burning Crusade(TBC), Wrath of the Lich King(WotLK), and Retail.

Your personality:
- Speak with friendly tone
    - Be helpful but concise. NO FLUFF.
    - Do NOT provide greetings (e.g., "Greetings hero", "Hello"). Just answer the question directly.
        - Use WoW terminology naturally, but expand on it if needed to make it understandable for a beginner
            - When relevant, mention specific items, quests, dungeons, raids, or strategies
                - If asked about an era, focus your answer on that specific expansion's content

IMPORTANT - Item Linking:
When mentioning items, spells, quests, or NPCs, do NOT create the Markdown link yourself.
Instead, simply wrap the exact name in double curly braces.
If there's ambiguity (e.g., a talent and an item share a name), you can provide a hint like:
- {{spell:Shadow Mastery}} for the talent
- {{item:The Unstoppable Force}} for the weapon
- {{quest:The Missing Diplomat}} for a quest
- {{npc:Thrall}} for an NPC

Supported hints: item, spell, quest, npc, object, achievement.
The system will automatically convert these into correct Wowhead links for you.

                CRITICAL - Item Categorization & Accuracy:
You have a high error rate with item slots.You MUST correct this.
Before listing ANY item under a specific gear slot, verification is MANDATORY:
- Do NOT list a Wrist / Bracer item under "Shoulders".
- Do NOT list a Back / Cloak item under "Neck".
- Do NOT list a Chest item under "Rings".
- Do NOT list a Wrist item under "Back".
- Do NOT list a Shield / Off - hand under "Head".

If an item does not STRICTLY match the category header, find another item.It is better to list a slightly lower tier item in the CORRECT slot than a BiS item in the WRONG slot.

Always provide accurate, helpful information about:
- Character builds, talents, and gear(BiS lists)
    - Quest guides and attunements
        - Dungeon and raid strategies
            - Gold farming methods
                - Professions and crafting
                    - PvP tips and arena compositions
                        - Lore and story

If you don't know something specific, admit it and make it clear rather than making up information.

At the very end of your response, you MUST provide 3 short, relevant follow - up questions or suggestions for the user to ask next.
Format these strictly as a JSON block separated by a delimiter "---SUGGESTIONS---".
    Example:
[Your normal response here...]
--- SUGGESTIONS-- -
    ["Where can I farm that?", "What stats should I prioritize?", "Show me the talent build"]
        `;

export async function POST(request: NextRequest) {
    try {
        const { message, era, history } = await request.json();

        if (!message) {
            return NextResponse.json(
                { error: "Message is required" },
                { status: 400 }
            );
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey === "your_api_key_here") {
            return NextResponse.json(
                { error: "Gemini API key not configured. Add your key to .env.local" },
                { status: 500 }
            );
        }

        const ai = new GoogleGenAI({ apiKey });

        // Build conversation history for context
        const conversationHistory = history?.map((msg: { role: string; content: string }) => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }],
        })) || [];

        // Add era context to the user message
        const contextualMessage = `[Current Era: ${era}]\n\nUser Question: ${message} `;

        // Use the chat method for better conversation handling
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [
                {
                    role: "user",
                    parts: [{ text: SYSTEM_PROMPT }],
                },
                {
                    role: "model",
                    parts: [{ text: "I understand. I am the Oracle, ready to share my wisdom about Azeroth across all eras. How may I assist you?" }],
                },
                ...conversationHistory,
                {
                    role: "user",
                    parts: [{ text: contextualMessage }],
                },
            ],
        });

        let text = response.candidates?.[0]?.content?.parts?.[0]?.text || "The Oracle is silent.";

        // --- Dynamic Link Resolution ---
        // 1. Find all matches ({{Item Name}})
        const regex = /\{\{(.*?)\}\}/g;
        const matches = [...text.matchAll(regex)];

        if (matches.length > 0) {
            // 2. Resolve them all in parallel
            // We use a Map to handle duplicates efficiently
            const uniqueNames = new Set(matches.map(m => m[1]));
            const resolutions = new Map<string, string>();

            await Promise.all(
                Array.from(uniqueNames).map(async (name) => {
                    const url = await resolveWowheadLink(name, era);
                    resolutions.set(name, url);
                })
            );

            // 3. Replace in text
            text = text.replace(regex, (match, itemName) => {
                const url = resolutions.get(itemName) || `https://www.wowhead.com/search?q=${encodeURIComponent(itemName)}`;
                // Hide the type prefix (e.g., "spell:Shadow Mastery" -> "Shadow Mastery")
                const displayName = itemName.includes(':') ? itemName.split(':').slice(1).join(':').trim() : itemName;
                return `[${displayName}](${url})`;
            });
        }

        return NextResponse.json({ message: text });

    } catch (error) {
        console.error("Gemini API error:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json(
            { error: `Failed to get response from the Oracle: ${errorMessage} ` },
            { status: 500 }
        );
    }
}
