export const SESSION_COOKIE_NAME = "flowcharts_session";

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 días

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_MAX_AGE_SECONDS,
};
