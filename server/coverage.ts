import { parse } from "acorn";
import { simple } from "acorn-walk";
export function hasTests(code: string): boolean {
  try {
    let found = false;
    simple(
      parse(code, {
        ecmaVersion: "latest",
        allowAwaitOutsideFunction: true,
        allowReturnOutsideFunction: true,
      }),
      {
        CallExpression(node: any) {
          const c = node.callee;
          if (
            c.type === "MemberExpression" &&
            c.object?.name === "pm" &&
            (c.computed ? c.property?.value : c.property?.name) === "test"
          )
            found = true;
        },
      },
    );
    return found;
  } catch {
    return false;
  }
}
export function analyzeCollection(collection: any) {
  let requests = 0,
    pre = 0,
    tests = 0;
  function walk(item: any, inheritedPre = false, inheritedTests = false) {
    let p = inheritedPre,
      t = inheritedTests;
    for (const event of item.event ?? []) {
      if (event.disabled) continue;
      const exec = event.script?.exec;
      const code = Array.isArray(exec) ? exec.join("\n") : (exec ?? "");
      if (event.listen === "prerequest" && code.trim()) p = true;
      if (event.listen === "test" && hasTests(code)) t = true;
    }
    if (item.request) {
      requests++;
      if (p) pre++;
      if (t) tests++;
    }
    for (const child of item.item ?? []) walk(child, p, t);
  }
  walk(collection);
  return { requests, pre, tests };
}
