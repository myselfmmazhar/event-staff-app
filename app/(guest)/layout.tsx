import { GuestGuard } from "@/components/guards";

export default function GuestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <GuestGuard>{children}</GuestGuard>;
}
