import { getTranslations, getLocale } from "next-intl/server";
import { FileText } from "lucide-react";
import { getDepartments } from "@/lib/data/departments";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AddResourceDialog } from "@/components/fi/learning/add-resource-dialog";
import { UploadDocumentDialog } from "@/components/fi/learning/upload-document-dialog";
import { DeleteResourceButton } from "@/components/fi/learning/delete-resource-button";

export async function DepartmentsList({ userId }: { userId: string }) {
  const [t, locale, departments] = await Promise.all([
    getTranslations("departments"),
    getLocale(),
    getDepartments(),
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {departments.length === 0 && (
          <p className="text-muted-foreground text-sm">{t("empty")}</p>
        )}
        {departments.map((department) => (
          <div
            key={department.id}
            className="border-border bg-muted/30 rounded-xl border p-4"
          >
            <h3 className="text-lg font-semibold">
              {locale === "de" ? department.nameDE : department.nameEN}
            </h3>
            {department.description && (
              <p className="text-muted-foreground mt-1 text-sm">
                {department.description}
              </p>
            )}
            {department.resources.length > 0 && (
              <ul className="mt-3 flex flex-col gap-1.5">
                {department.resources.map((resource) => (
                  <li key={resource.id} className="flex items-center gap-2">
                    {/* Uploaded documents get a file icon */}
                    {resource.fileKey && (
                      <FileText className="text-muted-foreground h-4 w-4 shrink-0" />
                    )}
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={resource.fileName ?? undefined}
                      className="text-primary text-sm font-medium underline underline-offset-4"
                    >
                      {resource.title}
                    </a>
                    {resource.note && (
                      <span className="text-muted-foreground ml-2 text-sm">
                        {resource.note}
                      </span>
                    )}
                    {/* Interns can only remove resources they added */}
                    {resource.createdById === userId && (
                      <DeleteResourceButton resourceId={resource.id} />
                    )}
                  </li>
                ))}
              </ul>
            )}
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
