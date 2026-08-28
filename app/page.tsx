"use client";

import { useState } from "react";

const words = ["Imagine", "Create", "Explore", "Repeat"];

export default function Home() {
  const [wordIndex, setWordIndex] = useState(0);

  const showNextWord = () => {
    setWordIndex((currentIndex) => (currentIndex + 1) % words.length);
  };

  return (
    <main className="page-shell">
      <div className="glow glow-one" aria-hidden="true" />
      <div className="glow glow-two" aria-hidden="true" />

      <section className="word-card" aria-labelledby="changing-title">
        <p className="eyebrow">A tiny word machine</p>

        <div className="title-wrap">
          <span className="title-number" aria-hidden="true">
            0{wordIndex + 1}
          </span>
          <h1 id="changing-title" aria-live="polite" key={words[wordIndex]}>
            {words[wordIndex]}
          </h1>
        </div>

        <p className="description">
          One click. One new word. A small reminder that change can be simple.
        </p>

        <button type="button" onClick={showNextWord}>
          <span>Next word</span>
          <span className="arrow" aria-hidden="true">
            →
          </span>
        </button>

        <div className="progress" aria-hidden="true">
          {words.map((word, index) => (
            <span
              className={index === wordIndex ? "active" : ""}
              key={word}
            />
          ))}
        </div>
      </section>

      <p className="corner-note" aria-hidden="true">
        Click · Change · Continue
      </p>
    </main>
  );
}
