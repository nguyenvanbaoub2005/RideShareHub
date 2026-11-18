import { useEffect, useId, useState } from "react";
import Button from "../components/ui/Button";
import { TextInput } from "../components/ui/Form";
import {
  provinces,
  provinceOf,
  communeOf,
  changeProvince,
  normalizeAddress,
  validateAdministrativeAddress,
  searchLocations,
  validLocation,
  gpsLabel,
  fromMap,
  areaLocation,
  type AdministrativeAddress,
  type GeoLocation,
} from "./model";

type Option = { value: string; label: string; description?: string };
function SearchSelect({
  label,
  value,
  options,
  onChange,
  disabled,
  error,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (v: string) => void;
  disabled?: boolean;
  error?: string;
}) {
  const id = useId();
  const selected = options.find((o) => o.value === value);
  const [query, setQuery] = useState(selected?.label ?? "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const list = options.filter((o) => normalizeAddress(o.label).includes(normalizeAddress(query)));
  useEffect(() => {
    if (!open) setQuery(selected?.label ?? "");
  }, [value, selected?.label, open]);
  const choose = (o: Option) => {
    onChange(o.value);
    setQuery(o.label);
    setOpen(false);
  };
  return (
    <div className="relative">
      <TextInput
        label={label}
        role="combobox"
        autoComplete="off"
        aria-expanded={open}
        aria-controls={`${id}-options`}
        aria-activedescendant={open && list[active] ? `${id}-${active}` : undefined}
        value={query}
        disabled={disabled}
        placeholder={disabled ? "Chọn tỉnh/thành phố trước" : `Tìm và chọn ${label.toLowerCase()}`}
        status={error ? "error" : "default"}
        hint={error}
        onFocus={() => {
          setOpen(true);
          setQuery("");
          setActive(0);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange("");
          setOpen(true);
          setActive(0);
        }}
        onBlur={(e) => {
          if (!e.currentTarget.parentElement?.parentElement?.contains(e.relatedTarget as Node))
            setOpen(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setOpen(true);
            setActive((a) =>
              Math.max(0, Math.min(list.length - 1, a + (e.key === "ArrowDown" ? 1 : -1))),
            );
          }
          if (e.key === "Enter" && open) {
            e.preventDefault();
            if (list[active]) choose(list[active]);
          }
          if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && !disabled && (
        <div
          id={`${id}-options`}
          role="listbox"
          aria-label={label}
          className="absolute top-full left-0 right-0 z-30 mt-1 max-h-56 overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-dropdown"
        >
          {list.slice(0, 150).map((o, i) => (
            <Button
              key={o.value}
              id={`${id}-${i}`}
              role="option"
              aria-selected={o.value === value}
              tabIndex={-1}
              type="button"
              variant="secondary"
              className={`w-full justify-start border-0 rounded-lg text-left ${i === active ? "bg-blue-50 text-primary" : ""}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(o)}
            >
              {o.label}
            </Button>
          ))}
          {!list.length && (
            <div className="p-3 text-xs text-slate-500">Không có kết quả phù hợp.</div>
          )}
          {list.length > 150 && (
            <div className="p-3 text-xs text-slate-500">
              Nhập từ khóa để thu hẹp {list.length} kết quả.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AdministrativeAddressFields({
  value,
  onChange,
  tried = false,
  compact = false,
  label = "Địa chỉ hành chính",
  required = true,
}: {
  value: AdministrativeAddress;
  onChange: (a: AdministrativeAddress) => void;
  tried?: boolean;
  compact?: boolean;
  label?: string;
  required?: boolean;
}) {
  const errors = validateAdministrativeAddress(value, required);
  return (
    <div className="space-y-3" role="group" aria-label={label}>
      <div className="text-sm font-semibold">{label}</div>
      <div className={compact ? "space-y-3" : "grid grid-cols-2 gap-4"}>
        <SearchSelect
          label="Tỉnh/Thành phố"
          value={value.provinceId}
          options={provinces.map((p) => ({ value: p.id, label: p.name }))}
          onChange={(provinceId) => onChange(changeProvince(value, provinceId))}
          error={tried ? errors.provinceId : ""}
        />
        <SearchSelect
          label="Xã/Phường/Đặc khu"
          value={value.communeId}
          disabled={!value.provinceId}
          options={(provinceOf(value.provinceId)?.communes ?? []).map((w) => ({
            value: w.id,
            label: w.name,
          }))}
          onChange={(communeId) => onChange({ ...value, communeId })}
          error={tried ? errors.communeId : ""}
        />
      </div>
      <TextInput
        label="Địa chỉ chi tiết"
        placeholder="Số nhà, tên đường, thôn, tổ dân phố..."
        value={value.detail}
        onChange={(e) => onChange({ ...value, detail: e.target.value })}
        status={tried && errors.detail ? "error" : "default"}
        hint={tried ? errors.detail : "Chỉ dùng để quản lý hồ sơ; không thay thế vị trí đón/trả."}
      />
    </div>
  );
}

const TILE = 256;
function world(lat: number, lng: number, zoom: number) {
  const size = TILE * 2 ** zoom,
    sin = Math.sin((lat * Math.PI) / 180);
  return {
    x: ((lng + 180) / 360) * size,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size,
  };
}
function coordinates(x: number, y: number, zoom: number) {
  const size = TILE * 2 ** zoom;
  return {
    lng: (x / size) * 360 - 180,
    lat: (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / size))) * 180) / Math.PI,
  };
}
function PointMap({
  value,
  area,
  onChoose,
}: {
  value?: GeoLocation | null;
  area?: string;
  onChoose: (p: GeoLocation) => void;
}) {
  const initial = value ?? areaLocation(area ?? "Đà Nẵng")!;
  const [center, setCenter] = useState({ lat: initial.lat, lng: initial.lng });
  const [zoom, setZoom] = useState(12);
  useEffect(() => {
    if (value?.source === "catalog") setCenter({ lat: value.lat, lng: value.lng });
  }, [value?.id]);
  const width = 640,
    height = 300,
    c = world(center.lat, center.lng, zoom);
  const origin = { x: c.x - width / 2, y: c.y - height / 2 };
  const tiles = [];
  for (let x = Math.floor(origin.x / TILE); x <= Math.floor((origin.x + width) / TILE); x++) {
    for (let y = Math.floor(origin.y / TILE); y <= Math.floor((origin.y + height) / TILE); y++) {
      if (x >= 0 && y >= 0 && x < 2 ** zoom && y < 2 ** zoom) tiles.push({ x, y });
    }
  }
  const marker = value ? world(value.lat, value.lng, zoom) : null;
  const choose = (lat: number, lng: number) => onChoose(fromMap(lat, lng, area));
  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-line overflow-hidden bg-slate-100">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-48 cursor-crosshair"
          role="img"
          aria-label="Bản đồ chọn tọa độ đón trả"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            // SVG fills the viewport so pointer positions map to the exact Mercator coordinate.
            const p = coordinates(
              origin.x + ((e.clientX - r.left) / r.width) * width,
              origin.y + ((e.clientY - r.top) / r.height) * height,
              zoom,
            );
            choose(p.lat, p.lng);
          }}
          preserveAspectRatio="none"
        >
          <rect width={width} height={height} fill="var(--color-line)" />
          {tiles.map((t) => (
            <image
              key={`${zoom}-${t.x}-${t.y}`}
              href={`https://tile.openstreetmap.org/${zoom}/${t.x}/${t.y}.png`}
              x={t.x * TILE - origin.x}
              y={t.y * TILE - origin.y}
              width={TILE}
              height={TILE}
            />
          ))}
          <path
            d={`M${width / 2 - 9} ${height / 2}h18M${width / 2} ${height / 2 - 9}v18`}
            stroke="var(--color-navy)"
            strokeWidth="2"
          />
          {marker && (
            <g transform={`translate(${marker.x - origin.x},${marker.y - origin.y})`}>
              <circle
                r="11"
                fill="var(--color-primary)"
                stroke="var(--color-surface)"
                strokeWidth="3"
              />
              <circle r="3" fill="var(--color-surface)" />
            </g>
          )}
        </svg>
        <div className="px-3 py-1 text-right text-[10px] text-slate-500 bg-white">
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
            © OpenStreetMap contributors
          </a>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Button
          type="button"
          variant="secondary"
          aria-label="Di chuyển bản đồ sang Tây"
          onClick={() => setCenter({ ...center, lng: center.lng - 0.04 })}
        >
          ←
        </Button>
        <Button
          type="button"
          variant="secondary"
          aria-label="Di chuyển bản đồ lên Bắc"
          onClick={() => setCenter({ ...center, lat: center.lat + 0.04 })}
        >
          ↑
        </Button>
        <Button
          type="button"
          variant="secondary"
          aria-label="Di chuyển bản đồ xuống Nam"
          onClick={() => setCenter({ ...center, lat: center.lat - 0.04 })}
        >
          ↓
        </Button>
        <Button
          type="button"
          variant="secondary"
          aria-label="Di chuyển bản đồ sang Đông"
          onClick={() => setCenter({ ...center, lng: center.lng + 0.04 })}
        >
          →
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={zoom >= 17}
          aria-label="Phóng to bản đồ"
          onClick={() => setZoom(zoom + 1)}
        >
          +
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={zoom <= 7}
          aria-label="Thu nhỏ bản đồ"
          onClick={() => setZoom(zoom - 1)}
        >
          −
        </Button>
        <Button type="button" onClick={() => choose(center.lat, center.lng)}>
          Chọn tâm bản đồ
        </Button>
      </div>
      <div className="text-[10px] text-slate-500 leading-5">
        Chạm bản đồ hoặc di chuyển rồi chọn tâm. Bản đồ nền cần mạng; việc chọn tọa độ không phụ
        thuộc tải bản đồ.
      </div>
    </div>
  );
}

export function LocationPicker({
  label,
  value,
  onChange,
  area,
  error,
  allowAreas = false,
  instructions = true,
}: {
  label: string;
  value?: GeoLocation | null;
  onChange: (p: GeoLocation | null) => void;
  area?: string;
  error?: string;
  allowAreas?: boolean;
  instructions?: boolean;
}) {
  const id = useId();
  const [query, setQuery] = useState(value?.label ?? "");
  const [open, setOpen] = useState(false);
  const [map, setMap] = useState(false);
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (!open) setQuery(value?.label ?? "");
  }, [value?.id, value?.label, open]);
  const matches = searchLocations(query, area, allowAreas);
  const select = (p: GeoLocation) => {
    onChange({ ...p });
    setQuery(p.label);
    setOpen(false);
  };
  return (
    <div className="space-y-2 min-w-0 w-full" role="group" aria-label={label}>
      <div className="relative">
        <TextInput
          label={label}
          role="combobox"
          autoComplete="off"
          value={query}
          placeholder="Tìm tên địa điểm hoặc địa chỉ..."
          aria-expanded={open}
          aria-controls={`${id}-places`}
          aria-activedescendant={open && matches[active] ? `${id}-${active}` : undefined}
          hint={error}
          status={error ? "error" : "default"}
          onFocus={() => {
            setOpen(true);
            setQuery("");
            setActive(0);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(null);
            setOpen(true);
            setActive(0);
          }}
          onBlur={() => setOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              setOpen(true);
              setActive((a) =>
                Math.max(0, Math.min(matches.length - 1, a + (e.key === "ArrowDown" ? 1 : -1))),
              );
            }
            if (e.key === "Enter" && open) {
              e.preventDefault();
              if (matches[active]) select(matches[active]);
            }
            if (e.key === "Escape") setOpen(false);
          }}
        />
        {open && (
          <div
            id={`${id}-places`}
            role="listbox"
            aria-label={`Gợi ý ${label.toLowerCase()}`}
            className="absolute top-full inset-x-0 z-30 bg-white rounded-xl border border-line p-1 shadow-dropdown max-h-56 overflow-y-auto"
          >
            {matches.map((p, i) => (
              <Button
                type="button"
                key={p.id}
                id={`${id}-${i}`}
                role="option"
                aria-selected={value?.id === p.id}
                tabIndex={-1}
                variant="secondary"
                className={`w-full min-h-14 h-auto py-2 border-0 justify-start text-left ${active === i ? "bg-blue-50" : ""}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(p)}
              >
                <div>
                  <div className="text-sm font-semibold">{p.label}</div>
                  <div className="text-[10px] text-slate-500 font-normal mt-1 whitespace-normal">
                    {p.kind === "area" ? "Khu vực tìm chuyến · " : ""}
                    {p.address}
                  </div>
                </div>
              </Button>
            ))}
            {!matches.length && (
              <div className="p-3 text-xs text-slate-500">
                Không có gợi ý trong danh mục mẫu. Hãy chọn vị trí trên bản đồ.
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex justify-between items-center gap-2">
        <div className="text-[10px] text-slate-400">Gợi ý địa điểm mẫu miền Trung</div>
        <Button
          type="button"
          variant="secondary"
          icon="pin"
          onClick={() => {
            setOpen(false);
            setMap(!map);
          }}
        >
          {map ? "Ẩn bản đồ" : "Chọn trên bản đồ"}
        </Button>
      </div>
      {map && <PointMap value={value} area={area} onChoose={select} />}
      {validLocation(value, allowAreas) && (
        <div className="rounded-xl bg-canvas border border-line px-3 py-2 space-y-1 text-xs">
          <div className="font-medium">{value.address}</div>
          <div className="font-mono text-[10px] text-primary" data-location-gps={label}>
            GPS: {gpsLabel(value)}
          </div>
          {value.provinceId && (
            <div className="text-[10px] text-slate-500">
              {communeOf(value.provinceId, value.communeId ?? "")?.name} ·{" "}
              {provinceOf(value.provinceId)?.name} ·{" "}
              {value.source === "map"
                ? "Nhận diện gần địa điểm mẫu, cần kiểm tra"
                : "Theo địa điểm đã chọn"}
            </div>
          )}
        </div>
      )}
      {value?.source === "map" && (
        <TextInput
          label="Mô tả địa chỉ tại vị trí đã chọn"
          value={value.address}
          onChange={(e) => onChange({ ...value, address: e.target.value })}
          hint="Tọa độ giữ theo điểm bạn đã chọn; kéo/chọn lại bản đồ để đổi vị trí."
        />
      )}
      {value && instructions && (
        <TextInput
          label={`Chỉ dẫn ${label.toLowerCase()} (không bắt buộc)`}
          placeholder="Ví dụ: đứng trước cổng, gọi trước 5 phút..."
          maxLength={200}
          value={value.instructions}
          onChange={(e) => onChange({ ...value, instructions: e.target.value })}
        />
      )}
    </div>
  );
}
