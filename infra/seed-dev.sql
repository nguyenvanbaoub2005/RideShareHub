-- Dev/Test seed data for RideShareHub (idempotent — safe to re-run).
-- Uniform password for all test accounts: Test@123456
-- BCrypt(10) generated with org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder

BEGIN;

-- 1. Users (Admin, Approved Company, Pending Company, 2 Drivers, 2 Passengers)
INSERT INTO users (email, phone, password_hash, full_name, role, status)
VALUES
    ('admin@ridesharehub.vn',    '0901000001', '$2a$10$OFORQHpAJzPTOsUBGRhmr.C.QZzLI1ped1vlBrKc50kLw9YZvXs9K', 'Quản Trị Viên',      'ADMIN',             'ACTIVE'),
    ('nhaxe@hoanglong.vn',       '0905123456', '$2a$10$OFORQHpAJzPTOsUBGRhmr.C.QZzLI1ped1vlBrKc50kLw9YZvXs9K', 'Nguyễn Văn Hùng',    'TRANSPORT_COMPANY', 'ACTIVE'),
    ('nhaxecho@phuongtrang.vn',  '0914222333', '$2a$10$OFORQHpAJzPTOsUBGRhmr.C.QZzLI1ped1vlBrKc50kLw9YZvXs9K', 'Trần Thị Mai',       'TRANSPORT_COMPANY', 'ACTIVE'),
    ('taixe1@hoanglong.vn',      '0905111222', '$2a$10$OFORQHpAJzPTOsUBGRhmr.C.QZzLI1ped1vlBrKc50kLw9YZvXs9K', 'Lê Minh Tuấn',       'DRIVER',            'ACTIVE'),
    ('taixe2@hoanglong.vn',      '0905333444', '$2a$10$OFORQHpAJzPTOsUBGRhmr.C.QZzLI1ped1vlBrKc50kLw9YZvXs9K', 'Phạm Quốc Bảo',      'DRIVER',            'ACTIVE'),
    ('khach1@gmail.com',         '0988111222', '$2a$10$OFORQHpAJzPTOsUBGRhmr.C.QZzLI1ped1vlBrKc50kLw9YZvXs9K', 'Trần Minh Anh',      'PASSENGER',         'ACTIVE'),
    ('khach2@gmail.com',         '0988333444', '$2a$10$OFORQHpAJzPTOsUBGRhmr.C.QZzLI1ped1vlBrKc50kLw9YZvXs9K', 'Võ Thảo Vy',         'PASSENGER',         'ACTIVE')
ON CONFLICT DO NOTHING;

-- 2. Transport companies (1 APPROVED, 1 PENDING for Admin review testing)
INSERT INTO transport_companies (
    owner_user_id, name, business_license_no, tax_code, address,
    contact_phone, contact_email, representative_name, business_information,
    description, status, approved_by, approved_at, avg_rating, rating_count
)
SELECT
    owner.id,
    'Nhà xe Hoàng Long Miền Trung',
    'GP-43-00192',
    '0401234567',
    '185 Tôn Đức Thắng, Liên Chiểu, Đà Nẵng',
    '0905123456',
    'nhaxe@hoanglong.vn',
    'Nguyễn Văn Hùng',
    'Khai thác tuyến cố định và xe ghép Limousine Đà Nẵng - Huế - Hội An - Quảng Nam.',
    'Đội xe đời mới, đón trả tận nơi trung tâm thành phố.',
    'APPROVED',
    adm.id,
    NOW() - INTERVAL '7 days',
    4.80,
    42
FROM users owner
JOIN users adm ON adm.email = 'admin@ridesharehub.vn'
WHERE owner.email = 'nhaxe@hoanglong.vn'
ON CONFLICT DO NOTHING;

INSERT INTO transport_companies (
    owner_user_id, name, business_license_no, tax_code, address,
    contact_phone, contact_email, representative_name, business_information,
    description, status
)
SELECT
    owner.id,
    'Nhà xe Phương Trang Test',
    'GP-75-00881',
    '3301987654',
    '97 An Dương Vương, TP. Huế',
    '0914222333',
    'nhaxecho@phuongtrang.vn',
    'Trần Thị Mai',
    'Hồ sơ đăng ký đối tác mới tuyến Huế - Đà Nẵng đang chờ quản trị viên phê duyệt.',
    'Xe Limousine VIP 9-16 chỗ.',
    'PENDING'
