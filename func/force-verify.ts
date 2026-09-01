import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits, MessageFlags, AttachmentBuilder } from 'discord.js';
import { getUserByDiscordId } from '../api/get-discord';
import type { PersonalDataResponse } from '../api/interface';
import { VERIFIED_ROLE_ID } from './verify';

export const data = new SlashCommandBuilder()
    .setName("force-verify")
    .setDescription("ยืนยันตัวตนแทนสมาชิก")
    .addUserOption((option) =>
        option.setName("user").setDescription("ผู้ใช้งาน").setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

export async function execute(interaction: ChatInputCommandInteraction) {
    const discord_id = interaction.options.getUser("user", true).id;
    const member = await interaction.guild?.members.fetch(discord_id);

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const user = await getUserByDiscordId(discord_id) as PersonalDataResponse;
    if (!user) {
        await interaction.editReply({ content: "สมาชิกคนนี้ไม่มีชื่อในระบบ ❌ (ยังไม่ได้เชื่อม Discord กับเว็บ)" });
        return;
    }

    const role = await interaction.guild?.roles.fetch(VERIFIED_ROLE_ID);
    if (role && member) {
        try {
            await member.roles.add(role);
        } catch (error) {
            console.error('Role add error:', error);
            await interaction.editReply({ content: "บอทเพิ่มยศให้ไม่ได้ — เช็คว่า bot มีสิทธิ์ Manage Roles และ role ของบอทอยู่เหนือยศที่จะให้" });
            return;
        }

        let regionDisplay = user.region;
        if (user.region === 'ภาคตะวันออกเฉียงเหนือ') {
            regionDisplay = 'ภาคอีสาน';
        } else if (user.region === 'กรุงเทพและปริมณฑล') {
            regionDisplay = 'กรุงเทพ';
        }
        try {
            await member.setNickname(`น้อง ${user.nickName} ${user.grade} ${regionDisplay}`);
        } catch (error) {
            console.warn('Nickname set skipped (owner or role hierarchy):', (error as Error).message);
        }
    }

    const footerIcon = new AttachmentBuilder('./assets/ryouu.jpg', { name: 'ryouu.jpg' });

    const successEmbed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('✅ ยืนยันตัวตนสำเร็จแล้ว')
        .setDescription([
            `> 💳 **น้อง :** ${user.nickName}`,
            `> 👤 **ชื่อในระบบ :** ${user.firstName}`,
            `> 🎓 **ระดับชั้น :** ${user.grade}`,
            `> 🏷️ **ภาค :** ${user.region}`,
            `> 🎺 **ได้รับยศ :** <@&${VERIFIED_ROLE_ID}>`
        ].join('\n'))
        .setThumbnail(member?.user.displayAvatarURL() || null)
        .setTimestamp()
        .setFooter({ text: 'ระบบยืนยันตัวตน', iconURL: 'attachment://ryouu.jpg' });

    await interaction.editReply({ embeds: [successEmbed], files: [footerIcon] });
}
