/**
 * See https://discord.com/developers/docs/topics/permissions#permissions-bitwise-permission-flags
 * For the bitwise permission flags.
 */
import type { ApplicationCommand } from '@/types/command.js';

const testCommand: ApplicationCommand = {
  version: '1',
  type: 1, // 1 is a slash command
  name: 'test',
  description: 'A test command to see if Jeff got the command registration process working.',
  application_id: process.env.APP_ID || 'missing_app_id',
  default_member_permissions: (
    0x0000000000000800 |
    0x0000000000002000 |
    0x0000000400000000
  ).toString(), // Set the permissions a user must have to use it.
};

const clean: ApplicationCommand = {
  version: '1',
  type: 1, // 1 is a slash command
  name: 'clean',
  description: 'Clear all non-pinned messages from the channel.',
  application_id: process.env.APP_ID || 'missing_app_id',
  default_member_permissions: (0x800 | 0x2000 | 0x400000000).toString(), // Set the permissions a user must have to use it.
};

const archive: ApplicationCommand = {
  version: '1',
  type: 1, // 1 is a slash command
  name: 'archive',
  description: 'Send all channel messages to the email addresses specified.',
  application_id: process.env.APP_ID || 'missing_app_id',
  default_member_permissions: (0x800 | 0x4000000000).toString(), // Set the permissions a user must have to use it.
  options: [
    {
      type: 3, // STRING type
      name: 'email_list',
      description: 'Comma separated email addresses to send the archive to.',
      required: true,
    },
  ],
};

export const devCommandList: ApplicationCommand[] = [testCommand, clean, archive];
