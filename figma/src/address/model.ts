import catalog from "./administrative-catalog.json" with { type: "json" };

export type AdministrativeAddress = { provinceId: string; communeId: string; detail: string };
export const provinces = catalog.provinces;
export const administrativeSource = { source: catalog.source, fetchedOn: catalog.fetchedOn };
export const emptyAdministrativeAddress = (): AdministrativeAddress => ({
  provinceId: "",
  communeId: "",
  detail: "",
});
export const normalizeAddress = (s: string) =>
  s
    .toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
export const provinceOf = (id: string) => provinces.find((p) => p.id === id);
export const communeOf = (provinceId: string, id: string) =>
  provinceOf(provinceId)?.communes.find((w) => w.id === id);
export function validateAdministrativeAddress(a?: AdministrativeAddress | null, required = true) {
  if (!required && (!a || (!a.provinceId && !a.communeId && !a.detail.trim())))
    return { provinceId: "", communeId: "", detail: "" };
  return {
    provinceId: !a || !provinceOf(a.provinceId) ? "Vui lòng chọn tỉnh/thành phố." : "",
    communeId:
      !a || !communeOf(a.provinceId, a.communeId)
        ? "Chọn xã/phường/đặc khu thuộc tỉnh/thành phố đã chọn."
        : "",
    detail: !a || a.detail.trim().length < 3 ? "Nhập số nhà, tên đường, thôn hoặc tổ dân phố." : "",
  };
}
export function formatAdministrativeAddress(a?: AdministrativeAddress | null) {
  if (!a) return "";
  return [
    a.detail.trim(),
    communeOf(a.provinceId, a.communeId)?.name,
    provinceOf(a.provinceId)?.name,
  ]
    .filter(Boolean)
    .join(", ");
}
export const changeProvince = (
  a: AdministrativeAddress,
  provinceId: string,
): AdministrativeAddress => ({ ...a, provinceId, communeId: "" });
export function sampleAdministrativeAddress(
  area: string,
  detail = "25 Nguyễn Huệ",
): AdministrativeAddress {
  if (area === "Huế") return { provinceId: "46", communeId: "19789", detail };
  if (area === "Hội An") return { provinceId: "48", communeId: "20410", detail };
  if (area === "Quảng Nam") return { provinceId: "48", communeId: "20341", detail };
  return { provinceId: "48", communeId: "20242", detail };
}
export function administrativeArea(a: AdministrativeAddress) {
  if (a.provinceId === "46") return "Huế";
  if (["20401", "20410", "20413"].includes(a.communeId)) return "Hội An";
  if (a.communeId === "20341") return "Quảng Nam";
  return provinceOf(a.provinceId)?.name.replace(/^(Thành phố|Tỉnh) /, "") ?? "";
}

