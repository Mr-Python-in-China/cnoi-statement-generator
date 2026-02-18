export default import.meta.glob<true, "raw">("./*", {
  query: "raw",
  import: "default",
  eager: true,
  base: "./typst",
});
