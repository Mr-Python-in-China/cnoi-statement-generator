export default import.meta.glob<true, "raw">("./*.typ", {
  query: "raw",
  import: "default",
  eager: true,
});
