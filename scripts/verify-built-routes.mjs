// Validate actual split chunks on a cold, throttled connection. No API or account is needed.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { preview } from "vite";

const server = await preview({
  configFile: false,
  logLevel: "silent",
  preview: { host: "127.0.0.1", port: 0 },
});
const host = "http://127.0.0.1:" + server.httpServer.address().port;
let browser;
try {
  browser = await chromium.launch();
  async function fresh() {
    const context = await browser.newContext({ locale: "en-US" });
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    const session = await context.newCDPSession(page);
    await session.send("Network.enable");
    await session.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 100,
      downloadThroughput: 200000,
      uploadThroughput: 100000,
    });
    return { context, page };
  }
  const coveUrl = "/try?game=qubit_cove";
  const tankUrl = "/try?band=g3_5";
  const urls = [
    "/",
    "/student-login",
    "/teacher-login",
    "/class-login",
    "/student/dashboard",
    "/try",
    coveUrl,
    tankUrl,
  ];
  for (const url of urls) {
    const { context, page } = await fresh();
    const requests = [];
    const errors = [];
    page.on("request", (r) => {
      if (r.url().includes("/assets/"))
        requests.push(new URL(r.url()).pathname);
    });
    page.on("pageerror", (e) => errors.push(e.message));
    // A school network can block external fonts; the featured game must still open.
    if (url === "/")
      await page.route("https://fonts.googleapis.com/**", (route) =>
        route.abort("failed"),
      );
    await page.goto(host + url, { waitUntil: "domcontentloaded" });
    const loaded = (pattern) => requests.some((path) => pattern.test(path));
    const coveEngine = /\/QubitCoveGame-[^/]+\.js$/;
    const tankEngine = /\/TankTrekGame-[^/]+\.js$/;
    const playTank = async () => {
      const start = page.getByRole("button", { name: /start mission/i });
      await start.waitFor();
      assert(
        !loaded(tankEngine),
        "The Tank Trek briefing must not load the maze",
      );
      await start.click();
      await page
        .getByRole("button", { name: "Forward", exact: true })
        .waitFor();
      assert(loaded(tankEngine), "Start Mission must load the maze");
    };

    if (url === "/" || url === coveUrl) {
      if (url === "/") await page.locator("h1#hero-heading").waitFor();
      await page
        .getByRole("img", { name: "Qubit Cove island playground" })
        .waitFor();
      await page.getByRole("button", { name: "Jump", exact: true }).waitFor();
      assert(
        loaded(coveEngine),
        "The featured game must load its playable island",
      );
      assert(
        !loaded(tankEngine),
        "Qubit Cove must not download the Tank Trek maze",
      );
      if (url === "/") {
        const fullScreen = page.getByRole("link", {
          name: "Open in full screen",
          exact: true,
        });
        assert.equal(await fullScreen.getAttribute("href"), coveUrl);
        await page.getByRole("button", { name: /Tank Trek.*3–5/i }).click();
        assert.equal(await fullScreen.getAttribute("href"), tankUrl);
        await playTank();
      }
    } else if (url === "/try" || url === tankUrl) {
      await playTank();
      assert(
        !loaded(coveEngine),
        "Tank Trek shared links must not load Qubit Cove",
      );
    } else {
      if (url === "/class-login")
        await page.getByPlaceholder("ABC123").waitFor();
      if (url === "/teacher-login")
        await page.getByPlaceholder("teacher@school.com").waitFor();
      if (url === "/student-login" || url === "/student/dashboard") {
        await page.getByPlaceholder("Email address").waitFor();
        assert.equal(new URL(page.url()).pathname, "/student-login");
      }
      assert(
        !loaded(coveEngine) && !loaded(tankEngine),
        "Login must not load either game",
      );
    }
    const wrong = requests.filter((path) =>
      /\/(?:TeacherDashboard|GotchaGearsGame|RhymeRideGame|QuantumQuestGame|BiomeBuddy|Waterworks)-/.test(
        path,
      ),
    );
    assert.deepEqual(wrong, []);
    assert.deepEqual(errors, []);
    console.log("PASS constrained", url, "=>", new URL(page.url()).pathname);
    await context.close();
  }
  const { context, page } = await fresh();
  const failure = "**/assets/TeacherLogin-*.js";
  await page.route(failure, (route) => route.abort("failed"));
  await page.goto(host + "/teacher-login", { waitUntil: "domcontentloaded" });
  await page
    .getByRole("alert")
    .getByText(/couldn’t load this page/)
    .waitFor();
  await page.unroute(failure);
  await page.getByRole("button", { name: "Reload page" }).click();
  await page.getByPlaceholder("teacher@school.com").waitFor();
  console.log(
    "PASS failed route chunk shows recovery; Reload restores Teacher Login",
  );
  await context.close();
} finally {
  try {
    await browser?.close();
  } finally {
    await new Promise((resolve, reject) =>
      server.httpServer.close((error) => (error ? reject(error) : resolve())),
    );
  }
}
