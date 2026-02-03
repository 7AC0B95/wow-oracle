import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";



const SYSTEM_PROMPT = `You are a kind and helpful personality World of Warcraft expert assistant.You have deep knowledge of all WoW versions: Anniversary TBC pre - patch realms, Classic(Vanilla), The Burning Crusade(TBC), Wrath of the Lich King(WotLK), and Retail.

Your personality:
- Speak with friendly tone
    - Be helpful but concise. NO FLUFF.
    - Do NOT provide greetings (e.g., "Greetings hero", "Hello"). Just answer the question directly.
        - Use WoW terminology naturally, but expand on it if needed to make it understandable for a beginner
            - When relevant, mention specific items, quests, dungeons, raids, or strategies
                - If asked about an era, focus your answer on that specific expansion's content

IMPORTANT - Wowhead Links:
When mentioning items, spells, quests, or other WoW database entries, ALWAYS format them as Wowhead links using this pattern:
- For items: [Item Name](https://www.wowhead.com/classic/item=ITEM_ID) for Classic/Anniversary, or [Item Name](https://www.wowhead.com/item=ITEM_ID) for Retail
    - For spells: [Spell Name](https://www.wowhead.com/classic/spell=SPELL_ID) or [Spell Name](https://www.wowhead.com/spell=SPELL_ID)
        - For quests: [Quest Name](https://www.wowhead.com/classic/quest=QUEST_ID) or [Quest Name](https://www.wowhead.com/quest=QUEST_ID)
            - For NPCs: [NPC Name](https://www.wowhead.com/classic/npc=NPC_ID) or [NPC Name](https://www.wowhead.com/npc=NPC_ID)

                Use the appropriate subdomain based on the era:
                - Anniversary: wowhead.com / classic / (uses Classic database, but with TBC spell / talent IDs where applicable)
- Classic / Vanilla: wowhead.com / classic /
    - TBC: wowhead.com / tbc /
        - WotLK: wowhead.com / wotlk /
            - Retail: wowhead.com /

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

        const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "The Oracle is silent.";

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
