"use client";

import {
  useEffect,
  useId,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckIcon, XIcon } from "@/components/icons";
import { COLORS, type Color } from "@/lib/types";

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/* ---------------------------------- Button --------------------------------- */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "icon";
  loading?: boolean;
};

const buttonVariants = {
  primary: "bg-accent text-white hover:bg-accent-hover shadow-sm",
  secondary: "bg-surface text-fg border border-line hover:bg-sunken/60 shadow-card",
  ghost: "text-muted hover:text-fg hover:bg-sunken/70",
  danger: "bg-danger text-white hover:opacity-90 shadow-sm",
};

const buttonSizes = {
  sm: "h-7 px-2.5 text-[13px] gap-1.5 rounded-md",
  md: "h-9 px-3.5 text-[14px] gap-2 rounded-lg",
  icon: "h-7 w-7 rounded-md justify-center",
};

export function Button({
  variant = "secondary",
  size = "md",
  loading,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cx(
        "inline-flex items-center font-medium transition-colors select-none outline-none",
        "focus-visible:ring-4 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none",
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      {...props}
    >
      {loading && <Spinner className="size-3.5" />}
      {children}
    </button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cx(
        "inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent opacity-70",
        className,
      )}
      aria-label="Cargando"
    />
  );
}

/* ---------------------------------- Fields --------------------------------- */

const controlClass =
  "w-full rounded-lg border border-line bg-surface px-3 text-[14px] text-fg placeholder:text-subtle " +
  "outline-none transition-shadow focus:border-accent focus:ring-4 focus:ring-ring aria-invalid:border-danger";

type FieldProps = { label: string; error?: string; hint?: string; children: (id: string) => ReactNode };

export function Field({ label, error, hint, children }: FieldProps) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium text-fg">
        {label}
      </label>
      {children(id)}
      {error ? (
        <p className="text-[12px] text-danger">{error}</p>
      ) : hint ? (
        <p className="text-[12px] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(controlClass, "h-9", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(controlClass, "min-h-24 py-2 leading-relaxed resize-y", className)} {...props} />;
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-lg bg-danger-soft px-3 py-2 text-[13px] text-danger" role="alert">
      {message}
    </div>
  );
}

/* ----------------------------------- Tag ----------------------------------- */

/**
 * Classes per palette color. Written out in full so Tailwind can find them.
 * - `pill`: tinted background and text (tags, badges)
 * - `dot`: solid accent (bars, dots, swatches)
 * - `wash`: start of a faint gradient (pair with `bg-linear-to-*` and `to-transparent`)
 * - `border`: top border color (pair with a `border-t-*` width)
 */
export const colorStyles: Record<Color, { pill: string; dot: string; wash: string; border: string }> = {
  gray: { pill: "bg-zinc-500/12 text-zinc-600 dark:text-zinc-300", dot: "bg-zinc-400", wash: "from-zinc-500/10", border: "border-t-zinc-400" },
  red: { pill: "bg-red-500/12 text-red-600 dark:text-red-400", dot: "bg-red-500", wash: "from-red-500/10", border: "border-t-red-500" },
  orange: { pill: "bg-orange-500/12 text-orange-600 dark:text-orange-400", dot: "bg-orange-500", wash: "from-orange-500/10", border: "border-t-orange-500" },
  yellow: { pill: "bg-amber-400/15 text-amber-700 dark:text-amber-300", dot: "bg-amber-400", wash: "from-amber-400/12", border: "border-t-amber-400" },
  green: { pill: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500", wash: "from-emerald-500/10", border: "border-t-emerald-500" },
  blue: { pill: "bg-blue-500/12 text-blue-600 dark:text-blue-400", dot: "bg-blue-500", wash: "from-blue-500/10", border: "border-t-blue-500" },
  purple: { pill: "bg-violet-500/12 text-violet-600 dark:text-violet-400", dot: "bg-violet-500", wash: "from-violet-500/10", border: "border-t-violet-500" },
  pink: { pill: "bg-pink-500/12 text-pink-600 dark:text-pink-400", dot: "bg-pink-500", wash: "from-pink-500/10", border: "border-t-pink-500" },
};

export const colorLabels: Record<Color, string> = {
  gray: "Gris",
  red: "Rojo",
  orange: "Naranja",
  yellow: "Amarillo",
  green: "Verde",
  blue: "Azul",
  purple: "Morado",
  pink: "Rosa",
};

export function TagPill({ label, color }: { label: string | null; color: Color | null }) {
  if (!label) return null;
  const style = colorStyles[color ?? "gray"];
  return (
    <span className={cx("inline-flex h-5 items-center gap-1.5 rounded-full px-2 text-[11.5px] font-medium", style.pill)}>
      <span className={cx("size-1.5 rounded-full", style.dot)} />
      {label}
    </span>
  );
}

/* ------------------------------- ColorPicker ------------------------------- */

type ColorPickerProps = {
  value: Color | null;
  onChange: (color: Color | null) => void;
  label: string;
  /** Adds a "no color" option before the palette. */
  allowNone?: boolean;
};

export function ColorPicker({ value, onChange, label, allowNone }: ColorPickerProps) {
  const swatch =
    "flex size-6 items-center justify-center rounded-full outline-none transition-transform hover:scale-110 focus-visible:ring-4 focus-visible:ring-ring";
  const selected = "ring-2 ring-offset-2 ring-line-strong ring-offset-surface";
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
      {allowNone && (
        <button
          type="button"
          role="radio"
          aria-checked={value === null}
          aria-label="Sin color"
          title="Sin color"
          onClick={() => onChange(null)}
          className={cx(swatch, "border border-dashed border-line-strong text-muted", value === null && selected)}
        >
          {value === null && <CheckIcon size={12} strokeWidth={3} />}
        </button>
      )}
      {COLORS.map((color) => (
        <button
          key={color}
          type="button"
          role="radio"
          aria-checked={value === color}
          aria-label={colorLabels[color]}
          title={colorLabels[color]}
          onClick={() => onChange(color)}
          className={cx(swatch, "text-white", colorStyles[color].dot, value === color && selected)}
        >
          {value === color && <CheckIcon size={12} strokeWidth={3} />}
        </button>
      ))}
    </div>
  );
}

/* --------------------------------- Avatar ---------------------------------- */

export function Avatar({ name, size = 22 }: { name: string | null | undefined; size?: number }) {
  const initials = (name ?? "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return (
    <span
      title={name ?? undefined}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 font-semibold text-white"
    >
      {initials || "?"}
    </span>
  );
}

/* ---------------------------------- Modal ---------------------------------- */

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: "sm" | "md" | "lg";
};

const modalWidths = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-2xl" };

export function Modal({ open, onClose, title, children, footer, width = "md" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-[10vh]">
          <motion.div
            className="fixed inset-0 bg-black/25 backdrop-blur-[2px] dark:bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal
            className={cx(
              "relative w-full overflow-hidden rounded-2xl bg-surface shadow-pop",
              modalWidths[width],
            )}
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 4 }}
            transition={{ type: "spring", duration: 0.28, bounce: 0.15 }}
          >
            {title && (
              <div className="flex items-center justify-between gap-4 px-5 pt-4 pb-2">
                <h2 className="text-[15px] font-semibold text-fg">{title}</h2>
                <Button variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar">
                  <XIcon />
                </Button>
              </div>
            )}
            <div className="px-5 pb-5">{children}</div>
            {footer && (
              <div className="flex justify-end gap-2 border-t border-line bg-surface-2 px-5 py-3">{footer}</div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
