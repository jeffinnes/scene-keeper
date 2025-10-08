export interface ApplicationCommandOption {
  type: number;
  name: string;
  description: string;
  required?: boolean;
}

export interface ApplicationCommand {
  version: string;
  type: number;
  name: string;
  description: string;
  application_id: string;
  default_member_permissions: string;
  options?: ApplicationCommandOption[];
}