FROM users owner
WHERE owner.email = 'nhaxecho@phuongtrang.vn'
ON CONFLICT DO NOTHING;

-- 3. Vehicles for Approved Company
INSERT INTO vehicles (company_id, plate_number, vehicle_type, brand, model, seat_capacity, description, status)
SELECT c.id, v.plate_number, v.vehicle_type, v.brand, v.model, v.seat_capacity, v.description, v.status::vehicle_status
FROM transport_companies c
CROSS JOIN (
    VALUES
        ('43B-01234', 'Limousine 9 chỗ',  'Hyundai', 'Solati',     9,  'Xe ghế ngả cao cấp, wifi, cổng sạc USB', 'AVAILABLE'),
        ('43B-05678', 'Xe khách 16 chỗ',  'Ford',    'Transit',    16, 'Xe 16 chỗ điều hòa mát lạnh',            'AVAILABLE'),
        ('43B-09999', 'Limousine 11 chỗ', 'DCar',    'VIP Lounge', 11, 'Đang bảo dưỡng định kỳ',                 'MAINTENANCE')
) AS v(plate_number, vehicle_type, brand, model, seat_capacity, description, status)
WHERE c.contact_email = 'nhaxe@hoanglong.vn'
ON CONFLICT (plate_number) DO NOTHING;

-- 4. Drivers linked to DRIVER users
INSERT INTO drivers (company_id, user_id, full_name, phone, license_number, status)
SELECT c.id, u.id, 'Lê Minh Tuấn', '0905111222', '43A-B2-99102', 'AVAILABLE'
FROM transport_companies c
JOIN users u ON u.email = 'taixe1@hoanglong.vn'
WHERE c.contact_email = 'nhaxe@hoanglong.vn'
  AND NOT EXISTS (SELECT 1 FROM drivers d WHERE d.user_id = u.id)
ON CONFLICT DO NOTHING;

INSERT INTO drivers (company_id, user_id, full_name, phone, license_number, status)
SELECT c.id, u.id, 'Phạm Quốc Bảo', '0905333444', '43A-B2-88210', 'AVAILABLE'
FROM transport_companies c
JOIN users u ON u.email = 'taixe2@hoanglong.vn'
WHERE c.contact_email = 'nhaxe@hoanglong.vn'
  AND NOT EXISTS (SELECT 1 FROM drivers d WHERE d.user_id = u.id)
ON CONFLICT DO NOTHING;

-- 5. Routes matching Mobile Passenger popular routes
INSERT INTO routes (company_id, name, origin, destination, estimated_minutes, base_fare, description)
SELECT c.id, r.name, r.origin, r.destination, r.estimated_minutes, r.base_fare, r.description
FROM transport_companies c
CROSS JOIN (
    VALUES
        ('Đà Nẵng - Huế Express', 'Đà Nẵng', 'Huế',       180, 120000.00, 'Tuyến cao tốc La Sơn - Túy Loan / Hầm Hải Vân'),
        ('Đà Nẵng - Hội An',      'Đà Nẵng', 'Hội An',     60,  60000.00, 'Đón sân bay, trung tâm Đà Nẵng đi phố cổ Hội An'),
        ('Hội An - Quảng Nam',    'Hội An',  'Quảng Nam',  45,  45000.00, 'Tuyến nội tỉnh Hội An - Tam Kỳ (Quảng Nam)'),
        ('Huế - Đà Nẵng',         'Huế',     'Đà Nẵng',   180, 120000.00, 'Đón trung tâm TP. Huế trả tận nơi Đà Nẵng')
) AS r(name, origin, destination, estimated_minutes, base_fare, description)
WHERE c.contact_email = 'nhaxe@hoanglong.vn'
  AND NOT EXISTS (
      SELECT 1 FROM routes existing
      WHERE existing.company_id = c.id AND existing.name = r.name
  );

-- 6. Trips (no ±6h vehicle/driver overlap; relative to NOW() so always current)
INSERT INTO trips (route_id, company_id, vehicle_id, driver_id, departure_time, fare, note, status, booked_seats)
SELECT rt.id, c.id, v.id, d.id, NOW() + INTERVAL '3 hours', 120000.00,
       '[SEED-01] Đón khách tại Bến xe Trung tâm Đà Nẵng & Cầu Rồng', 'PUBLISHED', 2
