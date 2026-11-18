import { mkdir } from "node:fs/promises";
import { join } from "node:path";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const outputDir = process.env.PROTOTYPE_OUTPUT_DIR || "/tmp/rideshare-prototype-results";
await mkdir(outputDir, { recursive: true });
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1200 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.setDefaultTimeout(10000);
const screen = (kind) => page.locator(`[data-${kind}-screen]:visible`);
const wait = async (kind, id) => {
  await page.locator(`[data-${kind}-screen="${id}"]:visible`).waitFor();
  console.log(kind, id);
  return screen(kind);
};
const click = (root, name) => root.getByRole("button", { name, exact: true }).click();

const chooseLocation = async (root, label, query, option) => {
  const input = root.getByRole("combobox", { name: new RegExp("^" + label) });
  await input.fill(query);
  await root.getByRole("option").filter({ hasText: option }).first().click();
};

try {
  await page.goto(process.env.PROTOTYPE_BASE_URL || "http://localhost:3000", {
    waitUntil: "networkidle",
  });
  await page.getByRole("button", { name: /^08.*Nguyên mẫu tương tác/ }).click();
  await page.getByRole("button", { name: "Bắt đầu Hành khách", exact: true }).click();
  await wait("passenger", "splash");
  let p = await wait("passenger", "login");
  await click(p, "Đăng nhập");
  await p.getByText("Mật khẩu cần ít nhất 8 ký tự.", { exact: true }).waitFor();
  await p.getByRole("textbox", { name: /Email hoặc số điện thoại/ }).fill("0905123456");
  await p.getByLabel(/^Mật khẩu/).fill("Demo12345");
  await click(p, "Đăng nhập");
  p = await wait("passenger", "home");
  await click(p, "Tìm chuyến");
  p = await wait("passenger", "results");
  await p.getByRole("button", { name: /^Lọc/ }).click();
  p = await wait("passenger", "filters");
  await p.getByText("Nhà xe Thành Công", { exact: true }).click();
  assert.equal(await p.getByLabel("Nhà xe Thành Công", { exact: true }).isChecked(), true);
  await p.getByRole("button", { name: /^Sáng/ }).click();
  await p.getByRole("button", { name: /^Áp dụng/ }).click();
  p = await wait("passenger", "results");
  await p
    .getByRole("button")
    .filter({ hasText: "Nhà xe Thành Công" })
    .filter({ hasText: "07:30" })
    .click();
  p = await wait("passenger", "details");
  await click(p, "Đặt chỗ");
  p = await wait("passenger", "booking");
  await click(p, "Xem lại đặt chỗ");
  await p
    .getByText("Vui lòng chọn điểm đón có tọa độ từ gợi ý hoặc bản đồ", { exact: true })
    .waitFor();
  await chooseLocation(p, "Điểm đón", "Bến xe Trung tâm Đà Nẵng", "Bến xe Trung tâm Đà Nẵng");
  await chooseLocation(p, "Điểm trả", "Bến xe phía Nam Huế", "Bến xe phía Nam Huế");
  await p.getByRole("textbox", { name: /Số điện thoại/ }).fill("0905123456");
  await click(p, "Xem lại đặt chỗ");
  p = await wait("passenger", "confirm");
  await click(p, "Xác nhận đặt chỗ");
  p = await wait("passenger", "success");
  const ref = await p.locator(".font-mono").filter({ hasText: "RSH-" }).innerText();
  console.log("booking", ref);
  assert.match(ref, /RSH-/);
  await click(p, "Xem chuyến của tôi");
  p = await wait("passenger", "bookings");
  await p.getByRole("button").filter({ hasText: ref }).click();
  p = await wait("passenger", "bookingDetail");
  await click(p, "Theo dõi chuyến");
  p = await wait("passenger", "tracking");
  await click(p, "Kết thúc chuyến (demo)");
  await click(p.getByRole("dialog"), "Kết thúc chuyến");
  await click(p, "Đánh giá chuyến đi");
  p = await wait("passenger", "rating");
  await click(p, "Gửi đánh giá");
  assert.equal(await p.getByText("Vui lòng chọn số sao", { exact: true }).count(), 3);
  for (const label of ["Chuyến đi", "Tài xế", "Nhà xe"])
    await p
      .getByRole("radiogroup", { name: label, exact: true })
      .getByRole("button", { name: "5 sao", exact: true })
      .click();
  await click(p, "Gửi đánh giá");
  await p.getByText("Cảm ơn bạn đã đánh giá!", { exact: true }).waitFor();
  await click(p, "Về chuyến của tôi");
  p = await wait("passenger", "bookings");
  await p.getByRole("button").filter({ hasText: ref }).waitFor();
  await p.locator("nav a").filter({ hasText: "Thông báo" }).click();
  p = await wait("passenger", "notifications");
  await click(p, "Đánh dấu đã đọc");
  await p.getByText("Cá nhân", { exact: true }).click();
  p = await wait("passenger", "profile");
  await click(p, "Chỉnh sửa hồ sơ");
  await p.getByRole("textbox", { name: "Họ và tên", exact: true }).fill("Nguyễn Minh Anh");
  await click(p, "Lưu thay đổi");
  await page.screenshot({ path: join(outputDir, "passenger.png"), fullPage: true });
  console.log("PASS passenger journey");
  // Driver
  await page.getByRole("button", { name: "Bắt đầu Tài xế", exact: true }).click();
  let d = await wait("driver", "login");
  await d
    .getByRole("textbox", { name: "Email hoặc số điện thoại", exact: true })
    .fill("0905111222");
  await d.getByLabel("Mật khẩu", { exact: true }).fill("Demo12345");
  await click(d, "Đăng nhập");
  d = await wait("driver", "home");
  await click(d, "Xem tất cả chuyến được giao");
  d = await wait("driver", "trips");
  await d
    .locator("article")
    .filter({ hasText: "CH-2043" })
    .getByRole("button", { name: "Xem chi tiết", exact: true })
    .click();
  d = await wait("driver", "details");
  await click(d, "Nhận chuyến");
  d = await wait("driver", "accept");
  await click(d.getByRole("dialog"), "Nhận chuyến");
  d = await wait("driver", "route");
  await click(d, "Bắt đầu chuyến");
  await click(d.getByRole("dialog"), "Bắt đầu chuyến");
  d = await wait("driver", "active");
  await d.getByRole("button").filter({ hasText: "TRẢ" }).first().click();
  d = await wait("driver", "stop");
  assert.equal(
    await d.getByRole("button", { name: "ĐÃ TRẢ KHÁCH", exact: true }).isDisabled(),
    true,
  );
  await click(d, "Quay lại");
  d = await wait("driver", "active");
  await d.getByRole("button", { name: /^Hoàn thành \(/ }).click();
  await d.getByText(/Còn .* điểm dừng chưa xử lý/).waitFor();
  await click(d, "Báo sự cố");
  d = await wait("driver", "incident");
  await click(d, "Gửi báo cáo");
  await d.getByText("Vui lòng chọn loại sự cố", { exact: true }).waitFor();
  await click(d, "Kẹt xe kéo dài");
  await d.locator("textarea").fill("Kẹt xe tại ngã tư trung tâm, dự kiến chậm 10 phút.");
  await click(d, "Gửi báo cáo");
  await click(d.getByRole("dialog"), "Gửi báo cáo");
  await d.getByText("Đã gửi báo cáo", { exact: true }).waitFor();
  await click(d, "Quay lại chuyến đi");
  d = await wait("driver", "active");
  let processed = 0;
  while (await d.getByRole("button", { name: /^Xử lý điểm/ }).count()) {
    if (processed++ > 12) throw new Error("stop loop did not terminate");
    await d.getByRole("button", { name: /^Xử lý điểm/ }).click();
    d = await wait("driver", "stop");
    await click(d, "ĐÃ ĐẾN ĐIỂM DỪNG");
    const pickup = await d.getByRole("button", { name: "ĐÃ ĐÓN KHÁCH", exact: true }).count();
    await click(d, pickup ? "ĐÃ ĐÓN KHÁCH" : "ĐÃ TRẢ KHÁCH");
    await click(d.getByRole("dialog"), pickup ? "Đã đón khách" : "Đã trả khách");
    d = await wait("driver", "active");
  }
  await click(d, "Hoàn thành chuyến");
  await click(d.getByRole("dialog"), "Hoàn thành chuyến");
  d = await wait("driver", "completed");
  console.log("PASS driver journey", processed, "stops");
  // Company registration -> Admin approval
  await page.getByRole("button", { name: "Bắt đầu Nhà xe", exact: true }).click();
  let c = await wait("company", "login");
  await c.getByRole("button", { name: /^Đăng ký nhà xe/ }).click();
  c = await wait("company", "register");
  for (const [label, value] of [
    ["Tên nhà xe", "Nhà xe Kết Nối Miền Trung"],
    ["Mã số đăng ký kinh doanh", "0402999888"],
    ["Người liên hệ", "Nguyễn Kết Nối"],
    ["Số điện thoại", "0905888777"],
    ["Email doanh nghiệp", "ketnoi@example.vn"],
  ])
    await c.getByRole("textbox", { name: new RegExp("^" + label) }).fill(value);
  await chooseLocation(c, "Tỉnh/Thành phố", "Đà Nẵng", "Thành phố Đà Nẵng");
  await chooseLocation(c, "Xã/Phường/Đặc khu", "Hải Châu", "Phường Hải Châu");
  await c.getByRole("textbox", { name: /^Địa chỉ chi tiết/ }).fill("120 Nguyễn Văn Linh");
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jc1sAAAAASUVORK5CYII=",
    "base64",
  );
  await c
    .getByLabel("Tải giấy đăng ký kinh doanh", { exact: true })
    .setInputFiles({ name: "giay-phep-mau.png", mimeType: "image/png", buffer: png });
  await c.getByRole("button", { name: /^Gửi hồ sơ đăng ký/ }).click();
  c = await wait("company", "pending");
  await page.getByRole("button", { name: /^CO-12/ }).click();
  await wait("company", "pending");
  await page.getByRole("button", { name: "Chuyển sang Admin để duyệt hồ sơ", exact: true }).click();
  let a = await wait("admin", "login");
  await a
    .getByRole("textbox", { name: "Email quản trị", exact: true })
    .fill("admin@ridesharehub.vn");
  await a.getByLabel("Mật khẩu", { exact: true }).fill("Demo12345");
  await click(a, "Đăng nhập");
  a = await wait("admin", "dashboard");
  await a.getByRole("button", { name: /^Quản lý nhà xe/ }).click();
  a = await wait("admin", "companies");
  await a.getByRole("searchbox", { name: "Tìm nhà xe" }).fill("0402999888");
  await a.getByRole("button", { name: /^Duyệt hồ sơ/ }).click();
  a = await wait("admin", "approval");
  await click(a, "Từ chối hồ sơ");
  await a
    .getByText("Vui lòng nhập lý do từ chối để nhà xe có thể bổ sung hồ sơ.", { exact: true })
    .waitFor();
  await a.getByRole("button", { name: "Xem", exact: true }).first().click();
  await a.getByRole("img", { name: "Tài liệu nhà xe đã nộp", exact: true }).waitFor();
  await click(a.getByRole("dialog"), "Đóng");
  await click(a, "Phê duyệt nhà xe");
  await click(a.getByRole("dialog"), "Hủy");
  await a.getByRole("button", { name: "Phê duyệt nhà xe", exact: true }).waitFor();
  await click(a, "Phê duyệt nhà xe");
  await click(a.getByRole("dialog"), "Xác nhận phê duyệt");
  await a.getByText("Đã được cấp quyền", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Tiếp tục Nhà xe", exact: true }).click();
  c = await wait("company", "dashboard");
  await click(c, "Hồ sơ nhà xe");
  c = await wait("company", "profile");
  await click(c, "Quản lý phương tiện");
  c = await wait("company", "vehicles");
  await click(c, "Thêm phương tiện");
  c = await wait("company", "vehicleForm");
  await c.getByRole("textbox", { name: /^Biển số đăng ký/ }).fill("43A-999.99");
  await c.getByRole("textbox", { name: /^Hãng \/ dòng xe/ }).fill("Ford Transit");
  await click(c, "Lưu phương tiện");
  c = await wait("company", "vehicles");
  await click(c, "Quản lý tài xế");
  c = await wait("company", "drivers");
  await click(c, "Thêm tài xế");
  c = await wait("company", "driverForm");
  for (const [label, value] of [
    ["Họ và tên", "Nguyễn Tài Xế Mới"],
    ["Số điện thoại", "0905666555"],
    ["Email", "taixemoi@example.vn"],
    ["Số giấy phép lái xe", "430999888777"],
  ])
    await c.getByRole("textbox", { name: new RegExp("^" + label) }).fill(value);
  await c.getByLabel(/^Ngày hết hạn giấy phép/).fill("2030-12-31");
  await click(c, "Lưu tài xế");
  c = await wait("company", "drivers");
  await click(c, "Quản lý tuyến đường");
  c = await wait("company", "routes");
  await click(c, "Tạo tuyến đường");
  c = await wait("company", "routeForm");
  await c.getByRole("textbox", { name: /^Tên tuyến đường/ }).fill("Đà Nẵng – Quảng Nam thử");
  await chooseLocation(c, "Điểm đến", "Quảng Nam", "Quảng Nam");
  await c.getByRole("spinbutton", { name: /^Quãng đường/ }).fill("80");
  await c.getByRole("spinbutton", { name: /^Thời gian/ }).fill("120");
  await click(c, "Thêm điểm dừng");
  await chooseLocation(c, "Điểm dừng 1", "Chùa Cầu", "Chùa Cầu, Hội An");
  await click(c, "Lưu tuyến đường");
  c = await wait("company", "routes");
  await click(c, "Quản lý chuyến đi");
  c = await wait("company", "trips");
  await click(c, "Tạo chuyến đi");
  c = await wait("company", "tripForm");
  await c.getByLabel(/^Ngày và giờ khởi hành/).fill("2025-07-18T08:00");
  await c.getByLabel(/^Phương tiện/).selectOption({ label: "43A-123.45 · 16 chỗ" });
  await c.getByLabel(/^Tài xế/).selectOption({ label: "Nguyễn Văn Hải" });
  await click(c, "Công bố chuyến");
  await c
    .getByText(/Phương tiện đã được phân công cho CH-2041/)
    .first()
    .waitFor();
  await c.getByLabel(/^Ngày và giờ khởi hành/).fill("2025-07-19T07:30");
  await c.getByLabel(/^Phương tiện/).selectOption({ label: "43A-999.99 · 16 chỗ" });
  await c.getByLabel(/^Tài xế/).selectOption({ label: "Nguyễn Tài Xế Mới" });
  await click(c, "Lưu bản nháp");
  c = await wait("company", "tripDetail");
  await click(c, "Chỉnh sửa");
  c = await wait("company", "tripForm");
  await click(c, "Công bố chuyến");
  await click(c.getByRole("dialog"), "Công bố chuyến");
  c = await wait("company", "tripDetail");
  await click(c, "Đặt chỗ");
  c = await wait("company", "bookings");
  await click(c, "Thêm đặt chỗ");
  let modal = c.getByRole("dialog");
  await modal.getByRole("textbox", { name: /^Họ tên/ }).fill("Nguyễn Khách Mới");
  await modal.getByRole("textbox", { name: /^Số điện thoại/ }).fill("0905123456");
  await modal.getByRole("spinbutton", { name: /^Số chỗ/ }).fill("17");
  await chooseLocation(
    modal,
    "Địa chỉ đón",
    "Bến xe Trung tâm Đà Nẵng",
    "Bến xe Trung tâm Đà Nẵng",
  );
  await chooseLocation(modal, "Địa chỉ trả", "Bến xe phía Nam Huế", "Bến xe phía Nam Huế");
  await click(modal, "Xác nhận đặt chỗ");
  await modal
    .getByText("Số chỗ đặt vượt quá số chỗ còn lại hoặc không hợp lệ.", { exact: true })
    .waitFor();
  await modal.getByRole("spinbutton", { name: /^Số chỗ/ }).fill("16");
  await click(modal, "Xác nhận đặt chỗ");
  assert.equal(
    await c.getByRole("button", { name: "Thêm đặt chỗ", exact: true }).isDisabled(),
    true,
  );
  await click(c, "Đón / trả");
  c = await wait("company", "stops");
  await c.getByRole("button", { name: "Đưa điểm 2 lên", exact: true }).click();
  await c
    .getByText("Điểm đón phải nằm trước điểm trả của cùng hành khách.", { exact: true })
    .waitFor();
  await click(c, "Tối ưu lộ trình");
  c = await wait("company", "optimization");
  await c.getByRole("button", { name: "Tối ưu lộ trình", exact: true }).last().click();
  await click(c, "Áp dụng phương án");
  await click(c.getByRole("dialog"), "Áp dụng");
  await click(c, "Theo dõi");
  c = await wait("company", "tracking");
  await c.getByLabel("Chuyến đang điều hành").selectOption("CH-2041");
  await click(c, "Cập nhật bước tiếp");
  await page.screenshot({ path: join(outputDir, "company.png"), fullPage: true });
  console.log("PASS company journey and approval bridge");
  // Admin all operational branches
  await page.getByRole("button", { name: "Tiếp tục Quản trị", exact: true }).click();
  a = screen("admin");
  await click(a, "Tổng quan");
  a = await wait("admin", "dashboard");
  await a
    .getByRole("button", { name: /^Quản lý người dùng/ })
    .last()
    .click();
  a = await wait("admin", "users");
  await a.getByRole("button", { name: "Chi tiết", exact: true }).first().click();
  a = await wait("admin", "userDetail");
  await a.getByRole("button", { name: "Khóa", exact: true }).first().click();
  await click(a.getByRole("dialog"), "Hủy");
  await a.getByRole("button", { name: "Khóa", exact: true }).first().click();
  await click(a.getByRole("dialog"), "Xác nhận khóa");
  await a.getByRole("button", { name: "Mở khóa", exact: true }).first().click();
  await click(a.getByRole("dialog"), "Xác nhận mở khóa");
  await click(a, "Tổng quan");
  a = await wait("admin", "dashboard");
  await a
    .getByRole("button", { name: /^Giám sát chuyến đi/ })
    .last()
    .click();
  a = await wait("admin", "monitoring");
  await a.getByRole("button", { name: "Đặt chỗ →", exact: true }).first().click();
  a = await wait("admin", "bookings");
  await click(a, "Tổng quan");
  a = await wait("admin", "dashboard");
  await a.getByRole("button", { name: /^Giám sát đặt chỗ/ }).click();
  a = await wait("admin", "bookings");
  await click(a, "Tổng quan");
  a = await wait("admin", "dashboard");
  await a
    .getByRole("button", { name: /^Báo cáo/ })
    .last()
    .click();
  a = await wait("admin", "reports");
  await a.getByLabel("Từ ngày", { exact: true }).fill("2025-07-20");
  await click(a, "Áp dụng");
  await a.getByText("Ngày bắt đầu không được sau ngày kết thúc.", { exact: true }).waitFor();
  await click(a, "Hôm nay");
  await page.screenshot({ path: join(outputDir, "admin.png"), fullPage: true });
  await a.getByRole("button", { name: /^Quản lý nhà xe/ }).click();
  a = await wait("admin", "companies");
  await a.getByRole("searchbox", { name: "Tìm nhà xe" }).fill("Nhà xe An Phú");
  await a.getByRole("button", { name: /^Duyệt hồ sơ/ }).click();
  a = await wait("admin", "approval");
  await a.locator("textarea").fill("Cần bổ sung giấy phép vận tải còn hiệu lực.");
  await click(a, "Từ chối hồ sơ");
  await click(a.getByRole("dialog"), "Xác nhận từ chối");
  await a.getByText("Cần bổ sung giấy phép vận tải còn hiệu lực.", { exact: false }).waitFor();
  await a.getByText("Chưa được cấp quyền", { exact: true }).waitFor();
  console.log("PASS admin journey");
  await page.getByRole("button", { name: "Đặt lại toàn bộ phiên", exact: true }).click();
  await click(page.getByRole("dialog"), "Hủy");
  await wait("admin", "approval");
  await page.getByRole("button", { name: "Đặt lại toàn bộ phiên", exact: true }).click();
  await click(page.getByRole("dialog"), "Đặt lại phiên");
  await page.getByRole("button", { name: "Bắt đầu Hành khách", exact: true }).waitFor();
  assert.equal(await page.locator("[data-admin-screen]:visible").count(), 0);
  console.log("PASS session reset confirmation");
  assert.deepEqual(errors, []);
  console.log("PASS: all four journeys, errors:", errors.length);
} catch (e) {
  console.error("FAIL", e);
  await page.screenshot({ path: join(outputDir, "failure.png"), fullPage: true });
  console.error("PAGE ERRORS", errors);
  console.error(
    "PHONE TEXT",
    await screen("passenger")
      .innerText()
      .catch(() => ""),
  );
  process.exitCode = 1;
}
await browser.close();
