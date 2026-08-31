import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  TextChannel,
  Role,
  PermissionFlagsBits,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("say")
  .setDescription("พูดคำว่า")
  .addChannelOption((option) =>
    option.setName("channel").setDescription("ช่องที่จะพูด").setRequired(true)
  )
  .addStringOption((option) =>
    option.setName("title").setDescription("หัวข้อ").setRequired(true)
  )
  .addStringOption((option) =>
    option.setName("message").setDescription("คำว่า").setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

export async function execute(interaction: ChatInputCommandInteraction) {
  const channel = interaction.options.getChannel("channel", true);
  const message = interaction.options.getString("message", true);
  const title = interaction.options.getString("title") || "ToBeIT'70";
  const embed = new EmbedBuilder()
    .setColor(0x0099ff)
    .setTitle(title)
    .setDescription(message)
    .setFooter({ text: "ToBeIT'70" })
    .setThumbnail(interaction.client.user?.displayAvatarURL() || "" || ""); // <-- small image top-right

  await (channel as TextChannel).send({ embeds: [embed] });
  await interaction.reply({ content: "พูดไปแล้วจ้า", ephemeral: true });
}
