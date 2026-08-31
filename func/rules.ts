import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName("rules")
  .setDescription("ดูระเบียบกิจกรรม")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

export async function execute(interaction: ChatInputCommandInteraction) {
  const botAvatarURL = interaction.client.user?.displayAvatarURL();
  const embed = new EmbedBuilder()
    .setColor(0x0099ff)
    .setTitle("⭐️ Policy Chat/Discord/Facebook")
    .setDescription(
      "1. ห้ามเชิญบุคคลภายนอกเข้ากลุ่มโดยไม่ได้รับอนุญาต\n" +
        "2. ห้ามนำข้อมูล หรือเนื้อหาการเรียนการสอนภายในกิจกรรมไปเผยแพร่แก่บุคคลภายนอก\n" +
        "3. ห้ามพิมพ์คำหยาบ หรือถ้อยคำที่แสดงถึงความรุนแรงและก่อให้เกิดความขัดแย้ง\n" +
        "4. ห้ามใช้คำพูดที่ทำให้กระทบกระเทือนจิตใจผู้ฟัง\n" +
        "5. ห้ามก่อความวุ่นวาย\n" +
        "6. ห้ามเผยแพร่สื่อ หรือคำพูดที่มีเนื้อหาล่อแหลมอนาจาร\n" +
        "7. ห้ามเผยแพร่สื่อ หรือคำพูดเสียดสี ดูหมิ่นสถาบันและการเมือง\n" +
        "8. ให้ความเคารพแก่เพื่อนร่วมค่าย พี่ๆ สตาฟฟ์ ทั้งในด้านเชื้อชาติ ศาสนา ความเชื่อ ถิ่นกำเนิดและเพศ",
    )
    .setFooter({ text: "ToBeIT'70" })
    .setThumbnail(botAvatarURL || ""); // <-- small image top-right

    await interaction.reply({ embeds: [embed] });
}