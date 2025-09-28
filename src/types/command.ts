export interface ApplicationCommand {
  version: string;
  type: number;
  name: string;
  description: string;
  application_id: string;
  default_member_permissions: string;
}
