import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { getUserByDiscordId } from '../api/get-discord';
import type { PersonalDataResponse } from '../api/interface';
export const data = new SlashCommandBuilder()
    .setName("fix-names")
    .setDescription("แก้ไขชื่อ")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);
    
export async function execute(interaction: ChatInputCommandInteraction) {

    // AS OF 18/09/2025, THIS FUNCTION IS FOR FIXING THE NAMES OF THE MEMBERS THAT ARE NOT CORRECT (FIRSTNAME -> NICKNAME)
    await interaction.deferReply({ ephemeral: false });
    const onlineCampers = await interaction.guild?.members.fetch({
        limit: 1000
    });

    const membersToFix = onlineCampers?.filter((member) => member.displayName.startsWith('น้อง') && member.roles.cache.has('1416465814692823220'));
    if (!membersToFix) {
        await interaction.editReply({ content: "ไม่พบสมาชิกที่ต้องแก้ไข" });
        return;
    }
    
    await Promise.all(
        Array.from(membersToFix).map(async ([_, member]) => {
            // Get the user from the database
            const user = await getUserByDiscordId(member.id) as PersonalDataResponse;
            if (!user) {
                console.log("NOT FOUND USER:", member.id);
            }

            // Check if the [1] index of the name is firstName not nickname
            if (user.firstName !== member.displayName.split(' ')[1]) {
                console.log("NOT CHANGE.")
            } else {
                // Fix the name
                let regionDisplay = user.region;
                if (user.region === 'ภาคตะวันออกเฉียงเหนือ') {
                    regionDisplay = 'ภาคอีสาน';
                } else if (user.region === 'กรุงเทพและปริมณฑล') {
                    regionDisplay = 'กรุงเทพ';
                }
                console.log("CHANGE NAME FOR:", user.firstName, member.displayName.split(' ')[1]);
                console.log(`น้อง ${user.nickName} ${user.grade} ${regionDisplay}`);
                await member.setNickname(`น้อง ${user.nickName} ${user.grade} ${regionDisplay}`);
            }
        })
    );

    const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('✅ แก้ไขชื่อสำเร็จแล้ว')
        .setDescription(`แก้ไขชื่อของสมาชิก ${membersToFix.size} คน:\n\n${Array.from(membersToFix).map(name => `• ${name}`).join('\n')}`)
        .setTimestamp()
        .setFooter({
            text: '🔧 fix names system'
        });

    await interaction.editReply({ embeds: [embed] });
}
