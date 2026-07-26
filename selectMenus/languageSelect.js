const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const rateLimiter = require('../utils/rateLimiter');
const { buildQuestionsModal } = require('../modals/applicationModal');

module.exports = {
  async handle(interaction, client) {
    if (!interaction.isStringSelectMenu()) return;
    if (interaction.customId !== 'language_select') return;

    const language = interaction.values[0];

    if (!rateLimiter.allow(interaction.user.id, 'language_select', 3000)) {
      try {
        return await interaction.reply({
          content: language === 'en' ? 'Please wait a few seconds before changing language.' : 'الرجاء الانتظار بضع ثوانٍ قبل تغيير اللغة.',
          ephemeral: true,
        });
      } catch (err) {
        console.error('Failed to send rate limit reply for language select:', err);
        return null;
      }
    }

    const userKey = `${interaction.user.id}`;
    client.applicationData.set(userKey, { lang: language, answers: {}, lastStep: 0 });

    const modal = buildQuestionsModal(language, 1);
    try {
      await interaction.showModal(modal);
      return;
    } catch (err) {
      console.error('Failed to show first modal from language select:', err);
    }

    const startButton = new ButtonBuilder()
      .setCustomId(`continue_modal_${language}_1`)
      .setLabel(language === 'en' ? 'Start application' : 'ابدأ الطلب')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(startButton);
    const content = language === 'en'
      ? 'Language selected. Click below to start the application.'
      : 'تم اختيار اللغة. اضغط الزر أدناه لبدء الطلب.';

    try {
      await interaction.update({ content, components: [row] });
      return;
    } catch (err) {
      console.error('Failed to update language select message:', err);
    }

    try {
      await interaction.reply({ content, components: [row], ephemeral: true });
      return;
    } catch (err) {
      console.error('Failed to reply on language select fallback:', err);
      try {
        if (interaction.channel && interaction.channel.send) {
          await interaction.channel.send({ content });
        }
      } catch (e) {}
      return null;
    }
  },
};
