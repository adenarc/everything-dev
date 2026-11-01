import { CaretRightIcon, WarningIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { ReactElement } from "react";
import { SectionHeader } from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchProfileSection,
  type ProfileSectionConfig,
  type ProfileSectionContent,
} from "@/lib/profile-sections";

/**
 * Child-app sections declared in the `profile` auth variable. Each one reads
 * its own app endpoint, so a failing section never takes the page down.
 */
export function ProfileSections({
  sections,
  userId,
}: {
  sections: ProfileSectionConfig[];
  userId: string;
}) {
  return sections.map((section) => (
    <ProfileSection key={section.id} section={section} userId={userId} />
  ));
}

function ProfileSection({ section, userId }: { section: ProfileSectionConfig; userId: string }) {
  const { data, isPending, isError, isFetching, refetch } = useQuery({
    queryKey: ["profile-section", section.id, section.url, userId],
    queryFn: () => fetchProfileSection(section.url),
    retry: false,
    staleTime: 60 * 1000,
  });

  return (
    <section className="flex flex-col gap-4" data-testid={`settings.profile-section.${section.id}`}>
      <SectionHeader
        title={section.title}
        description={section.description}
        action={data?.link ? <LinkTo href={data.link.href}>{data.link.label}</LinkTo> : undefined}
      />
      {isPending ? (
        <div className="flex flex-col gap-2" data-testid="settings.profile-section-loading">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : isError ? (
        <Item variant="muted" role="alert" data-testid="settings.profile-section-error">
          <ItemMedia variant="icon">
            <WarningIcon />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Couldn't load {section.title}</ItemTitle>
            <ItemDescription>The rest of your profile still works.</ItemDescription>
          </ItemContent>
          <ItemActions className="w-full sm:w-auto">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              disabled={isFetching}
              onClick={() => void refetch()}
              data-testid="settings.profile-section-retry"
            >
              {isFetching ? "Retrying…" : "Retry"}
            </Button>
          </ItemActions>
        </Item>
      ) : (
        <SectionContent content={data} />
      )}
    </section>
  );
}

function SectionContent({ content }: { content: ProfileSectionContent }) {
  return (
    <>
      {content.items.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-testid="settings.profile-section-empty">
          {content.empty ?? "Nothing here yet."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {content.items.map((item, index) => {
            const body = (
              <>
                <ItemContent className="min-w-0">
                  <ItemTitle className="wrap-anywhere">{item.title}</ItemTitle>
                  {item.description && <ItemDescription>{item.description}</ItemDescription>}
                </ItemContent>
                {item.meta && (
                  <span className="text-sm text-muted-foreground tabular-nums">{item.meta}</span>
                )}
                {item.href && <CaretRightIcon className="text-muted-foreground" />}
              </>
            );
            return (
              // Items carry no id; the list is replaced as a whole on refetch.
              <li key={index} data-testid="settings.profile-section-item">
                <Item
                  variant="outline"
                  size="sm"
                  render={item.href ? linkElement(item.href) : undefined}
                >
                  {body}
                </Item>
              </li>
            );
          })}
        </ul>
      )}
      {content.incomplete && (
        <p
          className="text-sm text-muted-foreground"
          data-testid="settings.profile-section-incomplete"
        >
          {content.incomplete}
        </p>
      )}
    </>
  );
}

function linkElement(href: string): ReactElement {
  if (href.startsWith("/")) return <Link to={href} />;
  // biome-ignore lint/a11y/useAnchorContent: the rendering component supplies the content
  return <a href={href} rel="noopener noreferrer" />;
}

function LinkTo({ href, children }: { href: string; children: string }) {
  return (
    <Button variant="link" size="sm" nativeButton={false} render={linkElement(href)}>
      {children}
    </Button>
  );
}
