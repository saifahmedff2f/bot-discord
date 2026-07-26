const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const { applicationEmbed } = require('../embeds/applicationEmbed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('restart')
    .setDescription('Restart the application process and choose a language again'),
  async execute(interaction, client) {
    const userKey = `${interaction.user.id}`;
    if (client.applicationData.has(userKey)) {
      client.applicationData.delete(userKey);
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('language_select')
      .setPlaceholder('Languages: 🇺🇸 English | 🇪🇬 العربية')
      .addOptions(
        new StringSelectMenuOptionBuilder().setLabel('🇺🇸 English').setValue('en'),
        new StringSelectMenuOptionBuilder().setLabel('🇪🇬 العربية').setValue('ar')
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    try {
      await interaction.reply({
        content: 'The application process has been restarted. Please choose your language to begin again.',
        embeds: [applicationEmbed()],
        components: [row],
        ephemeral: true,
      });
    } catch (err) {
      console.error('Failed to send restart response:', err);
      try {
        if (!interaction.replied) {
          await interaction.reply({ content: 'Unable to restart the application process right now.', ephemeral: true });
        }
      } catch (error) {
        console.error('Failed to reply after restart failure:', error);
      }
    }
  },
};
