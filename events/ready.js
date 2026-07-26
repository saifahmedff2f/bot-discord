module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`Logged in as ${client.user.tag}`);

    try {
      const commands = [];
      for (const command of client.commands.values()) {
        commands.push(command.data.toJSON());
      }

      await client.application.commands.set(commands);
      console.log('Slash commands registered');
    } catch (error) {
      console.error('Failed to register slash commands:', error);
    }
  },
};
