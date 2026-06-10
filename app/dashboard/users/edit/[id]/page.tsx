import { UserEditPage } from "@/features/users/components/user-edit-page";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function UserEditRoute({ params }: Props) {
  const { id } = await params;
  return <UserEditPage userId={id} />;
}

export function generateMetadata() {
  return {
    title: "Edit User | ERP",
    description: "Edit user profile, branch, permissions and security settings",
  };
}
