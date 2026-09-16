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
import { initLogger, log, GREEN, RED, BLUE } from "./utils/logger.ts";
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
        await log("Button handler error", RED, {
          Button: "verify",
          User: `${interaction.user.tag} (${interaction.user.id})`,
          Error: (error as Error).message,
        });
      }
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) return;

  await log("Command used", BLUE, {
    Command: `/${interaction.commandName}`,
    User: `${interaction.user.tag} (${interaction.user.id})`,
    Channel: `#${(interaction.channel as any)?.name ?? interaction.channelId}`,
  });

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await log("Command error", RED, {
      Command: `/${interaction.commandName}`,
      User: `${interaction.user.tag} (${interaction.user.id})`,
      Error: (error as Error).message,
    });
    await interaction.reply({
      content: "There was an error while executing this command!",
      flags: MessageFlags.Ephemeral,
    });
  }
});

client.once(Events.ClientReady, async (c) => {
  console.log(`Bot is online! Logged in as ${client.user?.tag}`);

  initLogger(client);
  await log("Bot online", GREEN, {
    Account: c.user.tag,
    Guilds: c.guilds.cache.size,
  });

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
    await log("Commands deployed", BLUE, { Count: client.commands.size });
  } catch (error) {
    console.error(error);
    await log("Command deploy failed", RED, { Error: (error as Error).message });
  }
});

client.on(Events.Error, (error) => {
  log("Client error", RED, { Error: error.message });
});

process.on("unhandledRejection", (reason) => {
  log("Unhandled rejection", RED, { Reason: String(reason) });
});

client.login(token);
