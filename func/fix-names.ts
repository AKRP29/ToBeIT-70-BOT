import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { getUserByDiscordId } from '../api/get-discord';
import type { PersonalDataResponse } from '../api/interface';
import { VERIFIED_ROLE_ID } from './verify';

export const data = new SlashCommandBuilder()
    .setName("fix-names")
    .setDescription("แก้ไขชื่อสมาชิกที่ผิด (firstName -> nickName)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

export async function execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const onlineCampers = await interaction.guild?.members.fetch({ limit: 1000 });
    const membersToFix = onlineCampers?.filter(
        (member) => member.displayName.startsWith('น้อง') && member.roles.cache.has(VERIFIED_ROLE_ID)
    );

    if (!membersToFix || membersToFix.size === 0) {
        await interaction.editReply({ content: "ไม่พบสมาชิกที่ต้องแก้ไข" });
        return;
    }

    const fixed: string[] = [];

    await Promise.all(
        Array.from(membersToFix.values()).map(async (member) => {
            const user = await getUserByDiscordId(member.id) as PersonalDataResponse | null;
            if (!user) {
                console.log("NOT FOUND USER:", member.id);
                return;
            }

            // Only fix names where index [1] is the firstName instead of the nickName
            if (user.firstName !== member.displayName.split(' ')[1]) {
                return;
            }

            let regionDisplay = user.region;
            if (user.region === 'ภาคตะวันออกเฉียงเหนือ') {
                regionDisplay = 'ภาคอีสาน';
            } else if (user.region === 'กรุงเทพและปริมณฑล') {
                regionDisplay = 'กรุงเทพ';
            }

            const newName = `น้อง ${user.nickName} ${user.grade} ${regionDisplay}`;
            try {
                await member.setNickname(newName);
                fixed.push(newName);
            } catch (error) {
                console.warn(`Nickname set skipped for ${member.id}:`, (error as Error).message);
            }
        })
    );

    const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('✅ แก้ไขชื่อสำเร็จแล้ว')
        .setDescription(
            fixed.length === 0
                ? "ไม่มีชื่อที่ต้องแก้"
                : `แก้ไขชื่อ ${fixed.length} คน:\n\n${fixed.map((n) => `• ${n}`).join('\n')}`
        )
        .setTimestamp()
        .setFooter({ text: 'ระบบแก้ไขชื่อ' });

    await interaction.editReply({ embeds: [embed] });
}
