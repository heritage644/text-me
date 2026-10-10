export type Contact = {
  id: string;
  name: string;
  username: string;
  online: boolean;
  lastSeen: string;
};
export type Message = { id: string; from: "me" | 
    "them"; text: string; time: string };
export type Chat = { contact: Contact; messages: 
    Message[]; 
    unread: number };
;
