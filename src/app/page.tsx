import Image from "next/image";

const capabilities = ["算力撮合", "AI Token", "可信履约"];

export default function HomePage() {
  return (
    <main className="launch-page">
      <div aria-hidden="true" className="launch-grid" />
      <div aria-hidden="true" className="ambient ambient-left" />
      <div aria-hidden="true" className="ambient ambient-right" />

      <header className="launch-header">
        <p className="wordmark">
          <span aria-hidden="true" className="wordmark-mark" />
          <span>Compute Exchange</span>
        </p>

        <p className="build-state">
          <span aria-hidden="true" className="build-state-dot" />
          平台构建中
        </p>
      </header>

      <section aria-labelledby="launch-title" className="launch-hero">
        <div className="hero-copy">
          <p className="hero-kicker">正在构建未来</p>

          <h1 id="launch-title">
            <span className="hero-line">
              <span>让算力，成为</span>
            </span>
            <span className="hero-line hero-line-accent">
              <span>可验证的生产力</span>
            </span>
          </h1>

          <p className="hero-summary">
            连接可信算力、AI Token 与数字履约，
            <br className="summary-break" />
            让每一份算力都有清晰去向。
          </p>
        </div>

        <figure aria-hidden="true" className="hero-visual">
          <div className="visual-aura" />
          <div className="visual-art">
            <Image
              alt=""
              className="visual-image"
              height={1402}
              priority
              sizes="(max-width: 767px) 86vw, 54vw"
              src="/images/computational-dawn.avif"
              width={1122}
            />
          </div>
          <span className="orbit orbit-one">
            <span />
          </span>
          <span className="orbit orbit-two">
            <span />
          </span>
          <span className="orbit orbit-three">
            <span />
          </span>
          <span className="light-sweep" />
        </figure>
      </section>

      <footer className="launch-footer">
        <ul aria-label="核心能力">
          {capabilities.map((capability, index) => (
            <li key={capability}>
              <span aria-hidden="true">0{index + 1}</span>
              {capability}
            </li>
          ))}
        </ul>
        <p>AI Infrastructure · 2026</p>
      </footer>
    </main>
  );
}
