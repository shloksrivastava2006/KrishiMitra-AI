// Label + input + error message wired together for accessibility.
export default function Field({ id, label, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      {children}
      {error && <p id={`${id}-error`} role="alert" className="field-error">{error}</p>}
    </div>
  );
}
