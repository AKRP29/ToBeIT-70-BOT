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

    try {
        const response = await fetch(
            `${process.env.API_URL}/api/discord/students/verify?discordId=${discordId}&token=${process.env.API_KEY}`,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
                signal: AbortSignal.timeout(10000),
            },
        );
        if (!response.ok) {
            console.error(`verify API HTTP ${response.status}`);
            return null;
        }
        const data = await response.json() as { verified: boolean; student: PersonalDataResponse | null };
        if (!data?.verified || !data.student) {
            return null;
        }
        if (data.student.grade?.trim() === "เด็กซิ่ว") {
            data.student.grade = "ม.6";
        }
        return data.student;
    } catch (error) {
        console.error("verify API request failed:", (error as Error).message);
        return null;
    }
}