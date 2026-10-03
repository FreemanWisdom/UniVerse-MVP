"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * Shared clickable display-name link to a user's profile.
 * The single profile-navigation pattern for names, paired with UserAvatar.
 */

interface UserLinkProps {
  userId?: string | null;
  name: string;
  /** Destination override (e.g. own profile); omit for /u/{userId} */
  href?: string;
  className?: string;
  children?: React.ReactNode;
  /**
   * "action" renders a keyboard-accessible role="link" span instead of a real
   * anchor — for names that live inside another interactive element (e.g. the
   * open-conversation button in the chat list), where nesting an <a> inside a
   * <button> is invalid HTML.
   */
  mode?: "link" | "action";
}

export function UserLink({ userId, name, href, className = "", children, mode = "link" }: UserLinkProps) {
  const destination = href ?? (userId ? `/u/${userId}` : undefined);
  const content = children ?? name;
  const sharedClass = `truncate transition-colors hover:text-campus-300 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campus-500 rounded-sm ${className}`;

  if (!destination) {
    return <span className={className}>{content}</span>;
  }

  if (mode === "action") {
    return (
      <ActionLink destination={destination} className={sharedClass} name={name}>
        {content}
      </ActionLink>
    );
  }

  return (
    <Link
      prefetch
      href={destination}
      className={sharedClass}
      aria-label={`View ${name}'s profile`}
      onClick={(e) => e.stopPropagation()}
    >
      {content}
    </Link>
  );
}

/**
 * Keyboard-accessible link replacement for names inside another interactive
 * element (e.g. the open-conversation button in the chat list), where an
 * anchor inside a button would be invalid HTML. Navigates with the app
 * router — the previous window.location reload here cost users a full page
 * reload (seconds on a real network) every time they opened a profile from
 * chat or notifications.
 */
function ActionLink({
  destination,
  className,
  name,
  children,
}: {
  destination: string;
  className: string;
  name: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <span
      role="link"
      tabIndex={0}
      className={className}
      aria-label={`View ${name}'s profile`}
      onClick={(e) => {
        e.stopPropagation();
        router.push(destination);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          router.push(destination);
        }
      }}
    >
      {children}
    </span>
  );
}
