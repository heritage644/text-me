import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "../../lib/cn";
import { errorTextClass, inputBase, labelClass } from "./styles";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
  /** Rendered on the right of the label row (e.g. "Forgot password?"). */
  labelAction?: ReactNode;
  /** Rendered inside the input on the right (e.g. Show/Hide). */
  trailing?: ReactNode;
};

/** Labelled input with the Login page's styling and error pattern. */
export function TextField({ label, error, hint, labelAction, trailing, id, className, ...rest }: TextFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className={className}>
      <div className={cn("flex items-center justify-between", labelAction ? "mb-2" : undefined)}>
        <label htmlFor={inputId} className={labelAction ? "text-sm font-medium" : labelClass}>
          {label}
        </label>
        {labelAction}
      </div>
      <div className="relative">
        <input
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={cn(inputBase, trailing ? "pr-16" : undefined, error ? "border-badge-alert" : "border-divider")}
          {...rest}
        />
        {trailing}
      </div>
      {error ? (
        <p id={`${inputId}-error`} className={errorTextClass}>
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1.5 text-sm text-fg-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type PasswordFieldProps = Omit<TextFieldProps, "type" | "trailing">;

export function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      {...props}
      type={visible ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 rounded-r-xl px-4 text-sm text-fg-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          {visible ? "Hide" : "Show"}
        </button>
      }
    />
  );
}
