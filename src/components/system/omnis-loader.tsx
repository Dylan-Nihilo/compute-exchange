import styles from "./omnis-loader.module.css";

type OmnisLoaderProps = {
  className?: string;
  label?: string;
  size?: "sm" | "md";
};

const letterPaths = [
  "M28 8a24 24 0 1 1 0 48 24 24 0 1 1 0-48",
  "M64 56V8l20 28 20-28v48",
  "M120 56V8l36 48V8",
  "M166 8h16m-8 0v48m-8 0h16",
  "M232 14c-4-4-10-6-16-6-11 0-18 5-18 14 0 8 7 11 18 13 11 2 18 5 18 13 0 6-7 8-18 8-8 0-15-3-19-8",
] as const;

export function OmnisLoader({
  className,
  label = "正在加载",
  size = "md",
}: OmnisLoaderProps) {
  return (
    <div
      aria-busy="true"
      aria-label={label}
      aria-live="polite"
      className={[styles.root, className].filter(Boolean).join(" ")}
      data-size={size}
      role="status"
    >
      <svg
        aria-hidden="true"
        className={styles.mark}
        focusable="false"
        viewBox="0 0 242 64"
      >
        <g className={styles.track}>
          {letterPaths.map((path) => (
            <path d={path} key={path} pathLength="100" />
          ))}
        </g>
        <g className={styles.ink}>
          {letterPaths.map((path) => (
            <path d={path} key={path} pathLength="100" />
          ))}
        </g>
      </svg>
      <span className={styles.label}>{label}</span>
    </div>
  );
}
