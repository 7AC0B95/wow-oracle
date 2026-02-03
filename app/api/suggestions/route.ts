import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const era = searchParams.get('era') || 'General';

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey === "your_api_key_here") {
            return NextResponse.json(
                { error: "Gemini API key not configured" },
                { status: 500 }
            );
        }

        const ai = new GoogleGenAI({ apiKey });

        const model = "gemini-3-flash-preview";
        const prompt = `Generate 4 short, diverse, and interesting questions or topics a user might ask a World of Warcraft expert AI specifically about the "${era}" era/expansion.
        Cover relevant content for this specific era (Lore, Gear, Raids, Gold Farming, PVP).
        Keep them concise (under 10 words).
        Return ONLY a raw JSON array of strings, e.g. ["Question 1", "Question 2", "Question 3", "Question 4"]`;

        const response = await ai.models.generateContent({
            model: model,
            contents: [{
                role: "user",
                parts: [{ text: prompt }]
            }],
        });

        const text = response.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            throw new Error("No response from AI");
        }

        // Clean up markdown code blocks if present
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const suggestions = JSON.parse(jsonStr);

        // Ensure we strictly have 4 strings
        if (!Array.isArray(suggestions) || suggestions.length === 0) {
            throw new Error("Invalid format");
        }

        return NextResponse.json({ suggestions: suggestions.slice(0, 4) });

    } catch (error) {
        console.error("Suggestion API error:", error);
        // Fallback suggestions
        return NextResponse.json({
            suggestions: [
                "Best gold farming spot?",
                "Explain the lore",
                "Best leveling route?",
                "BiS trinkets guide"
            ]
        });
    }
}
