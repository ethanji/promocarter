export default {
  reactStrictMode: true,
  webpack(config, { isServer }) {
    if (isServer) {
      const prev = config.externals ?? [];
      config.externals = [...(Array.isArray(prev) ? prev : [prev]), ({ request }, cb) =>
        request?.startsWith("node:") ? cb(null, "commonjs " + request) : cb()];
    }
    return config;
  },
};
