import app from "./app.ts";
app.listen(Number(process.env.PORT ?? 4310), "127.0.0.1", () =>
  console.log("Postmod: http://127.0.0.1:" + (process.env.PORT ?? 4310)),
);
