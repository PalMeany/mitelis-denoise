const api = globalThis.browser ?? globalThis.chrome;

const OFF_CLASS = "mnk-off";

function apply(enabled) {
  document.documentElement.classList.toggle(OFF_CLASS, !enabled);
}

api.storage.local
  .get({ enabled: true })
  .then((state) => apply(state.enabled !== false))
  .catch(() => apply(true));

api.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.enabled) {
    apply(changes.enabled.newValue !== false);
  }
});
