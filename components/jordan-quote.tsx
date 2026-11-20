const QUOTE = "If you quit once, it becomes a habit. Never quit.";

/** A quiet handwritten quote; the words are revealed as if being written. */
export function JordanQuote() {
  return (
    <figure className="quote-stage mx-auto mt-10 w-full max-w-[660px] px-2 text-center sm:mt-14">
      <blockquote className="quote-hand">{QUOTE}</blockquote>
      <figcaption className="quote-by">
        <span aria-hidden="true" className="quote-rule" />
        Michael Jordan
        <span aria-hidden="true" className="quote-rule" />
      </figcaption>
    </figure>
  );
}
