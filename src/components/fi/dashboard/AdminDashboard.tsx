import { getTranslations } from "next-intl/server";
import { getUsers } from "@/lib/data/users";
import { requireRole } from "@/lib/session";
import { Role } from "@/generated/prisma/enums";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreateUserDialog } from "@/components/fi/dashboard/create-user-dialog";
import { ChangePasswordDialog } from "@/components/fi/dashboard/change-password-dialog";
import { DeleteUserButton } from "@/components/fi/dashboard/delete-user-button";

export async function AdminDashboard() {
  const [currentUser, t, users] = await Promise.all([
    requireRole(Role.OWNER),
    getTranslations("users"),
    getUsers(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
          <CardAction>
            <CreateUserDialog />
          </CardAction>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("email")}</TableHead>
                <TableHead>{t("role")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">{t("deleteUser")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{user.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.banned ? "destructive" : "secondary"}>
                      {user.banned ? t("banned") : t("active")}
                    </Badge>
                  </TableCell>
                  <TableCell className="flex justify-end gap-1 text-right">
                    <ChangePasswordDialog userId={user.id} />
                    {user.id !== currentUser.id && (
                      <DeleteUserButton userId={user.id} name={user.name} />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
