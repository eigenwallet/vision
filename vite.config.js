/** @type {import("vite").UserConfig} */
export default {
  build: {
    lib: {
      entry: "latex.css",
      formats: ["es"],
      fileName: "index",
    },
  },
};
