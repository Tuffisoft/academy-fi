import { getTranslations, getLocale } from "next-intl/server";
import { FileText } from "lucide-react";
import { getDepartments } from "@/lib/data/departments";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateDepartmentDialog } from "@/components/fi/learning/create-department-dialog";
import { AddResourceDialog } from "@/components/fi/learning/add-resource-dialog";
import { UploadDocumentDialog } from "@/components/fi/learning/upload-document-dialog";
import { DeleteDepartmentButton } from "@/components/fi/learning/delete-department-button";
import { DeleteResourceButton } from "@/components/fi/learning/delete-resource-button";

export async function ManageDepartments() {
  const [t, locale, departments] = await Promise.all([
    getTranslations("departments"),
    getLocale(),
    getDepartments(),
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("manageTitle")}</CardTitle>
        <CardDescription>{t("manageDescription")}</CardDescription>
        <CardAction>
          <CreateDepartmentDialog />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {departments.length === 0 && (
          <p className="text-muted-foreground text-sm">{t("empty")}</p>
        )}
        {departments.map((department) => (
          <div
            key={department.id}
            className="border-border rounded-xl border p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold">
                  {department.nameEN}
                  {department.nameDE &&
                    department.nameDE !== department.nameEN && (
                      <span className="text-muted-foreground ml-2 font-normal text-sm">
                        ({department.nameDE})
                      </span>
                    )}
                </h3>
                {department.description && (
                  <p className="text-muted-foreground mt-1 text-sm">
                    {department.description}
                  </p>
                )}
              </div>
              <DeleteDepartmentButton
                departmentId={department.id}
                name={department.nameEN}
              />
            </div>
            <ul className="mt-3 flex flex-col gap-1.5">
              {department.resources.map((resource) => (
                <li
                  key={resource.id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="flex items-center gap-2">
                    {/* Uploaded documents get a file icon */}
                    {resource.fileKey && (
                      <FileText className="text-muted-foreground h-4 w-4 shrink-0" />
                    )}
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={resource.fileName ?? undefined}
                      className="text-primary font-medium underline underline-offset-4"
                    >
                      {resource.title}
                    </a>
                    {resource.note && (
                      <span className="text-muted-foreground ml-2">
                        {resource.note}
                      </span>
                    )}
                  </span>
                  <DeleteResourceButton resourceId={resource.id} />
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <AddResourceDialog departmentId={department.id} />
              <UploadDocumentDialog departmentId={department.id} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
