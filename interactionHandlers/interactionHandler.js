const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const languageSelectHandler = require('../selectMenus/languageSelect');
const { buildQuestionsModal } = require('../modals/applicationModal');
const rateLimiter = require('../utils/rateLimiter');
const { sendLog } = require('../utils/logger');
const { applicationEmbed } = require('../embeds/applicationEmbed');

async function safeReply(interaction, options) {
  try {
    if (!interaction.replied && !interaction.deferred) {
      return await interaction.reply(options);
    }
    return await interaction.followUp(options);
  } catch (err) {
    return null;
  }
}

async function safeEditReply(interaction, options) {
  try {
    if (interaction.replied || interaction.deferred) {
      return await interaction.editReply(options);
    }
    return await interaction.reply(options);
  } catch (err) {
    return null;
  }
}

async function safeComponentReply(interaction, options) {
  try {
    if (interaction.deferred || interaction.replied) {
      try {
        return await interaction.editReply(options);
      } catch (editErr) {
        // if edit fails, try followUp
        try { return await interaction.followUp(options); } catch (fuErr) {}
      }
    }
    return await interaction.reply(options);
  } catch (err) {
    try {
      const code = err && err.code;
      if (code === 10062 || code === 40060) {
        if (interaction.channel && interaction.channel.send) {
          try { await interaction.channel.send({ content: options.content || 'An interaction error occurred. Please re-run /apply to restart the process.' }); } catch (e) {}
        } else {
          try { await interaction.user.send('An interaction error occurred. Please re-run /apply to restart the process.'); } catch (e) {}
        }
      }
    } catch (e) {}
    return null;
  }
}

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        await command.execute(interaction, client);
      } catch (error) {
        console.error(error);
        try {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: 'There was an error while executing this command.', ephemeral: true });
          } else {
            await interaction.followUp({ content: 'There was an error while executing this command.', ephemeral: true });
          }
        } catch (err) {
          console.error('Failed to send error message to interaction:', err);
        }
        try { await sendLog(client, 'error', 'Command execution error', error.stack || String(error)); } catch {}
      }
      return;
    }

    if (interaction.isStringSelectMenu()) {
      await languageSelectHandler.handle(interaction, client);
      return;
    }

    if (interaction.isButton()) {
      const custom = interaction.customId;
      if (custom && custom.startsWith('continue_modal_')) {
        // customId: continue_modal_{lang}_{step}
        const parts = custom.split('_');
        const lang = parts[2] === 'ar' ? 'ar' : 'en';
        const step = Number(parts[3]) || 1;
        const userKey = `${interaction.user.id}`;
        if (!client.applicationData.has(userKey)) {
          client.applicationData.set(userKey, { lang, answers: {}, lastStep: 0 });
        }

        if (!rateLimiter.allow(interaction.user.id, 'show_modal', 3000)) {
          const left = Math.ceil(rateLimiter.timeLeft(interaction.user.id, 'show_modal', 3000) / 1000);
          try {
            return await safeComponentReply(interaction, { content: `Please wait ${left}s before opening the modal again.`, ephemeral: true });
          } catch (err) {
            console.error('Failed to reply after show modal rate limit:', err);
            return null;
          }
        }

        const modal = buildQuestionsModal(lang, step);

        try {
          await interaction.showModal(modal);
        } catch (err) {
          console.error('Failed to show modal from button:', err);
          try { await sendLog(client, 'error', 'Failed to show modal', err.stack || String(err)); } catch {}
          await safeComponentReply(interaction, { content: 'Unable to open the application modal. Please try again.', ephemeral: true });
        }
        return;
      }

      if (custom && (custom.startsWith('review_accept_') || custom.startsWith('review_reject_'))) {
        // custom format: review_accept_admin_{applicantId} or review_reject_{applicantId}
        const parts = custom.split('_');
        const action = parts[1]; // accept or reject
        const subtype = parts[2]; // admin or mod or (in reject case, applicantId)
        let applicantId;
        if (action === 'accept') {
          applicantId = parts[3];
        } else if (action === 'reject') {
          applicantId = parts[2];
        }

        // Permission check: only guild owner or members with ManageGuild permission can assign roles
        const isOwner = interaction.guild && interaction.guild.ownerId === interaction.user.id;
        const canManage = interaction.member && interaction.member.permissions && interaction.member.permissions.has && interaction.member.permissions.has('ManageGuild');
        if (!isOwner && !canManage) {
          await safeReply(interaction, { content: 'You do not have permission to perform this action.', ephemeral: true });
          return;
        }

        if (action === 'reject') {
          try {
            await interaction.update({ content: 'Application rejected.', components: [] });
          } catch (err) {
            console.error('Failed to update rejected application message:', err);
            await safeReply(interaction, { content: 'Application rejected.', ephemeral: true });
          }
          try { await sendLog(client, 'info', 'Application rejected', `Applicant ID: ${applicantId}\nBy: ${interaction.user.tag}`); } catch {}
          return;
        }

        // accept flow
        const roleType = subtype; // 'admin' or 'mod'
        const adminRoleId = process.env.ADMIN_ROLE_ID?.trim();
        const modRoleId = process.env.MOD_ROLE_ID?.trim();
        const roleId = roleType === 'admin' ? adminRoleId : modRoleId;
        if (!roleId) {
          await safeReply(interaction, { content: `Role ID for ${roleType} is not configured. Set ADMIN_ROLE_ID or MOD_ROLE_ID.`, ephemeral: true });
          return;
        }

        try {
          const guild = interaction.guild;
          if (!guild) {
            await safeReply(interaction, { content: 'This action must be performed in a guild.', ephemeral: true });
            return;
          }
          const member = await guild.members.fetch(applicantId).catch(() => null);
          if (!member) {
            await safeReply(interaction, { content: 'Applicant is not a member of this guild.', ephemeral: true });
            return;
          }

          await member.roles.add(roleId, `Accepted via application by ${interaction.user.tag}`);
          await safeReply(interaction, { content: `Assigned ${roleType} role to the applicant.`, ephemeral: true });
          try { await sendLog(client, 'info', 'Role assigned', `Applicant: ${applicantId}\nRole: ${roleType}\nBy: ${interaction.user.tag}`); } catch {}
        } catch (err) {
          console.error('Failed to assign role:', err);
          try { await sendLog(client, 'error', 'Failed to assign role', err.stack || String(err)); } catch {}
          await safeReply(interaction, { content: 'Failed to assign role. Check bot permissions.', ephemeral: true });
        }
        return;
      }
    }

    if (interaction.isModalSubmit()) {
      // modal customId: application_modal_{lang}_{step}
      const parts = interaction.customId.split('_');
      const lang = parts[2] === 'ar' ? 'ar' : 'en';
      const step = Number(parts[3]) || 1;

      // Defer the modal submit so we can safely edit the reply later
      try {
        await interaction.deferReply({ ephemeral: true });
      } catch (deferErr) {
        console.error('Failed to defer modal submit interaction:', deferErr);
      }

      // Collect answers from this modal step using known field ids
      const { getStepIds } = require('../modals/applicationModal');
      const stepIds = getStepIds(lang, step);
      const stepAnswers = {};
      for (const id of stepIds) {
        try {
          stepAnswers[id] = interaction.fields.getTextInputValue(id);
        } catch (e) {
          // If the field is missing for any reason, store an empty string
          stepAnswers[id] = '';
        }
      }

      // Save progress in client.applicationData map keyed by user
      const userKey = `${interaction.user.id}`;
      const existing = client.applicationData.get(userKey) || { lang, answers: {} };
      existing.lang = lang;
      existing.answers = { ...existing.answers, ...stepAnswers };
      existing.lastStep = step;
      client.applicationData.set(userKey, existing);

      // Determine if there are more steps
      const { totalSteps } = require('../modals/applicationModal');
      const maxSteps = totalSteps();

      if (step < maxSteps) {
        // Can't show a modal directly from a modal submit interaction. Send an ephemeral response with a Continue button.
        const nextStep = step + 1;
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`continue_modal_${lang}_${nextStep}`)
            .setLabel(lang === 'en' ? 'Continue application' : 'متابعة')
            .setStyle(ButtonStyle.Primary)
        );

        try {
          if (!rateLimiter.allow(interaction.user.id, 'show_modal', 3000)) {
            const left = Math.ceil(rateLimiter.timeLeft(interaction.user.id, 'show_modal', 3000) / 1000);
            return await safeComponentReply(interaction, { content: `Please wait ${left}s before opening the modal again.`, ephemeral: true });
          }

          return await safeComponentReply(interaction, {
            content: lang === 'en' ? 'Continue to the next part of the application by clicking the button below.' : 'لمتابعة الجزء التالي من الطلب، اضغط الزر أدناه.',
            components: [row],
          });
        } catch (err) {
          console.error('Failed to send continue button response:', err);
          try { await sendLog(client, 'error', 'Failed to send continue button response', err.stack || String(err)); } catch {}
          return null;
        }
      }

      // Final step: compile and send to staff channel
      const collected = client.applicationData.get(userKey)?.answers || {};
      const answersArray = Object.entries(collected).map(([k, v]) => `**${k}**: ${v}`);

      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle(lang === 'en' ? 'New Admin Application' : 'طلب إدارة جديد')
        .setAuthor({ name: `${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
        .setDescription(lang === 'en'
          ? 'A clean, professional review card for the submitted application.'
          : 'بطاقة مراجعة احترافية للطلب المقدم.')
        .addFields(
          { name: lang === 'en' ? 'Applicant' : 'المتقدم', value: `${interaction.user.tag}\n<@${interaction.user.id}>`, inline: true },
          { name: lang === 'en' ? 'Applicant ID' : 'معرف المتقدم', value: interaction.user.id, inline: true },
          { name: lang === 'en' ? 'Language' : 'اللغة', value: lang === 'en' ? 'English' : 'العربية', inline: true },
          { name: lang === 'en' ? 'Answers' : 'الإجابات', value: answersArray.join('\n') }
        )
        .setFooter({ text: lang === 'en' ? 'Admin application review' : 'مراجعة طلب إدارة' })
        .setTimestamp();

      const FORBIDDEN_CHANNEL = '1530440580415619132';
      let reviewChannelId = process.env.STAFF_REVIEW_CHANNEL_ID || process.env.LOG_CHANNEL_ID;

      if (!reviewChannelId) {
        try { await sendLog(client, 'error', 'No review or log channel configured for applications', 'Set STAFF_REVIEW_CHANNEL_ID or LOG_CHANNEL_ID.'); } catch {}
        await safeEditReply(interaction, { content: lang === 'en' ? 'Applications cannot be submitted right now. Configuration is missing.' : 'لا يمكن إرسال الطلب حالياً. الإعدادات مفقودة.' });
        return;
      }

      if (reviewChannelId === FORBIDDEN_CHANNEL) {
        const alt = process.env.LOG_CHANNEL_ID;
        if (alt && alt !== FORBIDDEN_CHANNEL) {
          try { await sendLog(client, 'warn', 'Configured review channel is forbidden; routing to log channel', `Original: ${FORBIDDEN_CHANNEL}\nUsing: ${alt}`); } catch {}
          reviewChannelId = alt;
        } else {
          try { await sendLog(client, 'warn', 'Configured review channel is forbidden and no alternate log channel set', `Original: ${FORBIDDEN_CHANNEL}`); } catch {}
          await safeEditReply(interaction, { content: lang === 'en' ? 'Your application cannot be submitted because the review channel is blocked.' : 'لا يمكن إرسال طلبك لأن قناة المراجعة محظورة.' });
          return;
        }
      }

      const channel = await client.channels.fetch(reviewChannelId).catch(() => null);
      if (!channel) {
        try {
          await safeEditReply(interaction, { content: 'Unable to find the staff review channel.' });
        } catch (err) {
          console.error('Failed to edit reply when channel not found:', err);
          try { await sendLog(client, 'error', 'Unable to find staff review channel', `Channel ID: ${reviewChannelId}`); } catch {}
        }
        return;
      }

      // Add applicant ID and review buttons for staff actions
      const reviewRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`review_accept_admin_${interaction.user.id}`).setLabel('Accept as Admin').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`review_accept_mod_${interaction.user.id}`).setLabel('Accept as Mod').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`review_reject_${interaction.user.id}`).setLabel('Reject').setStyle(ButtonStyle.Danger),
      );

      // include applicant ID field
      embed.addFields({ name: lang === 'en' ? 'Applicant ID' : 'معرف المتقدم', value: interaction.user.id });

      try {
        await channel.send({ embeds: [embed], components: [reviewRow] });
        client.applicationData.delete(userKey);

        const languageSelectMenu = new StringSelectMenuBuilder()
          .setCustomId('language_select')
          .setPlaceholder('Languages: 🇺🇸 English | 🇪🇬 العربية')
          .addOptions(
            new StringSelectMenuOptionBuilder().setLabel('🇺🇸 English').setValue('en'),
            new StringSelectMenuOptionBuilder().setLabel('🇪🇬 العربية').setValue('ar')
          );

        const restartRow = new ActionRowBuilder().addComponents(languageSelectMenu);
        const restartOptions = {
          content: lang === 'en'
            ? 'Choose your language to start a new application.'
            : 'اختر لغتك لبدء طلب جديد.',
          components: [restartRow],
        };

        let restartSent = false;
        try {
          await interaction.editReply(restartOptions);
          restartSent = true;
        } catch (editErr) {
          console.error('Failed to edit final modal reply for restart:', editErr);
        }

        if (!restartSent) {
          try {
            if (!interaction.replied && !interaction.deferred) {
              await interaction.reply({ ...restartOptions, ephemeral: true });
            } else {
              await interaction.followUp({ ...restartOptions, ephemeral: true });
            }
          } catch (replyErr) {
            console.error('Failed to send restart language select after final submission:', replyErr);
          }
        }

        try { await sendLog(client, 'info', 'Application submitted', `Applicant: ${interaction.user.tag}\nChannel: ${reviewChannelId}`); } catch {}
      } catch (err) {
        console.error('Failed to send application or edit reply:', err);
        try { await sendLog(client, 'error', 'Failed to send application or edit reply', err.stack || String(err)); } catch {}
      }
    }
  },
};
