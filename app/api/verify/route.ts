import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const VERIFY_PROMPT = `You are a World of Warcraft Fact-Checker. 
Your ONLY job is to verify the accuracy of the provided game information, specifically checking for:
1. Item Slot Mismatches: (Critical) Did the previous output list an item in the wrong equipment slot? (e.g., a Neck item listed under Chest, or Bracers under Shoulders).
2. Era Accuracy: Is the item/quest/spell actually available in the specified Era?
3. Hallucinations: Does the item or mechanic actually exist?

Analyze the provided text.
If there are errors, point them out clearly and concisely.
If the information is relevantly accurate/correct, say "Verified: Information appears accurate."

Format your response as:
- **Status**: [ACCURATE / CONTAINS ERRORS]
- **Correction**: [If errors found, explain them here. e.g. "Item X is a Neck, not a Chest piece."]
`;

export async function POST(request: NextRequest) {
    try {
        const { message, era } = await request.json();

        if (!message) {
            return NextResponse.json(
                { error: "Message content is required" },
                { status: 400 }
            );
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey === "your_api_key_here") {
            return NextResponse.json(
                { error: "Gemini API key not configured" },
                { status: 500 }
            );
        }

        const ai = new GoogleGenAI({ apiKey });
        const model = "gemini-3-flash-preview"; // Using flash as requested for speed/cost

        const response = await ai.models.generateContent({
            model: model,
            contents: [
                {
                    role: "user",
                    parts: [{ text: `${VERIFY_PROMPT}\n\n[Context Era: ${era}]\n\nText to Verify:\n${message}` }]
                }
            ],
        });

        const comparison = response.candidates?.[0]?.content?.parts?.[0]?.text || "Could not verify.";

        return NextResponse.json({ verification: comparison });

    } catch (error) {
        console.error("Verification API error:", error);
        return NextResponse.json(
            { error: "Failed to verify message" },
            { status: 500 }
        );
    }
}
