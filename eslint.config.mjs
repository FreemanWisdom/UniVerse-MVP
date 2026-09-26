import nextConfig from "eslint-config-next";

const eslintConfig = [
  ...nextConfig,
  {
    ignores: [
      "*.html",
      "icos-enhancements.js",
      "notifications-sw.js",
      "send-push.ts",
      "node_modules/",
      ".next/",
      "out/",
    ],
  },
];

export default eslintConfig;
