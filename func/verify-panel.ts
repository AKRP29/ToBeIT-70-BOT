import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  MessageFlags,
  AttachmentBuilder,
} from "discord.js";
import { VERIFY_BUTTON_ID } from "./verify";

export const data = new SlashCommandBuilder()
  .setName("verify-panel")
  .setDescription("โพสต์ปุ่มยืนยันตัวตน")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

export async function execute(interaction: ChatInputCommandInteraction) {
  const banner = new AttachmentBuilder("./assets/bg.png", { name: "bg.png" });
  const footerIcon = new AttachmentBuilder("./assets/ryouu.jpg", { name: "ryouu.jpg" });

  const embed = new EmbedBuilder()
    .setColor(0xE63946)
    .setAuthor({ name: "ToBeIT'70"})
    .setTitle("🎪 ยินดีต้อนรับสู่โรงละครสัตว์ 🤡")
    .setDescription(
      "🎟️ กดปุ่ม **ยืนยันตัวตน** ด้านล่างเพื่อรับยศ\n"
    )
    .setImage("attachment://bg.png")
    .setFooter({ text: "ToBeIT'70 • ระบบยืนยันตัวตน", iconURL: "attachment://ryouu.jpg" });

  const button = new ButtonBuilder()
    .setCustomId(VERIFY_BUTTON_ID)
    .setLabel("ยืนยันตัวตน")
    .setEmoji("✅")
    .setStyle(ButtonStyle.Success);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

  await interaction.channel?.send({
    embeds: [embed],
    components: [row],
    files: [banner, footerIcon],
  });
  await interaction.reply({ content: "โพสต์ปุ่มแล้วจ้า", flags: MessageFlags.Ephemeral });
}
