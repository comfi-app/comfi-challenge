import type { FieldValue } from "@comfi/kyb-contracts";
import { Card, EmptyState, FileLink, useAdminApp } from "@comfi/ui";
import { Fragment } from "react";
import { groupAttributes } from "../profile";

export function ProfileCard({ attributes }: { attributes: Record<string, FieldValue> }) {
  const groups = groupAttributes(attributes);
  return (
    <Card title="Profile">
      {groups.length === 0 ? (
        <EmptyState title="No profile data yet">Answers appear here as the applicant completes onboarding.</EmptyState>
      ) : (
        <div className="co-profile">
          {groups.map((group) => (
            <section key={group.key} className="co-profile__group">
              <h3 className="cf-subhead">{group.title}</h3>
              <dl className="cf-dl cf-dl--compact co-profile__list">
                {group.attributes.map(({ key, label, value }) => (
                  <Fragment key={key}>
                    <dt title={key}>{label}</dt>
                    <dd>
                      <AttributeValue value={value} />
                    </dd>
                  </Fragment>
                ))}
              </dl>
            </section>
          ))}
        </div>
      )}
    </Card>
  );
}

function AttributeValue({ value }: { value: FieldValue }) {
  const { api } = useAdminApp();
  if (value === null || value === "") return <span className="cf-muted">—</span>;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return <FileLink file={value} href={api.fileUrl(value.fileId)} />;
  return value;
}