export type GeoLocation = {
  id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
  area: string;
  kind: "area" | "point";
  source: "catalog" | "map";
  provinceId?: string;
  communeId?: string;
  instructions: string;
};
function point(
  id: string,
  label: string,
  detail: string,
  area: string,
  communeId: string,
  lat: number,
  lng: number,
): GeoLocation {
  const provinceId = communeOf("46", communeId) ? "46" : "48";
  return {
    id,
    label,
    address: formatAdministrativeAddress({ provinceId, communeId, detail }),
    area,
    provinceId,
    communeId,
    lat,
    lng,
    instructions: "",
    source: "catalog",
    kind: "point",
  };
}
/** Search fixtures use approximate POI coordinates. They are not a nationwide geocoder. */
export const placeCatalog: GeoLocation[] = [
  point(
    "dn-station",
    "Bến xe Trung tâm Đà Nẵng",
    "201 Tôn Đức Thắng",
    "Đà Nẵng",
    "20209",
    16.07115,
    108.1479,
  ),
  point(
    "dn-nvl",
    "254 Nguyễn Văn Linh, Đà Nẵng",
    "254 Nguyễn Văn Linh",
    "Đà Nẵng",
    "20242",
    16.0604,
    108.2111,
  ),
  point(
    "dn-center",
    "Ngã tư trung tâm Đà Nẵng",
    "Nguyễn Văn Linh – Nguyễn Tri Phương",
    "Đà Nẵng",
    "20242",
    16.0598,
    108.2081,
  ),
  point(
    "dn-hoa-khanh",
    "Ngã ba Hòa Khánh, Đà Nẵng",
    "Tôn Đức Thắng – Nguyễn Lương Bằng",
    "Đà Nẵng",
    "20200",
    16.075,
    108.128,
  ),
  point(
    "dn-nhs",
    "Ngũ Hành Sơn, Đà Nẵng",
    "81 Huyền Trân Công Chúa",
    "Đà Nẵng",
    "20285",
    16.0042,
    108.263,
  ),
  point(
    "hue-station",
    "Bến xe phía Nam Huế",
    "57 An Dương Vương",
    "Huế",
    "19815",
    16.4379,
    107.6087,
  ),
  point(
    "hue-center",
    "Ngã tư trung tâm Huế",
    "Hùng Vương – Nguyễn Huệ",
    "Huế",
    "19789",
    16.4613,
    107.5943,
  ),
  point("hue-an-cuu", "An Cựu, Huế", "Khu vực An Cựu", "Huế", "19815", 16.445, 107.607),
  point("lang-co", "Lăng Cô", "Điểm dừng Lăng Cô, Phú Lộc", "Huế", "20137", 16.222, 108.073),
  point("hai-van", "Hầm Hải Vân", "Cửa hầm Hải Vân phía Nam", "Đà Nẵng", "20200", 16.122, 108.126),
  point("phu-loc", "Phú Lộc", "Trung tâm Phú Lộc", "Huế", "20107", 16.2805, 107.861),
  point(
    "ha-station",
    "Bến xe Trung tâm Hội An",
    "68 Lê Hồng Phong",
    "Hội An",
    "20410",
    15.886,
    108.323,
  ),
  point(
    "ha-center",
    "Ngã tư trung tâm Hội An",
    "Trần Hưng Đạo – Hai Bà Trưng",
    "Hội An",
    "20410",
    15.8809,
    108.3275,
  ),
  point("ha-cau", "Chùa Cầu, Hội An", "186 Trần Phú", "Hội An", "20410", 15.877, 108.326),
  point(
    "qn-station",
    "Bến xe Trung tâm Quảng Nam",
    "Phan Bội Châu, Tam Kỳ",
    "Quảng Nam",
    "20341",
    15.5666,
    108.481,
  ),
  point(
    "qn-center",
    "Ngã tư trung tâm Quảng Nam",
    "Hùng Vương – Phan Châu Trinh, Tam Kỳ",
    "Quảng Nam",
    "20341",
    15.5705,
    108.474,
  ),
  point("duy-xuyen", "Duy Xuyên", "Trung tâm Duy Xuyên", "Quảng Nam", "20623", 15.831, 108.26),
  point("thang-binh", "Thăng Bình", "Trung tâm Thăng Bình", "Quảng Nam", "20791", 15.738, 108.359),
];
export const areaCatalog: GeoLocation[] = [
  { ...placeCatalog[2], id: "area-dn", label: "Đà Nẵng", kind: "area" },
  { ...placeCatalog[6], id: "area-hue", label: "Huế", kind: "area" },
  { ...placeCatalog[12], id: "area-ha", label: "Hội An", kind: "area" },
  { ...placeCatalog[15], id: "area-qn", label: "Quảng Nam", kind: "area" },
];
const aliases: Record<string, string> = {
  "Bến xe Trung tâm Huế": "hue-station",
  "Bến xe Hội An": "ha-station",
  "Bến xe Đà Nẵng": "dn-station",
  "Bến xe Huế": "hue-station",
  "254 Nguyễn Văn Linh": "dn-nvl",
  "Lăng Cô, Phú Lộc": "lang-co",
  "Ngũ Hành Sơn": "dn-nhs",
};
export function seedLocation(label: string): GeoLocation | undefined {
  const id = aliases[label];
  const p = [...placeCatalog, ...areaCatalog].find(
    (p) => p.id === id || normalizeAddress(p.label) === normalizeAddress(label),
  );
  return p ? { ...p } : undefined;
}
export const areaLocation = (area: string) => areaCatalog.find((p) => p.label === area);
export function validLocation(p?: GeoLocation | null, allowArea = false): p is GeoLocation {
  return (
    !!p &&
    !!p.id &&
    !!p.address.trim() &&
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lng) &&
    p.lat >= -85 &&
    p.lat <= 85 &&
    p.lng >= -180 &&
    p.lng <= 180 &&
    (allowArea || p.kind === "point")
  );
}
export function searchLocations(query: string, area?: string, allowAreas = false) {
  const q = normalizeAddress(query.trim());
  return [...(allowAreas ? areaCatalog : []), ...placeCatalog]
    .filter((p) => !area || p.area === area)
    .filter((p) => !q || normalizeAddress(`${p.label} ${p.address} ${p.area}`).includes(q));
}
export function haversineKm(
  a: Pick<GeoLocation, "lat" | "lng">,
  b: Pick<GeoLocation, "lat" | "lng">,
) {
  const rad = (n: number) => (n * Math.PI) / 180;
  const x =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(Math.max(0, 1 - x)));
}
export function fromMap(lat: number, lng: number, areaHint?: string): GeoLocation {
  const nearest = [...placeCatalog].sort(
    (a, b) => haversineKm({ lat, lng }, a) - haversineKm({ lat, lng }, b),
  )[0];
  const nearby = haversineKm({ lat, lng }, nearest) <= 0.25;
  return {
    id: `map-${lat.toFixed(6)}-${lng.toFixed(6)}`,
    label: `Vị trí ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    address: nearby ? `Gần ${nearest.address}` : `Vị trí GPS ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
    lat,
    lng,
    area: nearby ? nearest.area : (areaHint ?? nearest.area),
    kind: "point",
    source: "map",
    instructions: "",
    // Only recognise fixture-local areas; do not invent reverse-geocoding results elsewhere.
    ...(nearby ? { provinceId: nearest.provinceId, communeId: nearest.communeId } : {}),
  };
}
export const gpsLabel = (p?: GeoLocation | null) =>
  validLocation(p, true) ? `${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}` : "Chưa có tọa độ xác nhận";
