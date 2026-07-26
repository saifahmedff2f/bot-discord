const { EmbedBuilder } = require('discord.js');

async function sendLog(client, level, title, description, channelId) {
  try {
    const logChannelId = channelId || process.env.LOG_CHANNEL_ID;
    if (!logChannelId) return; // nothing configured

    const ch = await client.channels.fetch(logChannelId).catch(() => null);
    if (!ch) return;

    const color = level === 'error' ? '#ef4444' : level === 'warn' ? '#f59e0b' : '#10b981';

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description?.toString()?.slice(0, 4096) || '')
      .setColor(color)
      .setTimestamp()
      .setFooter({ text: `Log - ${level}` });

    await ch.send({ embeds: [embed] }).catch(() => null);
  } catch (err) {
    try { console.error('Logger failed:', err); } catch {}
  }
}

module.exports = { sendLog };
