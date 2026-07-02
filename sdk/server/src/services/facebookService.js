async function verifyFacebookAccessToken(accessToken) {
  if (!accessToken) {
    throw new Error("Missing Facebook access token");
  }

  const url = new URL("https://graph.facebook.com/me");
  url.searchParams.set("fields", "id,name");
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url);
  const payload = await response.json();

  if (!response.ok || !payload.id) {
    const message = payload.error?.message || "Invalid Facebook token";
    throw new Error(message);
  }

  return {
    fbUserId: String(payload.id),
    fbName: payload.name || "",
  };
}

module.exports = { verifyFacebookAccessToken };
