"use client";

type SubmitButtonProps = {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "danger";
};

export function SubmitButton({ label, onClick, variant = "primary" }: SubmitButtonProps) {
  return (
    <button
      type="button"
      className={`submit-button submit-button--${variant}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
