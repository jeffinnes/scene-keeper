import type { Message } from '@/types/message.js';

import packageJson from '../../../package.json' with { type: 'json' };
import { Resend } from 'resend';
import { rateLimitedFetch } from '@/lib/sharedFunctions.js';

const baseUrl = 'https://discord.com/api/v10/';
const discordBotUserAgent = `DiscordBot (https://github.com/jeffinnes/scene-keeper, ${packageJson.version})`;

async function transcribeChannel(
  guildID: string,
  channel: { id: string; name: string },
  user: { id: string; username: string },
  emailRecipients: string[]
) {
  try {
    // ToDo Delete debug logging when done
    console.log(
      `Sending channel transcription for: ${channel.name} (ID: ${channel.id}) requested by user ${user.username}`
    );

    // Fetch guild name for email context
    const guildNameResponse = await rateLimitedFetch(`${baseUrl}guilds/${guildID}`, {
      headers: {
        Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'User-Agent': discordBotUserAgent,
      },
    });

    if (!guildNameResponse.ok) {
      throw new Error(
        `Failed to fetch guild name: ${guildNameResponse.status} ${guildNameResponse.statusText}`
      );
    }

    const guildInfo: { name: string; id: string } = await guildNameResponse.json();

    const messageLimit = 100; // Discord API message limit per request (100 max, set lower for debugging with low use channels)

    const messagesToTranscribe: Message[] = [];

    let flag = true;

    while (flag === true) {
      // Fetch all the channel messages
      const getMessagesUrl = `${baseUrl}channels/${channel.id}/messages?limit=${messageLimit}${
        messagesToTranscribe.length > 0
          ? `&before=${messagesToTranscribe[messagesToTranscribe.length - 1].id}`
          : ''
      }`;

      const messagesResponse = await rateLimitedFetch(getMessagesUrl, {
        headers: {
          Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'User-Agent': discordBotUserAgent,
        },
      });

      if (!messagesResponse.ok) {
        console.error(
          `Failed to fetch messages: ${messagesResponse.status} ${messagesResponse.statusText}`
        );
        return;
      }

      const messages: Message[] = await messagesResponse.json();

      if (messages.length < messageLimit) {
        flag = false;
      }

      messagesToTranscribe.push(...messages);
    } // End of while loop

    // Build a Map of unique channel participants and get their guild nicknames
    const channelParticipantsMap = new Map<
      string,
      { id: string; username: string; nickname: string | null }
    >();

    for (let index = 0; index < messagesToTranscribe.length; index++) {
      const message = messagesToTranscribe[index];

      if (!channelParticipantsMap.has(message.author.id)) {
        channelParticipantsMap.set(message.author.id, {
          id: message.author.id,
          username: message.author.username,
          nickname: null,
        });
      }
    } // End of for loop

    // Now fetch nicknames for each participant
    for (const [userId, participantInfo] of channelParticipantsMap) {
      const nicknameResponse = await rateLimitedFetch(
        `${baseUrl}guilds/${guildID}/members/${userId}`,
        {
          headers: {
            Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
            'Content-Type': 'application/json; charset=UTF-8',
            'User-Agent': discordBotUserAgent,
          },
        }
      );

      if (!nicknameResponse.ok) {
        console.error(
          `Failed to fetch member info for nickname: ${nicknameResponse.status} ${nicknameResponse.statusText}`
        );
        return;
      }

      const memberInfo = await nicknameResponse.json();

      // ToDo Delete debug logging when done
      /* console.log('Raw memberInfo: ');
      console.log(memberInfo);
      console.log('Adding participant: ');
      console.log({
        id: message.author.id,
        username: message.author.username,
        nickname: memberInfo.nick || null,
      }); */

      channelParticipantsMap.set(userId, {
        id: participantInfo.id,
        username: participantInfo.username,
        nickname: memberInfo.nick || null,
      });
    } // End of for loop to get nicknames

    // Convert Map to Array for easier processing
    const channelParticipantsArray = Array.from(channelParticipantsMap.values());

    // Prepare the email content
    messagesToTranscribe.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const emailTextContent = `Transcription of Discord messages from channel ${channel.name} in server: ${guildInfo.name}

Participants:
${channelParticipantsArray
  .map(
    (participant) =>
      `- ${participant.username} ${participant.nickname ? ` (${participant.nickname})` : ''}`
  )
  .join('\n')}

Messages:
${messagesToTranscribe
  .map(
    (msg) =>
      `[${new Date(msg.timestamp).toUTCString()}] ${msg.author.username} ${channelParticipantsMap.get(msg.author.id)?.nickname ? ` (${channelParticipantsMap.get(msg.author.id)?.nickname})` : ''}: ${msg.content || ''}`
  )
  .join('\n')}

END OF TRANSCRIPT

This email was generated by the Scene Keeper Bot
https://github.com/jeffinnes/scene-keeper
`;

    // Note: the .join('')} at the end of the map functions are needed to concatenate the array items into a single string.
    const emailHtmlContent = `<html>
  <body>
    <h2>Transcription of Discord messages from channel ${channel.name} in server: ${guildInfo.name}</h2>
    <h3>Participants:</h3>
    <ul style="border: 1px solid #000; padding: 10px; list-style-type: none;">
      ${channelParticipantsArray
        .map(
          (participant) =>
            `<li>${participant.username}${
              participant.nickname ? ` (${participant.nickname})` : ''
            }</li>`
        )
        .join('')}
    </ul>
    <h3>Messages:</h3>
    <div style="border: 1px solid #000; padding: 10px; font-family: monospace;">
${messagesToTranscribe
  .map(
    (msg) =>
      `<div><p style="margin-bottom: 0px;">[${new Date(msg.timestamp).toUTCString()}] ${msg.author.username}${channelParticipantsMap.get(msg.author.id)?.nickname ? ` (${channelParticipantsMap.get(msg.author.id)?.nickname})` : ''}:</p> <p style="font-weight: bold; margin-top: 0px;">${msg.content || ''}</p></div>`
  )
  .join('')}
    </div>
    <footer>
      <p>This email was generated by the <a href="https://github.com/jeffinnes/scene-keeper">Scene Keeper Bot.</a></p>
    </footer>
  </body>
</html>`;

    const resend = new Resend(process.env.RESEND_API_KEY || 'missing_api_key');

    const currentDate = new Date();
    const formattedDate = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}`;

    const { data, error } = await resend.emails.send({
      from: 'Scene Keeper Bot <bot@scenekeeper.xyz>',
      to: emailRecipients,
      subject: `Transcription of Discord Channel: ${channel.name} - ${formattedDate}`,
      text: emailTextContent,
      html: emailHtmlContent,
    });

    if (error) {
      throw new Error(`Failed to send transcription email: ${error.message}`);
    }

    // Send message to discord channel confirming transcription sent
    const confirmationResponse = await rateLimitedFetch(
      `${baseUrl}channels/${channel.id}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'User-Agent': discordBotUserAgent,
        },
        body: JSON.stringify({
          content: `Transcription email sent to: ${emailRecipients.join(', ')}.
Total messages transcribed: ${messagesToTranscribe.length}.
Once you have confirmed receipt of the transcription email, you may wish to use the \`/clean\` command to clear non-pinned messages from this channel.`,
        }),
      }
    );

    if (!confirmationResponse.ok) {
      console.error(
        `Failed to send confirmation message: ${confirmationResponse.status} ${confirmationResponse.statusText}`
      );
      return;
    }
  } catch (error) {
    console.error('Error archiving channel:', error);
    // send notification to discord channel this was requested from
  }
}

export { transcribeChannel };