FROM transport_companies c
JOIN routes   rt ON rt.company_id = c.id AND rt.name = 'Đà Nẵng - Huế Express'
JOIN vehicles v  ON v.company_id  = c.id AND v.plate_number = '43B-01234'
JOIN drivers  d  ON d.company_id  = c.id AND d.license_number = '43A-B2-99102'
WHERE c.contact_email = 'nhaxe@hoanglong.vn'
  AND NOT EXISTS (SELECT 1 FROM trips t WHERE t.company_id = c.id AND t.note LIKE '[SEED-01]%');

INSERT INTO trips (route_id, company_id, vehicle_id, driver_id, departure_time, fare, note, status, booked_seats)
SELECT rt.id, c.id, v.id, d.id, NOW() + INTERVAL '4 hours', 60000.00,
       '[SEED-02] Đón tại Sân bay Đà Nẵng & bãi biển Mỹ Khê', 'PUBLISHED', 1
FROM transport_companies c
JOIN routes   rt ON rt.company_id = c.id AND rt.name = 'Đà Nẵng - Hội An'
JOIN vehicles v  ON v.company_id  = c.id AND v.plate_number = '43B-05678'
JOIN drivers  d  ON d.company_id  = c.id AND d.license_number = '43A-B2-88210'
WHERE c.contact_email = 'nhaxe@hoanglong.vn'
  AND NOT EXISTS (SELECT 1 FROM trips t WHERE t.company_id = c.id AND t.note LIKE '[SEED-02]%');

INSERT INTO trips (route_id, company_id, vehicle_id, driver_id, departure_time, fare, note, status, booked_seats)
SELECT rt.id, c.id, v.id, d.id, NOW() + INTERVAL '24 hours', 45000.00,
       '[SEED-03] Chuyến sáng Hội An đi Tam Kỳ Quảng Nam', 'PUBLISHED', 0
FROM transport_companies c
JOIN routes   rt ON rt.company_id = c.id AND rt.name = 'Hội An - Quảng Nam'
JOIN vehicles v  ON v.company_id  = c.id AND v.plate_number = '43B-01234'
JOIN drivers  d  ON d.company_id  = c.id AND d.license_number = '43A-B2-99102'
WHERE c.contact_email = 'nhaxe@hoanglong.vn'
  AND NOT EXISTS (SELECT 1 FROM trips t WHERE t.company_id = c.id AND t.note LIKE '[SEED-03]%');

INSERT INTO trips (route_id, company_id, vehicle_id, driver_id, departure_time, fare, note, status, booked_seats)
SELECT rt.id, c.id, v.id, d.id, NOW() + INTERVAL '26 hours', 120000.00,
       '[SEED-04] Đón khách tại Ga Huế & Bến xe phía Nam', 'PUBLISHED', 2
FROM transport_companies c
JOIN routes   rt ON rt.company_id = c.id AND rt.name = 'Huế - Đà Nẵng'
JOIN vehicles v  ON v.company_id  = c.id AND v.plate_number = '43B-05678'
JOIN drivers  d  ON d.company_id  = c.id AND d.license_number = '43A-B2-88210'
WHERE c.contact_email = 'nhaxe@hoanglong.vn'
  AND NOT EXISTS (SELECT 1 FROM trips t WHERE t.company_id = c.id AND t.note LIKE '[SEED-04]%');

INSERT INTO trips (route_id, company_id, vehicle_id, driver_id, departure_time, fare, note, status, booked_seats)
SELECT rt.id, c.id, v.id, d.id, NOW() + INTERVAL '48 hours', 120000.00,
       '[SEED-05] Chuyến nháp chờ nhà xe công bố', 'DRAFT', 0
FROM transport_companies c
JOIN routes   rt ON rt.company_id = c.id AND rt.name = 'Đà Nẵng - Huế Express'
JOIN vehicles v  ON v.company_id  = c.id AND v.plate_number = '43B-01234'
JOIN drivers  d  ON d.company_id  = c.id AND d.license_number = '43A-B2-99102'
WHERE c.contact_email = 'nhaxe@hoanglong.vn'
  AND NOT EXISTS (SELECT 1 FROM trips t WHERE t.company_id = c.id AND t.note LIKE '[SEED-05]%');

INSERT INTO trips (route_id, company_id, vehicle_id, driver_id, departure_time, fare, note, status, booked_seats)
SELECT rt.id, c.id, v.id, d.id, NOW() - INTERVAL '24 hours', 120000.00,
       '[SEED-06] Chuyến đã hoàn thành hôm qua', 'COMPLETED', 2
