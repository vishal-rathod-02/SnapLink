const bcrypt = require("bcryptjs");

const User = require("../models/User");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

function sanitizeName(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function sanitizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function buildSignupInput(payload = {}) {
  return {
    name: sanitizeName(payload.name),
    email: sanitizeEmail(payload.email),
    password: String(payload.password || ""),
    confirmPassword: String(payload.confirmPassword || ""),
  };
}

function buildLoginInput(payload = {}) {
  return {
    email: sanitizeEmail(payload.email),
    password: String(payload.password || ""),
  };
}

function validateSignupInput(payload) {
  const input = buildSignupInput(payload);

  if (input.name.length < 2) {
    return {
      isValid: false,
      message: "Please enter your name using at least 2 characters.",
      values: {
        name: input.name,
        email: input.email,
      },
    };
  }

  if (!EMAIL_PATTERN.test(input.email)) {
    return {
      isValid: false,
      message: "Please enter a valid email address.",
      values: {
        name: input.name,
        email: input.email,
      },
    };
  }

  if (input.password.length < MIN_PASSWORD_LENGTH) {
    return {
      isValid: false,
      message: `Use a password with at least ${MIN_PASSWORD_LENGTH} characters.`,
      values: {
        name: input.name,
        email: input.email,
      },
    };
  }

  if (input.password !== input.confirmPassword) {
    return {
      isValid: false,
      message: "Your password confirmation does not match.",
      values: {
        name: input.name,
        email: input.email,
      },
    };
  }

  return {
    isValid: true,
    values: {
      name: input.name,
      email: input.email,
    },
    input,
  };
}

function validateLoginInput(payload) {
  const input = buildLoginInput(payload);

  if (!EMAIL_PATTERN.test(input.email)) {
    return {
      isValid: false,
      message: "Please enter a valid email address.",
      values: {
        email: input.email,
      },
    };
  }

  if (!input.password) {
    return {
      isValid: false,
      message: "Please enter your password.",
      values: {
        email: input.email,
      },
    };
  }

  return {
    isValid: true,
    values: {
      email: input.email,
    },
    input,
  };
}

async function registerUser(payload) {
  const validation = validateSignupInput(payload);
  if (!validation.isValid) {
    return validation;
  }

  const existingUser = await User.findOne({ email: validation.input.email }).select("_id").lean();
  if (existingUser) {
    return {
      isValid: false,
      message: "An account with that email already exists. Please sign in instead.",
      values: validation.values,
    };
  }

  const passwordHash = await bcrypt.hash(validation.input.password, 12);
  const user = await User.create({
    name: validation.input.name,
    email: validation.input.email,
    passwordHash,
  });

  return {
    isValid: true,
    user,
  };
}

async function authenticateUser(payload) {
  const validation = validateLoginInput(payload);
  if (!validation.isValid) {
    return validation;
  }

  const user = await User.findOne({ email: validation.input.email }).select(
    "name email passwordHash createdAt lastLoginAt",
  );

  if (!user) {
    return {
      isValid: false,
      message: "We could not match that email and password.",
      values: validation.values,
    };
  }

  const isPasswordValid = await bcrypt.compare(validation.input.password, user.passwordHash);
  if (!isPasswordValid) {
    return {
      isValid: false,
      message: "We could not match that email and password.",
      values: validation.values,
    };
  }

  user.lastLoginAt = new Date();
  await user.save();

  return {
    isValid: true,
    user,
  };
}

module.exports = {
  authenticateUser,
  buildLoginInput,
  buildSignupInput,
  registerUser,
};
