'use client';

export function StatusSelect({
  value,
  options,
  action,
}: {
  value: string;
  options: { value: string; label: string }[];
  action: (formData: FormData) => void;
}) {
  return (
    <form action={action}>
      <select
        name="status"
        defaultValue={value}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="field-lg !py-2 !px-3 text-sm min-h-0"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </form>
  );
}
