const { EmbedBuilder } = require('discord.js');

function applicationEmbed() {
  return new EmbedBuilder()
    .setColor('#5865F2')
    .setTitle('Discord Admin Application')
    .setDescription('Please select your language to begin the application process.')
    .addFields(
      { name: 'Requirements', value: 'Minimum age: 16+\nRespectful and mature\nActive on the server\nKnows the server rules\nHonest answers only' }
    )
    .setFooter({ text: 'Staff applications' });
}

module.exports = { applicationEmbed };
