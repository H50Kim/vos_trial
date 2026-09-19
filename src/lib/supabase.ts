import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const url =
  import.meta.env.VITE_SUPABASE_URL ??
  "https://tkjsezhhllrpnxhqmmrm.supabase.co";
const key =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "sb_publishable_tCaTrctAWCbkD_Y36KpzPA_goWqBo4U";

export const supabase = createClient<Database>(url, key);
