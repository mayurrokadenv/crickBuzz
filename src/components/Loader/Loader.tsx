import "./Loader.css";

type LoaderSize = "small" | "medium" | "large";

type LoaderProps = {
  label?: string;
  size?: LoaderSize;
  fullWidth?: boolean;
};

function Loader({
  label = "Loading...",
  size = "medium",
  fullWidth = false,
}: LoaderProps) {
  return (
    <div
      className={`app-loader app-loader--${size}${fullWidth ? " app-loader--full-width" : ""}`}
      role="status"
      aria-live="polite"
    >
      <span className="app-loader__spinner" aria-hidden="true" />
      {label && <span className="app-loader__label">{label}</span>}
    </div>
  );
}

export default Loader;
