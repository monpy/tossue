export default defineEventHandler(() => {
  throw createError({
    statusCode: 500,
    statusMessage: "Internal Server Error",
    message: "This is a simulated server error for testing Tossue",
  });
});
