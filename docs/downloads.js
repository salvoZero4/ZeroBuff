const releases = "https://api.github.com/repos/salvoZero4/ZeroBuff/releases";
const assetPrefix = "https://github.com/salvoZero4/ZeroBuff/releases/download/";

async function showAndroidBuild() {
  const status = document.querySelector("#android-status");
  const link = document.querySelector("#android-download");

  try {
    const response = await fetch(`${releases}?per_page=30`, {
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) throw new Error("Release list unavailable");

    const published = (await response.json()).filter((release) => !release.draft);
    const newestFirst = published.sort((first, second) =>
      Date.parse(second.published_at) - Date.parse(first.published_at)
    );
    const candidates = newestFirst.filter((release) => !release.prerelease)
      .concat(newestFirst.filter((release) => release.prerelease));

    for (const release of candidates) {
      const apks = release.assets.filter((asset) =>
        asset.state === "uploaded" && /\.apk$/i.test(asset.name) &&
        asset.browser_download_url.startsWith(assetPrefix)
      );
      const apk = apks.find((asset) => /universal/i.test(asset.name));
      const label = release.prerelease ? `${release.tag_name} preview` : release.tag_name;

      if (apk || apks.length === 1) {
        link.href = (apk ?? apks[0]).browser_download_url;
        link.textContent = "Download APK";
        status.textContent = `${label} · APK`;
        return;
      }

      if (apks.length > 1) {
        link.href = `https://github.com/salvoZero4/ZeroBuff/releases/tag/${encodeURIComponent(release.tag_name)}`;
        link.textContent = "Choose APK";
        status.textContent = `${label} · Multiple Android builds`;
        return;
      }
    }

    status.textContent = "No Android APK found in recent releases.";
  } catch {
    status.textContent = "Couldn’t check for builds. Browse GitHub Releases directly.";
  }
}

async function showIosBuild() {
  try {
    const response = await fetch("./builds.json", { signal: AbortSignal.timeout(4000) });
    if (!response.ok) return;

    const { testflight } = await response.json();
    if (!testflight) return;

    const url = new URL(testflight);
    if (url.origin !== "https://testflight.apple.com" || !/^\/join\/[a-z\d]+\/?$/i.test(url.pathname)) return;

    const link = document.querySelector("#ios-download");
    link.href = url.href;
    link.textContent = "Join TestFlight";
    link.classList.replace("text-link", "button");
    document.querySelector("#ios-status").textContent = "Install the beta through Apple TestFlight.";
  } catch {
    // The release notes link remains available.
  }
}

showAndroidBuild();
showIosBuild();
