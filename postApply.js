require('dotenv').config();
const { Client, GatewayIntentBits, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const { applicationEmbed } = require('./embeds/applicationEmbed');

const token = process.env.DISCORD_TOKEN;
const channelArg = process.argv[2] || process.env.POST_CHANNEL_ID;

if (!token) {
  console.error('DISCORD_TOKEN is not set in environment. Export it or add it to .env');
  process.exit(1);
}
if (!channelArg) {
  console.error('Channel ID required as first argument or in POST_CHANNEL_ID env var.');
  console.error('Usage: node postApply.js <channelId>');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}. Posting to channel ${channelArg}`);

  try {
    const channel = await client.channels.fetch(channelArg);
    if (!channel) throw new Error('Channel not found');

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('language_select')
      .setPlaceholder('Choose your language')
      .addOptions(
        new StringSelectMenuOptionBuilder().setLabel('English').setValue('en').setEmoji('🇺🇸'),
        new StringSelectMenuOptionBuilder().setLabel('العربية').setValue('ar').setEmoji('🇪🇬')
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await channel.send({ embeds: [applicationEmbed()], components: [row] });
    console.log('Message sent successfully');
  } catch (err) {
    console.error('Failed to send message:', err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(token).catch((e) => {
  console.error('Failed to login:', e);
  process.exit(1);
});
