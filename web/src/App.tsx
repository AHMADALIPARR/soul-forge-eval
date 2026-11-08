import { Console } from "./components/soul/Console";
import { EvalConsole } from "./components/soul/EvalConsole";

export function App() {
  return (
    <div className="sf-shell">
      <Console />
      <div className="sf-doc">
        <h2>The eval panel — one contract</h2>
        <p>
          The transcript above is a recording. It does not grade anyone. Grading lives in GDScript:{" "}
          <code>EvalEngine</code>, <code>VerdictChain</code>, and the demo writer. This page sends the template
          contract and shows what that engine seals. It does not recompute a pass, a trial count, or a hash.
        </p>
        <EvalConsole />
        <h2>How a verdict is reached</h2>
        <ol>
          <li>
            A <strong>writer</strong> produces output. It never sees the checks and it never grades itself. The demo
            writer is right about arithmetic, honest about being a stand-in, flaky one time in four, and it makes one
            confident false claim.
          </li>
          <li>
            Each enabled template grades on its own. An empty batch, or a reliability run with zero trials, is{" "}
            <strong>INVALID</strong>, never a pass. Judge Alignment can be switched on; the engine still refuses to
            trust a judge.
          </li>
          <li>
            Every verdict is appended to a numbered SHA-256 chain before it is reported. Replacing a seal makes the
            engine's own verify fail.
          </li>
          <li>
            <strong>HELD {"->"} revise</strong> means a gate tripped. That is the panel working.
          </li>
        </ol>
      </div>
    </div>
  );
}