export const dispatchPoint = (p: GeoLocation) => ({
  x: ((p.lng - 107.4) / 1.4) * 100,
  y: ((16.8 - p.lat) / 1.5) * 100,
});
export const locationFingerprint = (p?: GeoLocation | null) =>
  p ? [p.id, p.lat, p.lng, p.address, p.instructions, p.provinceId, p.communeId].join("|") : "";
export function fitLocationPoints(
  locations: (GeoLocation | null | undefined)[],
  width = 800,
  height = 390,
) {
  const known = locations.filter((p): p is GeoLocation => validLocation(p, true));
  const minLng = Math.min(...known.map((p) => p.lng)),
    maxLng = Math.max(...known.map((p) => p.lng));
  const minLat = Math.min(...known.map((p) => p.lat)),
    maxLat = Math.max(...known.map((p) => p.lat));
  return locations.map((p) =>
    !validLocation(p, true)
      ? { x: width / 2, y: height / 2 }
      : {
          x:
            maxLng === minLng
              ? width / 2
              : 50 + ((p.lng - minLng) / (maxLng - minLng)) * (width - 100),
          y:
            maxLat === minLat
              ? height / 2
              : 45 + ((maxLat - p.lat) / (maxLat - minLat)) * (height - 90),
        },
  );
}
