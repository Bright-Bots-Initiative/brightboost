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
  const urls = [
    "/",
    "/student-login",
    "/teacher-login",
    "/class-login",
    "/student/dashboard",
    "/try",
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
    await page.goto(host + url, { waitUntil: "domcontentloaded" });
    if (url === "/")
      await page.getByRole("heading", { level: 1 }).first().waitFor();
    if (url === "/class-login") await page.getByPlaceholder("ABC123").waitFor();
    if (url === "/teacher-login")
      await page.getByPlaceholder("teacher@school.com").waitFor();
    if (url === "/student-login" || url === "/student/dashboard") {
      await page.getByPlaceholder("Email address").waitFor();
      assert.equal(new URL(page.url()).pathname, "/student-login");
    }
    if (url === "/try") {
      const start = page.getByRole("button", { name: /start mission/i });
      await start.click();
      await start.waitFor({ state: "hidden" });
      assert(requests.some((x) => /\/TankTrekGame-/.test(x)));
    }
    const wrong = requests.filter(
      (x) =>
        /\/(?:TeacherDashboard|GotchaGearsGame|RhymeRideGame|QuantumQuestGame|BiomeBuddy|Waterworks)-/.test(
          x,
        ) ||
        (url !== "/try" && /\/TankTrekGame-/.test(x)),
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
