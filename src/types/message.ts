// These interfaces define the structure of a Discord message and it's related data objects.
// They can be expanded as needed based on the Discord API documentation but are not exhaustive.
// See: https://discord.com/developers/docs/resources/message

export interface Author {
  id: string;
  username: string;
  bot?: boolean;
}

export interface Message {
  id: string;
  type: number;
  timestamp: string;
  content: string;
  author: Author;
  pinned: boolean;
}
