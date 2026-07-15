import { requireAuth, json } from "@/lib/api";

export async function GET() {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;

  return json({
    id: user.id,
    email: user.email,
    role: {
      id: user.role.id,
      name: user.role.name,
      permissions: user.role.permissions.map((p) => p.permission.code),
    },
    employee: user.employee
      ? {
          id: user.employee.id,
          employeeId: user.employee.employeeId,
          fullName: user.employee.fullName,
          departmentId: user.employee.departmentId,
          profilePhoto: user.employee.profilePhoto,
        }
      : null,
  });
}
