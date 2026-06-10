import { EmailManagementWorkspace } from "@/features/messages/components/email-management";

const channelBySlug: Record<string, "email" | "whatsapp" | "internal" | "notifications"> = {
  email: "email",
  whatsapp: "whatsapp",
  internal: "internal",
  notifications: "notifications"
};

export default function MessagesCatchAllPage({ params }: { params: { slug?: string[] } }) {
  const channel = channelBySlug[params.slug?.[0] ?? "email"] ?? "email";
  return <EmailManagementWorkspace channel={channel} />;
}
