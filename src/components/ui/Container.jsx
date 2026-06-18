import { cn } from "@/lib/utils";

/** Centered, max-width page gutter used across the site. */
export function Container({ as: Tag = "div", className, children }) {
  return <Tag className={cn("container", className)}>{children}</Tag>;
}
