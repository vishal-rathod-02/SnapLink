(function initAppUi() {
  const THEME_KEY = "snaplink-theme";
  const feedbackEl = document.getElementById("copyFeedback");
  const themeToggleBtn = document.getElementById("themeToggle");
  let feedbackTimer = null;

  function getPreferredTheme() {
    try {
      const savedTheme = localStorage.getItem(THEME_KEY);
      if (savedTheme === "dark" || savedTheme === "light") {
        return savedTheme;
      }
    } catch (error) {}

    if (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      return "dark";
    }

    return "light";
  }

  function updateThemeToggleUi(theme) {
    if (!themeToggleBtn) {
      return;
    }

    const text = themeToggleBtn.querySelector(".theme-toggle-text");
    const isDark = theme === "dark";

    themeToggleBtn.setAttribute("aria-pressed", String(isDark));
    themeToggleBtn.setAttribute(
      "aria-label",
      isDark ? "Switch to light mode" : "Switch to dark mode",
    );

    if (text) {
      text.textContent = isDark ? "Light Mode" : "Dark Mode";
    }
  }

  function applyTheme(theme, shouldPersist = true) {
    document.documentElement.setAttribute("data-theme", theme);
    updateThemeToggleUi(theme);

    if (shouldPersist) {
      try {
        localStorage.setItem(THEME_KEY, theme);
      } catch (error) {}
    }
  }

  const initialTheme =
    document.documentElement.getAttribute("data-theme") || getPreferredTheme();
  applyTheme(initialTheme, false);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      const activeTheme =
        document.documentElement.getAttribute("data-theme") || "light";
      const nextTheme = activeTheme === "dark" ? "light" : "dark";
      applyTheme(nextTheme, true);
    });
  }

  function syncNavHeight() {
    const navbar = document.querySelector(".glass-nav");
    if (!navbar) {
      return;
    }

    const navHeight = Math.ceil(navbar.getBoundingClientRect().height);
    document.documentElement.style.setProperty("--nav-height", `${navHeight}px`);
  }

  function showFeedback(message, variant = "success") {
    if (!feedbackEl) {
      return;
    }

    feedbackEl.classList.remove("is-error");
    if (variant === "error") {
      feedbackEl.classList.add("is-error");
    }

    feedbackEl.textContent = message;
    feedbackEl.classList.add("show");

    if (feedbackTimer) {
      clearTimeout(feedbackTimer);
    }

    feedbackTimer = setTimeout(() => {
      feedbackEl.classList.remove("show");
    }, 1700);
  }

  async function copyText(text) {
    if (!text) {
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      showFeedback("Copied to clipboard");
    } catch (error) {
      showFeedback("Copy failed", "error");
    }
  }

  syncNavHeight();
  window.addEventListener("resize", syncNavHeight);

  document.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", () => {
      copyText(button.getAttribute("data-copy"));
    });
  });

  document.querySelectorAll("[data-fill-width]").forEach((element, index) => {
    const rawValue = Number(element.getAttribute("data-fill-width"));
    const safeValue = Number.isFinite(rawValue) ? Math.min(100, Math.max(0, rawValue)) : 0;
    const delay = Math.min(420, index * 45);
    setTimeout(() => {
      element.style.width = `${safeValue}%`;
    }, delay);
  });

  const revealItems = document.querySelectorAll(".reveal");
  if (revealItems.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 },
    );

    revealItems.forEach((item) => observer.observe(item));
  }

  const shortenForm = document.getElementById("shortenForm");
  if (shortenForm) {
    let hasStartedSubmit = false;
    shortenForm.addEventListener("submit", (event) => {
      if (hasStartedSubmit) {
        return;
      }

      event.preventDefault();
      const submitBtn = shortenForm.querySelector("button[type='submit']");
      if (!submitBtn) {
        shortenForm.submit();
        return;
      }

      submitBtn.disabled = true;
      submitBtn.classList.add("is-loading");
      submitBtn.setAttribute("aria-busy", "true");

      const label = submitBtn.querySelector(".btn-label");
      if (label) {
        label.textContent = "Generating";
      }

      hasStartedSubmit = true;
      setTimeout(() => {
        shortenForm.submit();
      }, 620);
    });
  }

  const deleteConfirmModal = document.getElementById("deleteConfirmModal");
  const deleteConfirmShortUrlEl = document.getElementById("deleteConfirmShortUrl");
  const deleteConfirmOriginalUrlEl = document.getElementById(
    "deleteConfirmOriginalUrl",
  );
  const deleteConfirmSubmitBtn = document.getElementById("deleteConfirmSubmit");
  let pendingDeleteForm = null;
  let lastDeleteTrigger = null;

  function isDeleteModalOpen() {
    return deleteConfirmModal?.classList.contains("is-open");
  }

  function closeDeleteModal() {
    if (!deleteConfirmModal) {
      return;
    }

    deleteConfirmModal.classList.remove("is-open");
    deleteConfirmModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("delete-modal-open");

    pendingDeleteForm = null;
    if (deleteConfirmSubmitBtn) {
      deleteConfirmSubmitBtn.disabled = false;
      deleteConfirmSubmitBtn.innerHTML = '<i class="bi bi-trash3 me-1"></i>Delete Link';
    }

    if (lastDeleteTrigger) {
      lastDeleteTrigger.focus();
      lastDeleteTrigger = null;
    }
  }

  function openDeleteModal({ form, trigger }) {
    if (!deleteConfirmModal || !deleteConfirmSubmitBtn || !form || !trigger) {
      form?.submit();
      return;
    }

    pendingDeleteForm = form;
    lastDeleteTrigger = trigger;

    const shortUrl = trigger.getAttribute("data-short-url") || "Selected short URL";
    const originalUrl = trigger.getAttribute("data-original-url") || "N/A";

    if (deleteConfirmShortUrlEl) {
      deleteConfirmShortUrlEl.textContent = shortUrl;
    }
    if (deleteConfirmOriginalUrlEl) {
      deleteConfirmOriginalUrlEl.textContent = originalUrl;
    }

    deleteConfirmModal.classList.add("is-open");
    deleteConfirmModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("delete-modal-open");
    deleteConfirmSubmitBtn.focus();
  }

  document.querySelectorAll("[data-delete-url-trigger]").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const form = trigger.closest("form");
      openDeleteModal({ form, trigger });
    });
  });

  document.querySelectorAll("[data-delete-modal-close]").forEach((closeBtn) => {
    closeBtn.addEventListener("click", closeDeleteModal);
  });

  if (deleteConfirmModal) {
    deleteConfirmModal.addEventListener("click", (event) => {
      if (event.target === deleteConfirmModal) {
        closeDeleteModal();
      }
    });
  }

  if (deleteConfirmSubmitBtn) {
    deleteConfirmSubmitBtn.addEventListener("click", () => {
      if (!pendingDeleteForm) {
        closeDeleteModal();
        return;
      }

      deleteConfirmSubmitBtn.disabled = true;
      deleteConfirmSubmitBtn.innerHTML =
        '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Deleting';
      pendingDeleteForm.submit();
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isDeleteModalOpen()) {
      closeDeleteModal();
    }
  });

  if (window.bootstrap) {
    document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((el) => {
      new window.bootstrap.Tooltip(el);
    });
  }
})();
