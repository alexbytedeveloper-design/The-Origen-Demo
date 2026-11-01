import { LOGO_PATH, LOGO_VIEWBOX, MARK_VIEWBOX } from "@/lib/logo-path";

type LogoProps = {
  variant?: "full" | "mark";
  className?: string;
  title?: string;
  decorative?: boolean;
};

/**
 * El logo es un único path: se pinta con currentColor para que funcione
 * sobre papel (tinta) y sobre brasa (crema) sin duplicar archivos.
 */
export function Logo({
  variant = "full",
  className,
  title = "The Origen",
  decorative = false,
}: LogoProps) {
  return (
    <svg
      viewBox={variant === "mark" ? MARK_VIEWBOX : LOGO_VIEWBOX}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      role={decorative ? "presentation" : "img"}
      aria-label={decorative ? undefined : title}
      aria-hidden={decorative || undefined}
      focusable="false"
    >
      <path d={LOGO_PATH} fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}
