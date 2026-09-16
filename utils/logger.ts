import { Client, EmbedBuilder, TextChannel } from "discord.js";

let client: Client | null = null;
let channel: TextChannel | null = null;

export function initLogger(c: Client) {
  client = c;
}

async function getChannel(): Promise<TextChannel | null> {
  if (channel) return channel;
  const id = process.env.LOG_CHANNEL_ID;
  if (!client || !id) return null;
  const ch = await client.channels.fetch(id).catch(() => null);
  if (ch?.isTextBased()) channel = ch as TextChannel;
  return channel;
}

type Fields = Record<string, string | number>;

export async function log(title: string, color: number, fields?: Fields) {
  const ch = await getChannel();
  if (!ch) return;

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(color)
    .setTimestamp();

  if (fields) {
    embed.addFields(
      Object.entries(fields).map(([name, value]) => ({
        name,
        value: String(value),
        inline: true,
      })),
    );
  }

  await ch.send({ embeds: [embed] }).catch((e) => console.error("log send failed:", e));
}

export const GREEN = 0x2ecc71;
export const RED = 0xe74c3c;
export const YELLOW = 0xf1c40f;
export const BLUE = 0x3498db;
