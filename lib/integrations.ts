export const INTEGRATION_PROVIDERS = [
  {
    id: "GOOGLE_DRIVE",
    name: "Google Drive",
    description: "Attach and open company files from Drive",
    category: "Storage",
    oauth: "google",
  },
  {
    id: "GOOGLE_MEET",
    name: "Google Meet",
    description: "Create video meetings with Meet links",
    category: "Meetings",
    oauth: "google",
  },
  {
    id: "MICROSOFT_TEAMS",
    name: "Microsoft Teams",
    description: "Schedule Teams meetings and join links",
    category: "Meetings",
    oauth: "microsoft",
  },
  {
    id: "MICROSOFT_OUTLOOK",
    name: "Microsoft Outlook",
    description: "Sync calendar events with Outlook",
    category: "Calendar",
    oauth: "microsoft",
  },
] as const;

export type IntegrationProviderId = (typeof INTEGRATION_PROVIDERS)[number]["id"];

export function googleOAuthConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function microsoftOAuthConfigured() {
  return Boolean(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET);
}

export function buildGoogleAuthUrl(state: string) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || "",
    redirect_uri: `${process.env.APP_URL || "http://localhost:3000"}/api/v1/integrations/oauth/google/callback`,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/calendar.events",
    ].join(" "),
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function buildMicrosoftAuthUrl(state: string) {
  const tenant = process.env.MICROSOFT_TENANT_ID || "common";
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID || "",
    response_type: "code",
    redirect_uri: `${process.env.APP_URL || "http://localhost:3000"}/api/v1/integrations/oauth/microsoft/callback`,
    response_mode: "query",
    scope: [
      "openid",
      "email",
      "profile",
      "offline_access",
      "https://graph.microsoft.com/OnlineMeetings.ReadWrite",
      "https://graph.microsoft.com/Calendars.ReadWrite",
      "https://graph.microsoft.com/Files.ReadWrite",
    ].join(" "),
    state,
  });
  return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params.toString()}`;
}

/** Generate a join URL when a meeting platform is selected. */
export function createMeetingJoinUrl(platform?: string | null, title?: string) {
  if (platform === "GOOGLE_MEET") {
    // Opens Meet new-meeting flow; replace with Calendar API event when OAuth is live
    return "https://meet.google.com/new";
  }
  if (platform === "MICROSOFT_TEAMS") {
    const subject = encodeURIComponent(title || "BERC Meeting");
    return `https://teams.microsoft.com/l/meeting/new?subject=${subject}`;
  }
  return null;
}
