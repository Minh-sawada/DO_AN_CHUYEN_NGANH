// If you are using Node.js, replace the Deno import with Node's HTTP server:
import { createServer } from "http";
import { createClient } from "@supabase/supabase-js";

export { createServer as serve, createClient };