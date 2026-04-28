function normalizeFlashMessages(messages) {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .map((message) => ({
      type: String(message?.type || "info").trim() || "info",
      text: String(message?.text || "").trim(),
    }))
    .filter((message) => message.text);
}

function pushFlashMessage(req, message) {
  if (!req.session) {
    return;
  }

  const messages = normalizeFlashMessages(req.session.flashMessages);
  messages.push({
    type: message?.type,
    text: message?.text,
  });
  req.session.flashMessages = messages;
}

function consumeFlashMessages(req) {
  if (!req.session) {
    return [];
  }

  const messages = normalizeFlashMessages(req.session.flashMessages);
  delete req.session.flashMessages;
  return messages;
}

module.exports = {
  consumeFlashMessages,
  pushFlashMessage,
};
