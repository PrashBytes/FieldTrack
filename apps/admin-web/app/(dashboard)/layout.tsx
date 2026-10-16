import { AdminLayout } from '@/components/admin/admin-layout';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>;
}
