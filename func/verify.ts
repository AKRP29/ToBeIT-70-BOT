import { SlashCommandBuilder, ChatInputCommandInteraction, ButtonInteraction, EmbedBuilder, MessageFlags, AttachmentBuilder } from 'discord.js';
import { getUserByDiscordId } from '../api/get-discord';
import type { PersonalDataResponse } from '../api/interface';

export const VERIFIED_ROLE_ID = process.env.VERIFIED_ROLE_ID!;
export const VERIFY_BUTTON_ID = 'verify';

export const data = new SlashCommandBuilder()
    .setName("verify")
    .setDescription("ยืนยันตัวตน");

export async function execute(interaction: ChatInputCommandInteraction) {
    await runVerify(interaction);
}

export async function handleButton(interaction: ButtonInteraction) {
    await runVerify(interaction);
}

async function runVerify(interaction: ChatInputCommandInteraction | ButtonInteraction) {
    const discord_id = interaction.user.id;
    const member = await interaction.guild?.members.fetch(discord_id);

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (member?.roles.cache.has(VERIFIED_ROLE_ID)) {
        await interaction.editReply({ content: "คุณได้ยืนยันตัวตนไปแล้ว" });
        return;
    }

    const user = await getUserByDiscordId(discord_id) as PersonalDataResponse;
    if (!user) {
        await interaction.editReply({ content: "คุณไม่มีสิทธิ์ใช้งานคำสั่งนี้ เนื่องจากไม่มีชื่อในระบบ ❌ น้องๆได้เชื่อม Discord เดียวกับในเว็บหรือเปล่าเอ่ย" });
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
        .setThumbnail(interaction.user.displayAvatarURL())
        .setTimestamp()
        .setFooter({ text: 'ระบบยืนยันตัวตน', iconURL: 'attachment://ryouu.jpg' });

    await interaction.editReply({ embeds: [successEmbed], files: [footerIcon] });
}
