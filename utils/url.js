function normalizeAndValidateUrl(input) {
  if (!input || typeof input !== "string") {
    return {
      isValid: false,
      message: "Please enter a valid URL.",
    };
  }

  let candidate = input.trim();
  if (!candidate) {
    return {
      isValid: false,
      message: "The URL field cannot be empty.",
    };
  }

  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  let parsed;
  try {
    parsed = new URL(candidate);
  } catch (error) {
    return {
      isValid: false,
      message: "URL format is invalid. Try something like https://example.com",
    };
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return {
      isValid: false,
      message: "Only HTTP and HTTPS links are supported.",
    };
  }

  if (!parsed.hostname || parsed.hostname.includes(" ")) {
    return {
      isValid: false,
      message: "Please enter a complete URL with a valid domain.",
    };
  }

  return {
    isValid: true,
    normalizedUrl: parsed.toString(),
  };
}

module.exports = {
  normalizeAndValidateUrl,
};

