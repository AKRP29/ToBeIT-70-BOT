import type { PersonalDataResponse } from "./interface.ts";

export async function getUserByDiscordId(discordId: string) {
    if (process.env.MOCK_VERIFY === "true") {
        console.log(`[MOCK] verify user ${discordId}`);
        return {
            nickName: "ทดสอบ",
            firstName: "เด็กทดสอบ ระบบ",
            grade: "ม.5",
            region: "กรุงเทพและปริมณฑล",
        } as PersonalDataResponse;
    }

    const response = await fetch(`${process.env.API_URL}/api/discord/get-user?discord_id=${discordId}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.API_KEY}`,
        },
    });
    const data = await response.json() as PersonalDataResponse | { error: string };
    if (!data || (data as { error: string }).error) {
        return null;
    }

    return data;
}