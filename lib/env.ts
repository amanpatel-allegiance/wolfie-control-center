const required = (v: string | undefined, name: string) => {
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
};

export const env = {
  supabaseUrl: () => required(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: () => required(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: () => required(process.env.SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY"),
  githubDispatchToken: () => process.env.GITHUB_DISPATCH_TOKEN ?? "",
  slackWebhook: () => process.env.SLACK_ALERT_WEBHOOK ?? "",
  alertTickSecret: () => process.env.ALERT_TICK_SECRET ?? "",
  appBaseUrl: () => process.env.APP_BASE_URL ?? "http://localhost:4200",
};
