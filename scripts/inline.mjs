import { readFile, writeFile } from "node:fs/promises";
let html = await readFile("dist/index.html", "utf8");
for (const match of [
  ...html.matchAll(/<script[^>]+src="([^"]+)"[^>]*><\/script>/g),
]) {
  const code = await readFile("dist" + match[1], "utf8");
  html = html.replace(
    match[0],
    () =>
      '<script type="module">' +
      code.replaceAll("</script", "<\\/script") +
      "</script>",
  );
}
for (const match of [
  ...html.matchAll(/<link[^>]+href="([^"]+\.css)"[^>]*>/g),
]) {
  const css = await readFile("dist" + match[1], "utf8");
  html = html.replace(match[0], () => "<style>" + css + "</style>");
}
await writeFile("dist/index.html", html);
