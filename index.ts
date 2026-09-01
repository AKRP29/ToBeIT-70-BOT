import {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  MessageFlags,
} from "discord.js";
import * as dotenv from "dotenv";
import config from "./config.ts";
import { setupGuildMemberAdd } from "./func/welcome.ts";
import { initializeFonts } from "./utils/canvas.js";
import * as rules from "./func/rules.ts";
import * as verify from "./func/verify.ts";
import * as verifyPanel from "./func/verify-panel.ts";
import * as say from "./func/say.ts";
import * as forceVerify from "./func/force-verify.ts";
import * as fixNames from "./func/fix-names.ts";
dotenv.config();
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel, Partials.GuildMember],
}) as Client & { commands: Collection<string, any> };
client.commands = new Collection();
client.commands.set(rules.data.name, rules);
client.commands.set(verify.data.name, verify);
client.commands.set(verifyPanel.data.name, verifyPanel);
client.commands.set(say.data.name, say);
client.commands.set(forceVerify.data.name, forceVerify)
// client.commands.set(fixNames.data.name, fixNames)

const token = process.env.DISCORD_TOKEN;

setupGuildMemberAdd(client);

client.on("messageCreate", async (msg) => {
  if (!msg.content.startsWith(config.prefix) || msg.author.bot) return;

  const command = msg.content.slice(config.prefix.length).trim().toLowerCase();

  try {
    if (command === "ping") {
      await msg.channel.send("🏓 Pong!");
    } else if (command === "rules") {
      return;
    }
  } catch (error) {
    console.error(`Error processing command "${command}":`, error);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isButton()) {
    if (interaction.customId === verify.VERIFY_BUTTON_ID) {
      try {
        await verify.handleButton(interaction);
      } catch (error) {
        console.error(error);
      }
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: "There was an error while executing this command!",
      flags: MessageFlags.Ephemeral,
    });
  }
});

client.once(Events.ClientReady, async (c) => {
  console.log(`Bot is online! Logged in as ${client.user?.tag}`);
  
  // Initialize fonts once on startup to prevent memory leaks
  console.log('Initializing fonts...');
  initializeFonts();
  console.log('Fonts initialized successfully');

  const rest = new REST().setToken(token!);
  try {
    console.log("Refreshing commands");
    const guilds = (process.env.GUILD_IDS ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    for (const guild of guilds) {
      await rest.put(
        Routes.applicationGuildCommands(c.user.id, guild),
        { body: client.commands.map((cmd) => cmd.data) },
      );
    }
    console.log("Commands refreshed");
  } catch (error) {
    console.error(error);
  }
});

client.login(token);
