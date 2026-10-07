import { onlineStorage } from "@/lib/exchange/database";
import { chatStorage } from "./storage";
import { createPostgresChatStorage } from "./postgres";

let remote: ReturnType<typeof createPostgresChatStorage> | undefined;
export async function chatBackend() {
  if (!onlineStorage()) return chatStorage();
  remote ??= createPostgresChatStorage().catch(error => { remote = undefined; throw error; });
  return remote;
}
