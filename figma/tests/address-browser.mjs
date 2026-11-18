import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const output = process.env.PROTOTYPE_OUTPUT_DIR || "/tmp/rideshare-address-results";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1200 } });
page.setDefaultTimeout(12000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const base = process.env.PROTOTYPE_BASE_URL || "http://localhost:3000";
const frame = (kind) => page.locator(`[data-${kind}-screen]:visible`);
const wait = async (kind, name) => {
  await page.locator(`[data-${kind}-screen="${name}"]:visible`).waitFor();
  return frame(kind);
};
const click = (root, name) => root.getByRole("button", { name, exact: true }).click();
async function choose(root, label, query, option) {
  await root.getByRole("combobox", { name: new RegExp("^" + label) }).fill(query);
  await root.getByRole("option").filter({ hasText: option }).first().click();
}
try {
  await page.goto(base, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /^06.*Bảng điều khiển Nhà xe/ }).click();
  await page.getByRole("button", { name: /^CO-02/ }).click();
  let c = await wait("company", "register");
  assert.equal(await c.getByRole("combobox", { name: /^Xã\/Phường/ }).isDisabled(), true);
  await choose(c, "Tỉnh/Thành phố", "da nang", "Thành phố Đà Nẵng");
  await choose(c, "Xã/Phường/Đặc khu", "hai chau", "Phường Hải Châu");
  await c.getByRole("textbox", { name: /^Địa chỉ chi tiết/ }).fill("120 Nguyễn Văn Linh");
  await choose(c, "Tỉnh/Thành phố", "hue", "Thành phố Huế");
  assert.equal(await c.getByRole("combobox", { name: /^Xã\/Phường/ }).inputValue(), "");
  await c.getByRole("combobox", { name: /^Xã\/Phường/ }).fill("Hải Châu");
  assert.equal(await c.getByRole("option").count(), 0);
  await choose(c, "Xã/Phường/Đặc khu", "thuan hoa", "Phường Thuận Hóa");
  assert.equal(
    await c.getByRole("textbox", { name: /^Địa chỉ chi tiết/ }).inputValue(),
    "120 Nguyễn Văn Linh",
  );
  assert.equal(await c.getByRole("button", { name: "Chọn trên bản đồ", exact: true }).count(), 0);
  console.log(
    "PASS administrative province/commune search, dependency reset and detail preservation",
  );

  await page.getByRole("button", { name: /^08.*Nguyên mẫu tương tác/ }).click();
  await page.getByRole("button", { name: "Bắt đầu Hành khách", exact: true }).click();
  let p = await wait("passenger", "login");
  await p.getByRole("textbox", { name: /Email hoặc số điện thoại/ }).fill("0905123456");
  await p.getByLabel("Mật khẩu", { exact: true }).fill("Demo12345");
  await click(p, "Đăng nhập");
  p = await wait("passenger", "home");
  await click(p, "Chọn điểm đi");
  let dialog = p.getByRole("dialog");
  await choose(
    dialog,
    "Địa điểm tìm chuyến",
    "254 Nguyen Van Linh",
    "254 Nguyễn Văn Linh, Đà Nẵng",
  );
  await click(dialog, "Sử dụng địa điểm");
  await click(p, "Chọn điểm đến");
  dialog = p.getByRole("dialog");
  await choose(dialog, "Địa điểm tìm chuyến", "Bến xe phía Nam Huế", "Bến xe phía Nam Huế");
  await click(dialog, "Sử dụng địa điểm");
  await click(p, "Tìm chuyến");
  p = await wait("passenger", "results");
  await p
    .getByRole("button")
    .filter({ hasText: "Nhà xe Thành Công" })
    .filter({ hasText: "07:30" })
    .click();
  p = await wait("passenger", "details");
  await click(p, "Đặt chỗ");
  p = await wait("passenger", "booking");
  assert.equal(await p.getByRole("combobox", { name: /^Tỉnh\/Thành phố/ }).count(), 0);
  assert.equal(
    await p.getByRole("combobox", { name: /^Điểm đón/ }).inputValue(),
    "254 Nguyễn Văn Linh, Đà Nẵng",
  );
  const pickup = p.getByRole("group", { name: "Điểm đón", exact: true });
  await click(pickup, "Chọn trên bản đồ");
  const map = pickup.getByRole("img", { name: "Bản đồ chọn tọa độ đón trả", exact: true });
  await map.scrollIntoViewIfNeeded();
  const bounds = await map.boundingBox();
  await map.click({ position: { x: bounds.width * 0.65, y: bounds.height * 0.4 } });
  await pickup
    .getByRole("textbox", { name: /^Mô tả địa chỉ tại vị trí đã chọn/ })
    .fill("120 Điện Biên Phủ, Đà Nẵng");
  await pickup
    .getByRole("textbox", { name: /^Chỉ dẫn/ })
    .fill("Đợi tại cổng số 2, gọi trước 5 phút");
  const gps = (await pickup.locator("[data-location-gps]").innerText()).replace("GPS: ", "");
  assert.match(gps, /^\d+\.\d{6}, \d+\.\d{6}$/);
  assert.equal(await pickup.getByRole("combobox", { name: /^Tỉnh\/Thành phố/ }).count(), 0);
  await click(pickup, "Ẩn bản đồ");
  await p.getByRole("textbox", { name: /^Số điện thoại/ }).fill("0905123456");
  await click(p, "Xem lại đặt chỗ");
  p = await wait("passenger", "confirm");
  await p.getByText("Đợi tại cổng số 2, gọi trước 5 phút", { exact: true }).waitFor();
  await click(p, "Xác nhận đặt chỗ");
  p = await wait("passenger", "success");
  const ref = await p.locator(".font-mono").filter({ hasText: "RSH-" }).innerText();
  await click(p, "Xem chuyến của tôi");
  p = await wait("passenger", "bookings");
  await p.getByRole("button").filter({ hasText: ref }).click();
  p = await wait("passenger", "bookingDetail");
  await p.getByText(`GPS: ${gps}`, { exact: true }).waitFor();
  await p.getByText("Chỉ dẫn: Đợi tại cổng số 2, gọi trước 5 phút", { exact: true }).waitFor();
  console.log(
    "PASS search location reuse, map GPS selection, no province re-entry and booking persistence",
  );
  await click(p, "Quay lại");
  p = await wait("passenger", "bookings");
  await p.locator("nav a").filter({ hasText: "Cá nhân" }).click();
  p = await wait("passenger", "profile");
  await click(p, "Chỉnh sửa hồ sơ");
  await choose(p, "Tỉnh/Thành phố", "hue", "Thành phố Huế");
  await choose(p, "Xã/Phường/Đặc khu", "an cuu", "Phường An Cựu");
  await p.getByRole("textbox", { name: /^Địa chỉ chi tiết/ }).fill("42 An Dương Vương");
  await click(p, "Lưu thay đổi");
  await p.getByText("42 An Dương Vương, Phường An Cựu, Thành phố Huế", { exact: true }).waitFor();
  console.log("PASS personal administrative address saves to profile");

  await page.getByRole("button", { name: /^06.*Bảng điều khiển Nhà xe/ }).click();
  await page.getByRole("button", { name: /^CO-16/ }).click();
  c = await wait("company", "stops");
  let row = c.getByRole("row").filter({ hasText: "Trần Thị Lan" }).first();
  const oldGps = await row.locator(".font-mono").innerText();
  await row.getByRole("button", { name: "Địa chỉ", exact: true }).click();
  dialog = c.getByRole("dialog");
  assert.equal(await dialog.getByRole("combobox", { name: /^Tỉnh\/Thành phố/ }).count(), 0);
  await choose(dialog, "Điểm đón", "Ngã ba Hòa Khánh", "Ngã ba Hòa Khánh");
  await dialog
    .getByRole("textbox", { name: /^Chỉ dẫn điểm đón/ })
    .fill("Chờ trước cửa hàng màu xanh");
  await click(dialog, "Lưu địa chỉ");
  row = c.getByRole("row").filter({ hasText: "Trần Thị Lan" }).first();
  assert.notEqual(await row.locator(".font-mono").innerText(), oldGps);
  await row.getByText("Chỉ dẫn: Chờ trước cửa hàng màu xanh", { exact: true }).waitFor();
  await row.getByText("Chờ xử lý", { exact: true }).waitFor();
  await page.getByRole("button", { name: /^CO-17/ }).click();
  c = await wait("company", "optimization");
  await c.getByRole("button", { name: "Tối ưu lộ trình", exact: true }).last().click();
  await click(c, "Áp dụng phương án");
  await click(c.getByRole("dialog"), "Áp dụng");
  await page.getByRole("button", { name: /^CO-15/ }).click();
  c = await wait("company", "bookings");
  assert.equal(await c.locator("table").getByText("Đã xác nhận", { exact: true }).count(), 4);
  console.log("PASS company location edit updates GPS and notes without changing booking status");
  await page.screenshot({ path: join(output, "address-final.png"), fullPage: true });
  assert.deepEqual(errors, []);
  console.log("PASS address browser checks; JavaScript errors: 0");
} catch (error) {
  console.error(error);
  console.error("JavaScript errors", errors);
  await page.screenshot({ path: join(output, "address-failure.png"), fullPage: true });
  process.exitCode = 1;
}
await browser.close();
