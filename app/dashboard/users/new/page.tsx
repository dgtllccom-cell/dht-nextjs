import { UserRegistrationWizard } from "@/features/users/components/user-registration-wizard";

export default function UserRegistrationPage() {
  return <UserRegistrationWizard />;
}

export function generateMetadata() {
  return {
    title: "New User Registration | ERP",
    description: "Create and register a new user in the ERP system",
  };
}
