export default {
  test: {
    include: ['test/**/*.test.js'],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
};
