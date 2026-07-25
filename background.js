const api = globalThis.browser ?? globalThis.chrome;

async function isEnabled() {
  try {
    const { enabled } = await api.storage.local.get({ enabled: true });
    return enabled !== false;
  } catch {
    return true;
  }
}

async function paintButton(enabled) {
  await api.action.setBadgeText({ text: enabled ? "" : "OFF" });
  await api.action.setBadgeBackgroundColor({ color: "#c0392b" });
  await api.action.setTitle({
    title: enabled
      ? "Mitelis Noise Killer: шум скрыт — клик, чтобы показать"
      : "Mitelis Noise Killer: выключен — клик, чтобы скрыть шум",
  });
}

api.action.onClicked.addListener(async () => {
  const enabled = !(await isEnabled());
  await api.storage.local.set({ enabled });
  await paintButton(enabled);
});

api.runtime.onInstalled.addListener(async () => paintButton(await isEnabled()));
api.runtime.onStartup.addListener(async () => paintButton(await isEnabled()));
