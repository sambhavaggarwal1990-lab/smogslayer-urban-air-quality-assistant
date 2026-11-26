import { CARD_CLASS } from "../styles";

/** A titled bullet list of tips (used for the indoor hacks and the sustainable alternatives). */
export function TipList({ title, tips }: { title: string; tips: string[] }) {
  return (
    <section className={CARD_CLASS}>
      <h2 className="text-base font-bold text-white">{title}</h2>
      <ul className="list-inside list-disc space-y-2.5 text-sm leading-relaxed text-slate-200">
        {tips.map((tip, index) => (
          <li key={`${index}-${tip}`}>{tip}</li>
        ))}
      </ul>
    </section>
  );
}