FROM transport_companies c
JOIN routes   rt ON rt.company_id = c.id AND rt.name = 'Huế - Đà Nẵng'
JOIN vehicles v  ON v.company_id  = c.id AND v.plate_number = '43B-01234'
JOIN drivers  d  ON d.company_id  = c.id AND d.license_number = '43A-B2-99102'
WHERE c.contact_email = 'nhaxe@hoanglong.vn'
  AND NOT EXISTS (SELECT 1 FROM trips t WHERE t.company_id = c.id AND t.note LIKE '[SEED-06]%');

-- 7. Sample Bookings (totals match trips.booked_seats above)
INSERT INTO bookings (
    booking_code, trip_id, passenger_id, idempotency_key, seat_count,
    pickup_address, pickup_lat, pickup_lng, dropoff_address, dropoff_lat, dropoff_lng,
    estimated_fare, status, confirmed_at
)
SELECT
    'BK-SEED0001', t.id, p.id, 'seed-idem-bk-0001', 2,
    'Bến xe Trung tâm Đà Nẵng', 16.0544000, 108.1742000,
    'BigC Huế, Bà Triệu',       16.4637000, 107.5909000,
    240000.00, 'CONFIRMED', NOW() - INTERVAL '1 hour'
FROM trips t
JOIN transport_companies c ON c.id = t.company_id
JOIN users p ON p.email = 'khach1@gmail.com'
WHERE c.contact_email = 'nhaxe@hoanglong.vn' AND t.note LIKE '[SEED-01]%'
ON CONFLICT DO NOTHING;

INSERT INTO bookings (
    booking_code, trip_id, passenger_id, idempotency_key, seat_count,
    pickup_address, pickup_lat, pickup_lng, dropoff_address, dropoff_lat, dropoff_lng,
    estimated_fare, status, confirmed_at
)
SELECT
    'BK-SEED0002', t.id, p.id, 'seed-idem-bk-0002', 1,
    'Sân bay Quốc tế Đà Nẵng', 16.0539000, 108.2022000,
    'Phố cổ Hội An',           15.8801000, 108.3380000,
    60000.00, 'CONFIRMED', NOW() - INTERVAL '30 minutes'
FROM trips t
JOIN transport_companies c ON c.id = t.company_id
JOIN users p ON p.email = 'khach2@gmail.com'
WHERE c.contact_email = 'nhaxe@hoanglong.vn' AND t.note LIKE '[SEED-02]%'
ON CONFLICT DO NOTHING;

INSERT INTO bookings (
    booking_code, trip_id, passenger_id, idempotency_key, seat_count,
    pickup_address, pickup_lat, pickup_lng, dropoff_address, dropoff_lat, dropoff_lng,
    estimated_fare, status, confirmed_at
)
SELECT
    'BK-SEED0003', t.id, p.id, 'seed-idem-bk-0003', 2,
    'Ga Huế, Bùi Thị Xuân',    16.4577000, 107.5754000,
    'Cầu Rồng, Đà Nẵng',       16.0611000, 108.2271000,
    240000.00, 'CONFIRMED', NOW() - INTERVAL '2 hours'
FROM trips t
JOIN transport_companies c ON c.id = t.company_id
JOIN users p ON p.email = 'khach1@gmail.com'
WHERE c.contact_email = 'nhaxe@hoanglong.vn' AND t.note LIKE '[SEED-04]%'
ON CONFLICT DO NOTHING;

INSERT INTO bookings (
    booking_code, trip_id, passenger_id, idempotency_key, seat_count,
    pickup_address, pickup_lat, pickup_lng, dropoff_address, dropoff_lat, dropoff_lng,
    estimated_fare, status, confirmed_at, picked_up_at, completed_at
)
SELECT
    'BK-SEED0004', t.id, p.id, 'seed-idem-bk-0004', 2,
    'Bến xe phía Nam Huế',     16.4470000, 107.6030000,
    'Trung tâm Đà Nẵng',       16.0678000, 108.2208000,
    240000.00, 'COMPLETED',
    NOW() - INTERVAL '30 hours', NOW() - INTERVAL '24 hours', NOW() - INTERVAL '21 hours'
FROM trips t
JOIN transport_companies c ON c.id = t.company_id
JOIN users p ON p.email = 'khach2@gmail.com'
WHERE c.contact_email = 'nhaxe@hoanglong.vn' AND t.note LIKE '[SEED-06]%'
ON CONFLICT DO NOTHING;

COMMIT;
