const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const { applicationEmbed } = require('../embeds/applicationEmbed');
const rateLimiter = require('../utils/rateLimiter');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('apply')
    .setDescription('Start the Discord admin application process'),
  async execute(interaction) {
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('language_select')
      .setPlaceholder('Languages: 🇺🇸 English | 🇪🇬 العربية')
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel('🇺🇸 English')
          .setValue('en'),
        new StringSelectMenuOptionBuilder()
          .setLabel('🇪🇬 العربية')
          .setValue('ar')
      );

    // rate limit
    if (!rateLimiter.allow(interaction.user.id, 'apply', 8000)) {
      const left = Math.ceil(rateLimiter.timeLeft(interaction.user.id, 'apply', 8000) / 1000);
      try { return await interaction.reply({ content: `Please wait ${left}s before trying again.`, ephemeral: true }); } catch (e) { return; }
    }

    const row = new ActionRowBuilder().addComponents(selectMenu);

    try {
      await interaction.reply({ embeds: [applicationEmbed()], components: [row], ephemeral: true });
    } catch (err) {
      console.error('Failed to send apply embed:', err);
      try {
        if (!interaction.replied) await interaction.reply({ content: 'Unable to send application menu.', ephemeral: true });
      } catch (e) {
        console.error('Failed to notify user about apply failure:', e);
      }
    }
  },
};
