"use client";

type FormInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function FormInput({ label, value, onChange, placeholder }: FormInputProps) {
  return (
    <div className="form-input">
      <label className="form-label">{label}</label>
      <input
        type="text"
        className="form-field"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
