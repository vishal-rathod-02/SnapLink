function notFoundHandler(req, res) {
  res.status(404).render("not-found", {
    pageTitle: "Page Not Found",
    activePage: "",
    missingCode: null,
  });
}

module.exports = {
  notFoundHandler,
};

