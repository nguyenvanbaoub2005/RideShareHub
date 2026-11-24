-- Dev/Test seed data for RideShareHub (idempotent — safe to re-run).
-- Uniform password for all test accounts: Test@123456
-- BCrypt(10) generated with org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder

BEGIN;

-- =============================================================================
-- 1. USERS (Admin, 7 Transport Companies, 8 Drivers, 8 Passengers incl. 1 LOCKED)
-- =============================================================================
INSERT INTO users (email, phone, password_hash, full_name, role, status)
VALUES
    -- Admin
    ('admin@ridesharehub.vn',    '0901000001', '$2a$10$OFORQHpAJzPTOsUBGRhmr.C.QZzLI1ped1vlBrKc50kLw9YZvXs9K', 'Quản Trị Viên',      'ADMIN',             'ACTIVE'),

    -- Transport Company Owners
    ('nhaxe@hoanglong.vn',       '0905123456', '$2a$10$OFORQHpAJzPTOsUBGRhmr.C.QZzLI1ped1vlBrKc50kLw9YZvXs9K', 'Nguyễn Văn Hùng',    'TRANSPORT_COMPANY', 'ACTIVE'),
    ('dieuhanh@minhtam.vn',      '0905234567', '$2a$10$OFORQHpAJzPTOsUBGRhmr.C.QZzLI1ped1vlBrKc50kLw9YZvXs9K', 'Nguyễn Minh Tâm',    'TRANSPORT_COMPANY', 'ACTIVE'),
    ('lienhe@haivan.vn',         '0905887331', '$2a$10$OFORQHpAJzPTOsUBGRhmr.C.QZzLI1ped1vlBrKc50kLw9YZvXs9K', 'Phạm Thanh Hải',     'TRANSPORT_COMPANY', 'ACTIVE'),
    ('info@huonggiang.vn',       '0918203456', '$2a$10$OFORQHpAJzPTOsUBGRhmr.C.QZzLI1ped1vlBrKc50kLw9YZvXs9K', 'Nguyễn Thị Hương',   'TRANSPORT_COMPANY', 'ACTIVE'),
    ('nhaxecho@phuongtrang.vn',  '0914222333', '$2a$10$OFORQHpAJzPTOsUBGRhmr.C.QZzLI1ped1vlBrKc50kLw9YZvXs9K', 'Trần Thị Mai',       'TRANSPORT_COMPANY', 'ACTIVE'),
    ('lienhe@thanhcong.vn',      '0914333444', '$2a$10$OFORQHpAJzPTOsUBGRhmr.C.QZzLI1ped1vlBrKc50kLw9YZvXs9K', 'Trần Quốc Thành',    'TRANSPORT_COMPANY', 'ACTIVE'),
    ('info@binhminh.vn',         '0934123789', '$2a$10$OFORQHpAJzPTOsUBGRhmr.C.QZzLI1ped1vlBrKc50kLw9YZvXs9K', 'Lê Văn Bình',        'TRANSPORT_COMPANY', 'ACTIVE'),

    -- Drivers
    ('taixe1@hoanglong.vn',      '0905111222', '$2a$10$OFORQHpAJzPTOsUBGRhmr.C.QZzLI1ped1vlBrKc50kLw9YZvXs9K', 'Lê Minh Tuấn',       'DRIVER',            'ACTIVE'),
    ('taixe2@hoanglong.vn',      '0905333444', '$2a$10$OFORQHpAJzPTOsUBGRhmr.C.QZzLI1ped1vlBrKc50kLw9YZvXs9K', 'Phạm Quốc Bảo',      'DRIVER',            'ACTIVE'),
    ('taixe3@hoanglong.vn',      '0905444555', '$2a$10$OFORQHpAJzPTOsUBGRhmr.C.QZzLI1ped1vlBrKc50kLw9YZvXs9K', 'Đỗ Minh Khoa',       'DRIVER',            'ACTIVE'),
    ('hai.nguyen@minhtam.vn',    '0905111333', '$2a$10$OFORQHpAJzPTOsUBGRhmr.C.QZzLI1ped1vlBrKc50kLw9YZvXs9K', 'Nguyễn Văn Hải',     'DRIVER',            'ACTIVE'),
    ('bao.tran@minhtam.vn',      '0914333555', '$2a$10$OFORQHpAJzPTOsUBGRhmr.C.QZzLI1ped1vlBrKc50kLw9YZvXs9K', 'Trần Quốc Bảo',      'DRIVER',            'ACTIVE'),
    ('tung.le@haivan.vn',        '0935555666', '$2a$10$OFORQHpAJzPTOsUBGRhmr.C.QZzLI1ped1vlBrKc50kLw9YZvXs9K', 'Lê Thanh Tùng',      'DRIVER',            'ACTIVE'),
    ('duc.pham@haivan.vn',       '0988301888', '$2a$10$OFORQHpAJzPTOsUBGRhmr.C.QZzLI1ped1vlBrKc50kLw9YZvXs9K', 'Phạm Minh Đức',      'DRIVER',            'ACTIVE'),
    ('nam.vo@huonggiang.vn',     '0977456111', '$2a$10$OFORQHpAJzPTOsUBGRhmr.C.QZzLI1ped1vlBrKc50kLw9YZvXs9K', 'Võ Hoàng Nam',       'DRIVER',            'ACTIVE'),

    -- Passengers
    ('khach1@gmail.com',         '0988111222', '$2a$10$OFORQHpAJzPTOsUBGRhmr.C.QZzLI1ped1vlBrKc50kLw9YZvXs9K', 'Trần Minh Anh',      'PASSENGER',         'ACTIVE'),
    ('khach2@gmail.com',         '0988333444', '$2a$10$OFORQHpAJzPTOsUBGRhmr.C.QZzLI1ped1vlBrKc50kLw9YZvXs9K', 'Võ Thảo Vy',         'PASSENGER',         'ACTIVE'),
    ('khach3@gmail.com',         '0914220118', '$2a$10$OFORQHpAJzPTOsUBGRhmr.C.QZzLI1ped1vlBrKc50kLw9YZvXs9K', 'Trần Thị Lan',       'PASSENGER',         'ACTIVE'),
    ('khach4@gmail.com',         '0935884120', '$2a$10$OFORQHpAJzPTOsUBGRhmr.C.QZzLI1ped1vlBrKc50kLw9YZvXs9K', 'Lê Hoàng Nam',       'PASSENGER',         'ACTIVE'),
    ('khach5@gmail.com',         '0988301775', '$2a$10$OFORQHpAJzPTOsUBGRhmr.C.QZzLI1ped1vlBrKc50kLw9YZvXs9K', 'Phạm Quốc Việt',     'PASSENGER',         'ACTIVE'),
    ('khach6@gmail.com',         '0977456002', '$2a$10$OFORQHpAJzPTOsUBGRhmr.C.QZzLI1ped1vlBrKc50kLw9YZvXs9K', 'Võ Thị Hương',       'PASSENGER',         'ACTIVE'),
    ('khach7@gmail.com',         '0905887990', '$2a$10$OFORQHpAJzPTOsUBGRhmr.C.QZzLI1ped1vlBrKc50kLw9YZvXs9K', 'Nguyễn Thị Thu',     'PASSENGER',         'ACTIVE'),
    ('khach8@gmail.com',         '0905776998', '$2a$10$OFORQHpAJzPTOsUBGRhmr.C.QZzLI1ped1vlBrKc50kLw9YZvXs9K', 'Đặng Minh Tuấn',     'PASSENGER',         'LOCKED')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 2. TRANSPORT COMPANIES (4 APPROVED, 2 PENDING, 1 REJECTED)
-- =============================================================================

-- 2.1 Nhà xe Hoàng Long Miền Trung (APPROVED)
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

-- 2.2 Nhà xe Minh Tâm (APPROVED — Figma sample)
INSERT INTO transport_companies (
    owner_user_id, name, business_license_no, tax_code, address,
    contact_phone, contact_email, representative_name, business_information,
    description, status, approved_by, approved_at, avg_rating, rating_count
)
SELECT
    owner.id,
    'Nhà xe Minh Tâm',
    'GP-43-00215',
    '0402123456',
    '201 Tôn Đức Thắng, Phường Hòa Minh, Quận Liên Chiểu, Đà Nẵng',
    '0905234567',
    'dieuhanh@minhtam.vn',
    'Nguyễn Minh Tâm',
    'Vận tải hành khách tuyến cố định và hợp đồng xe ghép Đà Nẵng - Huế - Hội An.',
    'DCar Limousine 9 chỗ và Ford Transit 16 chỗ cao cấp, khởi hành đúng giờ.',
    'APPROVED',
    adm.id,
    NOW() - INTERVAL '14 days',
    4.90,
    156
FROM users owner
JOIN users adm ON adm.email = 'admin@ridesharehub.vn'
WHERE owner.email = 'dieuhanh@minhtam.vn'
ON CONFLICT DO NOTHING;

-- 2.3 Nhà xe Hải Vân Express (APPROVED — Figma & Docs sample)
INSERT INTO transport_companies (
    owner_user_id, name, business_license_no, tax_code, address,
    contact_phone, contact_email, representative_name, business_information,
    description, status, approved_by, approved_at, avg_rating, rating_count
)
SELECT
    owner.id,
    'Nhà xe Hải Vân Express',
    'GP-43-00308',
    '0401567890',
    '120 Điện Biên Phủ, Phường Chính Gián, Quận Thanh Khê, Đà Nẵng',
    '0905887331',
    'lienhe@haivan.vn',
    'Phạm Thanh Hải',
    'Chuyên tuyến cao tốc La Sơn - Túy Loan và đèo/hầm Hải Vân đi Huế - Đà Nẵng.',
    'Phục vụ nước suối, khăn lạnh, wifi tốc độ cao miễn phí.',
    'APPROVED',
    adm.id,
    NOW() - INTERVAL '10 days',
    4.70,
    198
FROM users owner
JOIN users adm ON adm.email = 'admin@ridesharehub.vn'
WHERE owner.email = 'lienhe@haivan.vn'
ON CONFLICT DO NOTHING;

-- 2.4 Nhà xe Hương Giang (APPROVED — Figma sample)
INSERT INTO transport_companies (
    owner_user_id, name, business_license_no, tax_code, address,
    contact_phone, contact_email, representative_name, business_information,
    description, status, approved_by, approved_at, avg_rating, rating_count
)
SELECT
    owner.id,
    'Nhà xe Hương Giang',
    'GP-75-00412',
    '3301456789',
    '85 Bà Triệu, Phường Phú Hội, TP. Huế',
    '0918203456',
    'info@huonggiang.vn',
    'Nguyễn Thị Hương',
    'Xe ghép Cố Đô Huế đi Sân bay Đà Nẵng, Hội An và ngược lại.',
    'Đón tận nhà tại nội thành Huế, trả tận sân bay và bệnh viện Đà Nẵng.',
    'APPROVED',
    adm.id,
    NOW() - INTERVAL '12 days',
    4.65,
    112
FROM users owner
JOIN users adm ON adm.email = 'admin@ridesharehub.vn'
WHERE owner.email = 'info@huonggiang.vn'
ON CONFLICT DO NOTHING;

-- 2.5 Nhà xe Phương Trang Test (PENDING)
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

-- 2.6 Nhà xe Thành Công (PENDING — Figma sample)
INSERT INTO transport_companies (
    owner_user_id, name, business_license_no, tax_code, address,
    contact_phone, contact_email, representative_name, business_information,
    description, status
)
SELECT
    owner.id,
    'Nhà xe Thành Công',
    'GP-92-00519',
    '4001234567',
    '68 Hùng Vương, Phường An Mỹ, TP. Tam Kỳ, Quảng Nam',
    '0914333444',
    'lienhe@thanhcong.vn',
    'Trần Quốc Thành',
    'Đăng ký khai thác tuyến Tam Kỳ - Hội An - Đà Nẵng.',
    'Đội xe Hyundai Solati 16 chỗ đời 2024.',
    'PENDING'
FROM users owner
WHERE owner.email = 'lienhe@thanhcong.vn'
ON CONFLICT DO NOTHING;

-- 2.7 Nhà xe Bình Minh (REJECTED — Figma sample)
INSERT INTO transport_companies (
    owner_user_id, name, business_license_no, tax_code, address,
    contact_phone, contact_email, representative_name, business_information,
    description, status, approved_by, approved_at, reject_reason
)
SELECT
    owner.id,
    'Nhà xe Bình Minh',
    'GP-43-00901',
    '0401987654',
    '91 Nguyễn Tất Thành, Phường Thanh Bình, Quận Hải Châu, Đà Nẵng',
    '0934123789',
    'info@binhminh.vn',
    'Lê Văn Bình',
    'Hồ sơ đăng ký vận tải hành khách tuyến Đà Nẵng - Quảng Nam.',
    'Xe hợp đồng 7-16 chỗ.',
    'REJECTED',
    adm.id,
    NOW() - INTERVAL '3 days',
    'Giấy phép kinh doanh vận tải bằng xe ô tô đã hết hạn hiệu lực. Vui lòng cập nhật bản sao công chứng mới và gửi duyệt lại.'
FROM users owner
JOIN users adm ON adm.email = 'admin@ridesharehub.vn'
WHERE owner.email = 'info@binhminh.vn'
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 3. VEHICLES (Across Approved Companies)
-- =============================================================================

-- Hoàng Long Vehicles
INSERT INTO vehicles (company_id, plate_number, vehicle_type, brand, model, seat_capacity, description, status)
SELECT c.id, v.plate_number, v.vehicle_type, v.brand, v.model, v.seat_capacity, v.description, v.status::vehicle_status
FROM transport_companies c
CROSS JOIN (
    VALUES
        ('43B-01234', 'Limousine 9 chỗ',  'Hyundai',  'Solati Limousine', 9,  'Xe ghế ngả massage cao cấp, wifi, cổng sạc USB', 'AVAILABLE'),
        ('43B-05678', 'Xe khách 16 chỗ',  'Ford',     'Transit Luxury',   16, 'Xe 16 chỗ điều hòa mát lạnh, khoang hành lý rộng', 'AVAILABLE'),
        ('43B-08888', 'Xe ghép 7 chỗ',    'Kia',      'Carnival Signature', 7, 'Xe gia đình/ghép VIP 7 chỗ cực êm',             'AVAILABLE'),
        ('43B-09999', 'Limousine 11 chỗ', 'DCar',     'VIP Lounge',       11, 'Đang bảo dưỡng định kỳ hệ thống phanh',          'MAINTENANCE')
) AS v(plate_number, vehicle_type, brand, model, seat_capacity, description, status)
WHERE c.contact_email = 'nhaxe@hoanglong.vn'
ON CONFLICT (plate_number) DO NOTHING;

-- Minh Tâm Vehicles
INSERT INTO vehicles (company_id, plate_number, vehicle_type, brand, model, seat_capacity, description, status)
SELECT c.id, v.plate_number, v.vehicle_type, v.brand, v.model, v.seat_capacity, v.description, v.status::vehicle_status
FROM transport_companies c
CROSS JOIN (
    VALUES
        ('43A-24518', 'Limousine 9 chỗ',  'DCar',     'Hạng Thương Gia',  9,  'Ghế Boeing massage, màn hình riêng, sạc nhanh', 'AVAILABLE'),
        ('43A-12345', 'Xe khách 16 chỗ',  'Ford',     'Transit 2024',     16, 'Xe tiêu chuẩn chạy tuyến Đà Nẵng - Huế',        'AVAILABLE'),
        ('92A-33218', 'Xe ghép 7 chỗ',    'Toyota',   'Fortuner Legender', 7, 'Xe 7 chỗ gầm cao chuyên tuyến Hội An - Tam Kỳ', 'AVAILABLE'),
        ('75B-02836', 'Xe khách 16 chỗ',  'Mercedes', 'Sprinter',         16, 'Xe dự phòng tạm ngưng khai thác',               'INACTIVE')
) AS v(plate_number, vehicle_type, brand, model, seat_capacity, description, status)
WHERE c.contact_email = 'dieuhanh@minhtam.vn'
ON CONFLICT (plate_number) DO NOTHING;

-- Hải Vân Express Vehicles
INSERT INTO vehicles (company_id, plate_number, vehicle_type, brand, model, seat_capacity, description, status)
SELECT c.id, v.plate_number, v.vehicle_type, v.brand, v.model, v.seat_capacity, v.description, v.status::vehicle_status
FROM transport_companies c
CROSS JOIN (
    VALUES
        ('43C-33122', 'Xe khách 16 chỗ',  'Hyundai',  'Solati H350',      16, 'Khoang trần cao, ghế da cao cấp, nước uống',     'AVAILABLE'),
        ('43C-41007', 'Limousine 9 chỗ',  'Ford',     'Tourneo Limousine', 9, 'Chuyên cơ mặt đất đón trả sân bay',             'AVAILABLE')
) AS v(plate_number, vehicle_type, brand, model, seat_capacity, description, status)
WHERE c.contact_email = 'lienhe@haivan.vn'
ON CONFLICT (plate_number) DO NOTHING;

-- Hương Giang Vehicles
INSERT INTO vehicles (company_id, plate_number, vehicle_type, brand, model, seat_capacity, description, status)
SELECT c.id, v.plate_number, v.vehicle_type, v.brand, v.model, v.seat_capacity, v.description, v.status::vehicle_status
FROM transport_companies c
CROSS JOIN (
    VALUES
        ('75A-20814', 'Limousine 9 chỗ',  'DCar',     'Solati President', 9,  'Limousine Cố Đô Huế đi Đà Nẵng - Hội An',       'AVAILABLE'),
        ('75A-33952', 'Xe ghép 7 chỗ',    'Mitsubishi','Xpander Cross',   7,  'Xe ghép nhanh đón trả tận nhà nội thành Huế',   'AVAILABLE')
) AS v(plate_number, vehicle_type, brand, model, seat_capacity, description, status)
WHERE c.contact_email = 'info@huonggiang.vn'
ON CONFLICT (plate_number) DO NOTHING;

-- =============================================================================
-- 4. DRIVERS (Linked to DRIVER users)
-- =============================================================================
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

INSERT INTO drivers (company_id, user_id, full_name, phone, license_number, status)
SELECT c.id, u.id, 'Đỗ Minh Khoa', '0905444555', '43A-D-77105', 'INACTIVE'
FROM transport_companies c
JOIN users u ON u.email = 'taixe3@hoanglong.vn'
WHERE c.contact_email = 'nhaxe@hoanglong.vn'
  AND NOT EXISTS (SELECT 1 FROM drivers d WHERE d.user_id = u.id)
ON CONFLICT DO NOTHING;

INSERT INTO drivers (company_id, user_id, full_name, phone, license_number, status)
SELECT c.id, u.id, 'Nguyễn Văn Hải', '0905111333', '430123456789', 'AVAILABLE'
FROM transport_companies c
JOIN users u ON u.email = 'hai.nguyen@minhtam.vn'
WHERE c.contact_email = 'dieuhanh@minhtam.vn'
  AND NOT EXISTS (SELECT 1 FROM drivers d WHERE d.user_id = u.id)
ON CONFLICT DO NOTHING;

INSERT INTO drivers (company_id, user_id, full_name, phone, license_number, status)
SELECT c.id, u.id, 'Trần Quốc Bảo', '0914333555', '430234567890', 'AVAILABLE'
FROM transport_companies c
JOIN users u ON u.email = 'bao.tran@minhtam.vn'
WHERE c.contact_email = 'dieuhanh@minhtam.vn'
  AND NOT EXISTS (SELECT 1 FROM drivers d WHERE d.user_id = u.id)
ON CONFLICT DO NOTHING;

INSERT INTO drivers (company_id, user_id, full_name, phone, license_number, status)
SELECT c.id, u.id, 'Lê Thanh Tùng', '0935555666', '920345678901', 'AVAILABLE'
FROM transport_companies c
JOIN users u ON u.email = 'tung.le@haivan.vn'
WHERE c.contact_email = 'lienhe@haivan.vn'
  AND NOT EXISTS (SELECT 1 FROM drivers d WHERE d.user_id = u.id)
ON CONFLICT DO NOTHING;

INSERT INTO drivers (company_id, user_id, full_name, phone, license_number, status)
SELECT c.id, u.id, 'Phạm Minh Đức', '0988301888', '750456789012', 'AVAILABLE'
FROM transport_companies c
JOIN users u ON u.email = 'duc.pham@haivan.vn'
WHERE c.contact_email = 'lienhe@haivan.vn'
  AND NOT EXISTS (SELECT 1 FROM drivers d WHERE d.user_id = u.id)
ON CONFLICT DO NOTHING;

INSERT INTO drivers (company_id, user_id, full_name, phone, license_number, status)
SELECT c.id, u.id, 'Võ Hoàng Nam', '0977456111', '430567890123', 'AVAILABLE'
FROM transport_companies c
JOIN users u ON u.email = 'nam.vo@huonggiang.vn'
WHERE c.contact_email = 'info@huonggiang.vn'
  AND NOT EXISTS (SELECT 1 FROM drivers d WHERE d.user_id = u.id)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 5. ROUTES (Across Approved Companies)
-- =============================================================================

-- Hoàng Long Routes
INSERT INTO routes (company_id, name, origin, destination, estimated_minutes, base_fare, description)
SELECT c.id, r.name, r.origin, r.destination, r.estimated_minutes, r.base_fare, r.description
FROM transport_companies c
CROSS JOIN (
    VALUES
        ('Đà Nẵng - Huế Express', 'Đà Nẵng',   'Huế',       180, 120000.00, 'Tuyến cao tốc La Sơn - Túy Loan / Hầm Hải Vân'),
        ('Đà Nẵng - Hội An',      'Đà Nẵng',   'Hội An',     60,  60000.00, 'Đón sân bay, trung tâm Đà Nẵng đi phố cổ Hội An'),
        ('Hội An - Quảng Nam',    'Hội An',    'Quảng Nam',  45,  45000.00, 'Tuyến nội tỉnh Hội An - Tam Kỳ (Quảng Nam)'),
        ('Huế - Đà Nẵng',         'Huế',       'Đà Nẵng',   180, 120000.00, 'Đón trung tâm TP. Huế trả tận nơi Đà Nẵng'),
        ('Đà Nẵng - Quảng Nam',   'Đà Nẵng',   'Quảng Nam',  90,  80000.00, 'Tuyến Quốc lộ 1A Đà Nẵng - Vĩnh Điện - Tam Kỳ'),
        ('Hội An - Đà Nẵng',      'Hội An',    'Đà Nẵng',    60,  60000.00, 'Phố cổ Hội An về Sân bay & Trung tâm Đà Nẵng')
) AS r(name, origin, destination, estimated_minutes, base_fare, description)
WHERE c.contact_email = 'nhaxe@hoanglong.vn'
  AND NOT EXISTS (
      SELECT 1 FROM routes existing
      WHERE existing.company_id = c.id AND existing.name = r.name
  );

-- Minh Tâm Routes
INSERT INTO routes (company_id, name, origin, destination, estimated_minutes, base_fare, description)
SELECT c.id, r.name, r.origin, r.destination, r.estimated_minutes, r.base_fare, r.description
FROM transport_companies c
CROSS JOIN (
    VALUES
        ('Đà Nẵng - Huế Limousine VIP', 'Đà Nẵng', 'Huế',      165, 150000.00, 'Limousine 9 chỗ chạy thẳng cao tốc, đón trả tận nhà'),
        ('Huế - Đà Nẵng Limousine VIP', 'Huế',     'Đà Nẵng',  165, 150000.00, 'Limousine 9 chỗ Huế về Sân bay Quốc tế Đà Nẵng'),
        ('Đà Nẵng - Hội An Phố Cổ',     'Đà Nẵng', 'Hội An',    55,  65000.00, 'Tuyến ven biển Võ Nguyên Giáp - Cửa Đại - Hội An'),
        ('Hội An - Quảng Nam Express',  'Hội An',  'Quảng Nam', 50,  50000.00, 'Xe ghép 7 chỗ đi Tam Kỳ, Chu Lai')
) AS r(name, origin, destination, estimated_minutes, base_fare, description)
WHERE c.contact_email = 'dieuhanh@minhtam.vn'
  AND NOT EXISTS (
      SELECT 1 FROM routes existing
      WHERE existing.company_id = c.id AND existing.name = r.name
  );

-- Hải Vân Express Routes
INSERT INTO routes (company_id, name, origin, destination, estimated_minutes, base_fare, description)
SELECT c.id, r.name, r.origin, r.destination, r.estimated_minutes, r.base_fare, r.description
FROM transport_companies c
CROSS JOIN (
    VALUES
        ('Đà Nẵng - Huế Hải Vân',  'Đà Nẵng', 'Huế',     175, 130000.00, 'Chạy qua hầm Hải Vân - Lăng Cô - Phú Lộc'),
        ('Huế - Đà Nẵng Hải Vân',  'Huế',     'Đà Nẵng', 175, 130000.00, 'Đón Bến xe phía Nam Huế đi Bến xe Trung tâm Đà Nẵng'),
        ('Đà Nẵng - Hội An Nhanh', 'Đà Nẵng', 'Hội An',   60,  55000.00, 'Tuyến nhanh kết nối ga Đà Nẵng và Hội An')
) AS r(name, origin, destination, estimated_minutes, base_fare, description)
WHERE c.contact_email = 'lienhe@haivan.vn'
  AND NOT EXISTS (
      SELECT 1 FROM routes existing
      WHERE existing.company_id = c.id AND existing.name = r.name
  );

-- Hương Giang Routes
INSERT INTO routes (company_id, name, origin, destination, estimated_minutes, base_fare, description)
SELECT c.id, r.name, r.origin, r.destination, r.estimated_minutes, r.base_fare, r.description
FROM transport_companies c
CROSS JOIN (
    VALUES
        ('Huế - Đà Nẵng Sân Bay', 'Huế',     'Đà Nẵng', 170, 140000.00, 'Chuyên đón khách nội thành Huế đi Sân bay Đà Nẵng'),
        ('Đà Nẵng - Huế Cố Đô',   'Đà Nẵng', 'Huế',     170, 140000.00, 'Đón Sân bay & Bệnh viện Đà Nẵng về tận nhà TP. Huế')
) AS r(name, origin, destination, estimated_minutes, base_fare, description)
WHERE c.contact_email = 'info@huonggiang.vn'
  AND NOT EXISTS (
      SELECT 1 FROM routes existing
      WHERE existing.company_id = c.id AND existing.name = r.name
  );

-- =============================================================================
-- 6. TRIPS (Covers PUBLISHED, IN_PROGRESS with live GPS, FULL, DRAFT, COMPLETED, CANCELLED)
-- =============================================================================

-- [SEED-01] Hoàng Long: Đà Nẵng -> Huế (+3h, PUBLISHED, ACCEPTED by driver, 5 seats booked across 3 bookings)
INSERT INTO trips (
    route_id, company_id, vehicle_id, driver_id, departure_time, fare, note,
    status, booked_seats, assignment_status, accepted_at
)
SELECT rt.id, c.id, v.id, d.id, NOW() + INTERVAL '3 hours', 120000.00,
       '[SEED-01] Đón khách tại Bến xe Trung tâm Đà Nẵng, Nguyễn Văn Linh & Cầu Rồng',
       'PUBLISHED', 5, 'ACCEPTED', NOW() - INTERVAL '2 hours'
FROM transport_companies c
JOIN routes   rt ON rt.company_id = c.id AND rt.name = 'Đà Nẵng - Huế Express'
JOIN vehicles v  ON v.company_id  = c.id AND v.plate_number = '43B-01234'
JOIN drivers  d  ON d.company_id  = c.id AND d.license_number = '43A-B2-99102'
WHERE c.contact_email = 'nhaxe@hoanglong.vn'
  AND NOT EXISTS (SELECT 1 FROM trips t WHERE t.company_id = c.id AND t.note LIKE '[SEED-01]%');

-- [SEED-02] Hoàng Long: Đà Nẵng -> Hội An (+4h, PUBLISHED, ASSIGNED to driver, 3 seats booked across 2 bookings)
INSERT INTO trips (
    route_id, company_id, vehicle_id, driver_id, departure_time, fare, note,
    status, booked_seats, assignment_status
)
SELECT rt.id, c.id, v.id, d.id, NOW() + INTERVAL '4 hours', 60000.00,
       '[SEED-02] Đón tại Sân bay Đà Nẵng & bãi biển Mỹ Khê đi Phố cổ Hội An',
       'PUBLISHED', 3, 'ASSIGNED'
FROM transport_companies c
JOIN routes   rt ON rt.company_id = c.id AND rt.name = 'Đà Nẵng - Hội An'
JOIN vehicles v  ON v.company_id  = c.id AND v.plate_number = '43B-05678'
JOIN drivers  d  ON d.company_id  = c.id AND d.license_number = '43A-B2-88210'
WHERE c.contact_email = 'nhaxe@hoanglong.vn'
  AND NOT EXISTS (SELECT 1 FROM trips t WHERE t.company_id = c.id AND t.note LIKE '[SEED-02]%');

-- [SEED-03] Hoàng Long: Hội An -> Quảng Nam (+24h, PUBLISHED, 1 seat booked)
INSERT INTO trips (
    route_id, company_id, vehicle_id, driver_id, departure_time, fare, note,
    status, booked_seats, assignment_status
)
SELECT rt.id, c.id, v.id, d.id, NOW() + INTERVAL '24 hours', 45000.00,
       '[SEED-03] Chuyến sáng Hội An đi Tam Kỳ Quảng Nam',
       'PUBLISHED', 1, 'ASSIGNED'
FROM transport_companies c
JOIN routes   rt ON rt.company_id = c.id AND rt.name = 'Hội An - Quảng Nam'
JOIN vehicles v  ON v.company_id  = c.id AND v.plate_number = '43B-01234'
JOIN drivers  d  ON d.company_id  = c.id AND d.license_number = '43A-B2-99102'
WHERE c.contact_email = 'nhaxe@hoanglong.vn'
  AND NOT EXISTS (SELECT 1 FROM trips t WHERE t.company_id = c.id AND t.note LIKE '[SEED-03]%');

-- [SEED-04] Hoàng Long: Huế -> Đà Nẵng (+26h, PUBLISHED, 2 seats booked)
INSERT INTO trips (
    route_id, company_id, vehicle_id, driver_id, departure_time, fare, note,
    status, booked_seats, assignment_status, accepted_at
)
SELECT rt.id, c.id, v.id, d.id, NOW() + INTERVAL '26 hours', 120000.00,
       '[SEED-04] Đón khách tại Ga Huế & Bến xe phía Nam về Đà Nẵng',
       'PUBLISHED', 2, 'ACCEPTED', NOW() - INTERVAL '1 hour'
FROM transport_companies c
JOIN routes   rt ON rt.company_id = c.id AND rt.name = 'Huế - Đà Nẵng'
JOIN vehicles v  ON v.company_id  = c.id AND v.plate_number = '43B-05678'
JOIN drivers  d  ON d.company_id  = c.id AND d.license_number = '43A-B2-88210'
WHERE c.contact_email = 'nhaxe@hoanglong.vn'
  AND NOT EXISTS (SELECT 1 FROM trips t WHERE t.company_id = c.id AND t.note LIKE '[SEED-04]%');

-- [SEED-05] Hoàng Long: Đà Nẵng -> Huế (+48h, DRAFT)
INSERT INTO trips (
    route_id, company_id, vehicle_id, driver_id, departure_time, fare, note,
    status, booked_seats, assignment_status
)
SELECT rt.id, c.id, v.id, d.id, NOW() + INTERVAL '48 hours', 120000.00,
       '[SEED-05] Chuyến nháp chờ nhà xe kiểm tra và công bố',
       'DRAFT', 0, 'ASSIGNED'
FROM transport_companies c
JOIN routes   rt ON rt.company_id = c.id AND rt.name = 'Đà Nẵng - Huế Express'
JOIN vehicles v  ON v.company_id  = c.id AND v.plate_number = '43B-01234'
JOIN drivers  d  ON d.company_id  = c.id AND d.license_number = '43A-B2-99102'
WHERE c.contact_email = 'nhaxe@hoanglong.vn'
  AND NOT EXISTS (SELECT 1 FROM trips t WHERE t.company_id = c.id AND t.note LIKE '[SEED-05]%');

-- [SEED-06] Hoàng Long: Huế -> Đà Nẵng (-24h, COMPLETED, 4 seats booked across 2 bookings)
INSERT INTO trips (
    route_id, company_id, vehicle_id, driver_id, departure_time, fare, note,
    status, booked_seats, assignment_status, accepted_at, started_at, completed_at,
    last_lat, last_lng, last_heading, last_speed_kmh, last_location_at
)
SELECT rt.id, c.id, v.id, d.id, NOW() - INTERVAL '24 hours', 120000.00,
       '[SEED-06] Chuyến đã hoàn thành hôm qua (có đánh giá mẫu)',
       'COMPLETED', 4, 'ACCEPTED',
       NOW() - INTERVAL '26 hours', NOW() - INTERVAL '24 hours', NOW() - INTERVAL '21 hours',
       16.0678000, 108.2208000, 145.00, 0.00, NOW() - INTERVAL '21 hours'
FROM transport_companies c
JOIN routes   rt ON rt.company_id = c.id AND rt.name = 'Huế - Đà Nẵng'
JOIN vehicles v  ON v.company_id  = c.id AND v.plate_number = '43B-01234'
JOIN drivers  d  ON d.company_id  = c.id AND d.license_number = '43A-B2-99102'
WHERE c.contact_email = 'nhaxe@hoanglong.vn'
  AND NOT EXISTS (SELECT 1 FROM trips t WHERE t.company_id = c.id AND t.note LIKE '[SEED-06]%');

-- [SEED-07] Hoàng Long: Đà Nẵng -> Huế (-40m, IN_PROGRESS live tracking demo for Driver 1 & Passenger 1/3)
INSERT INTO trips (
    route_id, company_id, vehicle_id, driver_id, departure_time, fare, note,
    status, booked_seats, assignment_status, accepted_at, started_at,
    last_lat, last_lng, last_heading, last_speed_kmh, last_location_at
)
SELECT rt.id, c.id, v.id, d.id, NOW() - INTERVAL '40 minutes', 135000.00,
       '[SEED-07] Chuyến đang chạy trực tiếp qua đèo Hải Vân - Lăng Cô (Live GPS Tracking)',
       'IN_PROGRESS', 3, 'ACCEPTED',
       NOW() - INTERVAL '3 hours', NOW() - INTERVAL '40 minutes',
       16.2081000, 108.1318000, 330.00, 58.50, NOW() - INTERVAL '1 minute'
FROM transport_companies c
JOIN routes   rt ON rt.company_id = c.id AND rt.name = 'Đà Nẵng - Huế Express'
JOIN vehicles v  ON v.company_id  = c.id AND v.plate_number = '43B-08888'
JOIN drivers  d  ON d.company_id  = c.id AND d.license_number = '43A-B2-99102'
WHERE c.contact_email = 'nhaxe@hoanglong.vn'
  AND NOT EXISTS (SELECT 1 FROM trips t WHERE t.company_id = c.id AND t.note LIKE '[SEED-07]%');

-- [SEED-08] Minh Tâm: Đà Nẵng -> Huế (+2h, PUBLISHED, Limousine VIP 9 chỗ, 2 seats booked)
INSERT INTO trips (
    route_id, company_id, vehicle_id, driver_id, departure_time, fare, note,
    status, booked_seats, assignment_status, accepted_at
)
SELECT rt.id, c.id, v.id, d.id, NOW() + INTERVAL '2 hours', 150000.00,
       '[SEED-08] Limousine Hạng Thương Gia 9 chỗ - Đón tận nơi Hải Châu & Sân bay',
       'PUBLISHED', 2, 'ACCEPTED', NOW() - INTERVAL '3 hours'
FROM transport_companies c
JOIN routes   rt ON rt.company_id = c.id AND rt.name = 'Đà Nẵng - Huế Limousine VIP'
JOIN vehicles v  ON v.company_id  = c.id AND v.plate_number = '43A-24518'
JOIN drivers  d  ON d.company_id  = c.id AND d.license_number = '430123456789'
WHERE c.contact_email = 'dieuhanh@minhtam.vn'
  AND NOT EXISTS (SELECT 1 FROM trips t WHERE t.company_id = c.id AND t.note LIKE '[SEED-08]%');

-- [SEED-09] Minh Tâm: Đà Nẵng -> Hội An (+5h, PUBLISHED, 0 seats booked)
INSERT INTO trips (
    route_id, company_id, vehicle_id, driver_id, departure_time, fare, note,
    status, booked_seats, assignment_status, accepted_at
)
SELECT rt.id, c.id, v.id, d.id, NOW() + INTERVAL '5 hours', 65000.00,
       '[SEED-09] Tuyến ven biển Mỹ Khê - Ngũ Hành Sơn - Phố cổ Hội An',
       'PUBLISHED', 0, 'ACCEPTED', NOW() - INTERVAL '1 hour'
FROM transport_companies c
JOIN routes   rt ON rt.company_id = c.id AND rt.name = 'Đà Nẵng - Hội An Phố Cổ'
JOIN vehicles v  ON v.company_id  = c.id AND v.plate_number = '43A-12345'
JOIN drivers  d  ON d.company_id  = c.id AND d.license_number = '430234567890'
WHERE c.contact_email = 'dieuhanh@minhtam.vn'
  AND NOT EXISTS (SELECT 1 FROM trips t WHERE t.company_id = c.id AND t.note LIKE '[SEED-09]%');

-- [SEED-10] Minh Tâm: Hội An -> Quảng Nam (+8h, PUBLISHED, chỉ còn đúng 2 ghế trống để demo Concurrency Overbooking!)
INSERT INTO trips (
    route_id, company_id, vehicle_id, driver_id, departure_time, fare, note,
    status, booked_seats, assignment_status, accepted_at
)
SELECT rt.id, c.id, v.id, d.id, NOW() + INTERVAL '8 hours', 50000.00,
       '[SEED-10] Xe ghép 7 chỗ Hội An - Tam Kỳ (Chỉ còn 2 ghế cuối)',
       'PUBLISHED', 5, 'ACCEPTED', NOW() - INTERVAL '2 hours'
FROM transport_companies c
JOIN routes   rt ON rt.company_id = c.id AND rt.name = 'Hội An - Quảng Nam Express'
JOIN vehicles v  ON v.company_id  = c.id AND v.plate_number = '92A-33218'
JOIN drivers  d  ON d.company_id  = c.id AND d.license_number = '430123456789'
WHERE c.contact_email = 'dieuhanh@minhtam.vn'
  AND NOT EXISTS (SELECT 1 FROM trips t WHERE t.company_id = c.id AND t.note LIKE '[SEED-10]%');

-- [SEED-11] Hải Vân Express: Đà Nẵng -> Huế (+6h, PUBLISHED, 1 seat booked)
INSERT INTO trips (
    route_id, company_id, vehicle_id, driver_id, departure_time, fare, note,
    status, booked_seats, assignment_status, accepted_at
)
SELECT rt.id, c.id, v.id, d.id, NOW() + INTERVAL '6 hours', 130000.00,
       '[SEED-11] Hải Vân Express 16 chỗ đi Huế qua Lăng Cô',
       'PUBLISHED', 1, 'ACCEPTED', NOW() - INTERVAL '2 hours'
FROM transport_companies c
JOIN routes   rt ON rt.company_id = c.id AND rt.name = 'Đà Nẵng - Huế Hải Vân'
JOIN vehicles v  ON v.company_id  = c.id AND v.plate_number = '43C-33122'
JOIN drivers  d  ON d.company_id  = c.id AND d.license_number = '920345678901'
WHERE c.contact_email = 'lienhe@haivan.vn'
  AND NOT EXISTS (SELECT 1 FROM trips t WHERE t.company_id = c.id AND t.note LIKE '[SEED-11]%');

-- [SEED-12] Hải Vân Express: Huế -> Đà Nẵng (-48h, COMPLETED, 2 seats booked — chưa đánh giá để Passenger 1 test Rating!)
INSERT INTO trips (
    route_id, company_id, vehicle_id, driver_id, departure_time, fare, note,
    status, booked_seats, assignment_status, accepted_at, started_at, completed_at
)
SELECT rt.id, c.id, v.id, d.id, NOW() - INTERVAL '48 hours', 130000.00,
       '[SEED-12] Chuyến hoàn thành Huế - Đà Nẵng (Chờ hành khách đánh giá)',
       'COMPLETED', 2, 'ACCEPTED',
       NOW() - INTERVAL '52 hours', NOW() - INTERVAL '48 hours', NOW() - INTERVAL '45 hours'
FROM transport_companies c
JOIN routes   rt ON rt.company_id = c.id AND rt.name = 'Huế - Đà Nẵng Hải Vân'
JOIN vehicles v  ON v.company_id  = c.id AND v.plate_number = '43C-41007'
JOIN drivers  d  ON d.company_id  = c.id AND d.license_number = '750456789012'
WHERE c.contact_email = 'lienhe@haivan.vn'
  AND NOT EXISTS (SELECT 1 FROM trips t WHERE t.company_id = c.id AND t.note LIKE '[SEED-12]%');

-- [SEED-13] Hương Giang: Huế -> Đà Nẵng (+5h30m, PUBLISHED, 0 seats booked)
INSERT INTO trips (
    route_id, company_id, vehicle_id, driver_id, departure_time, fare, note,
    status, booked_seats, assignment_status, accepted_at
)
SELECT rt.id, c.id, v.id, d.id, NOW() + INTERVAL '330 minutes', 140000.00,
       '[SEED-13] Limousine Cố Đô Huế đi Sân bay Đà Nẵng',
       'PUBLISHED', 0, 'ACCEPTED', NOW() - INTERVAL '1 hour'
FROM transport_companies c
JOIN routes   rt ON rt.company_id = c.id AND rt.name = 'Huế - Đà Nẵng Sân Bay'
JOIN vehicles v  ON v.company_id  = c.id AND v.plate_number = '75A-20814'
JOIN drivers  d  ON d.company_id  = c.id AND d.license_number = '430567890123'
WHERE c.contact_email = 'info@huonggiang.vn'
  AND NOT EXISTS (SELECT 1 FROM trips t WHERE t.company_id = c.id AND t.note LIKE '[SEED-13]%');

-- [SEED-14] Hoàng Long: Đà Nẵng -> Quảng Nam (-12h, CANCELLED)
INSERT INTO trips (
    route_id, company_id, vehicle_id, driver_id, departure_time, fare, note,
    status, booked_seats, assignment_status
)
SELECT rt.id, c.id, v.id, d.id, NOW() - INTERVAL '12 hours', 80000.00,
       '[SEED-14] Chuyến đã hủy do bảo dưỡng phương tiện đột xuất',
       'CANCELLED', 0, 'ASSIGNED'
FROM transport_companies c
JOIN routes   rt ON rt.company_id = c.id AND rt.name = 'Đà Nẵng - Quảng Nam'
JOIN vehicles v  ON v.company_id  = c.id AND v.plate_number = '43B-05678'
JOIN drivers  d  ON d.company_id  = c.id AND d.license_number = '43A-B2-88210'
WHERE c.contact_email = 'nhaxe@hoanglong.vn'
  AND NOT EXISTS (SELECT 1 FROM trips t WHERE t.company_id = c.id AND t.note LIKE '[SEED-14]%');

-- =============================================================================
-- 7. BOOKINGS (Matching booked_seats on all trips above)
-- =============================================================================

-- Bookings on [SEED-01] (Hoàng Long Đà Nẵng -> Huế, total 5 seats: 2 + 2 + 1)
INSERT INTO bookings (
    booking_code, trip_id, passenger_id, idempotency_key, seat_count,
    pickup_address, pickup_lat, pickup_lng, dropoff_address, dropoff_lat, dropoff_lng,
    estimated_fare, status, confirmed_at
)
SELECT
    'BK-SEED0001', t.id, p.id, 'seed-idem-bk-0001', 2,
    'Bến xe Trung tâm Đà Nẵng, 185 Tôn Đức Thắng', 16.0544000, 108.1742000,
    'BigC Huế, 174 Bà Triệu, TP. Huế',             16.4637000, 107.5909000,
    240000.00, 'CONFIRMED', NOW() - INTERVAL '2 hours'
FROM trips t
JOIN users p ON p.email = 'khach1@gmail.com'
WHERE t.note LIKE '[SEED-01]%'
ON CONFLICT DO NOTHING;

INSERT INTO bookings (
    booking_code, trip_id, passenger_id, idempotency_key, seat_count,
    pickup_address, pickup_lat, pickup_lng, dropoff_address, dropoff_lat, dropoff_lng,
    estimated_fare, status, confirmed_at
)
SELECT
    'BK-SEED0005', t.id, p.id, 'seed-idem-bk-0005', 2,
    '254 Nguyễn Văn Linh, Thanh Khê, Đà Nẵng',     16.0604000, 108.2124000,
    'Thị trấn Lăng Cô, Phú Lộc, Thừa Thiên Huế',  16.2358000, 108.0753000,
    240000.00, 'CONFIRMED', NOW() - INTERVAL '90 minutes'
FROM trips t
JOIN users p ON p.email = 'khach3@gmail.com'
WHERE t.note LIKE '[SEED-01]%'
ON CONFLICT DO NOTHING;

INSERT INTO bookings (
    booking_code, trip_id, passenger_id, idempotency_key, seat_count,
    pickup_address, pickup_lat, pickup_lng, dropoff_address, dropoff_lat, dropoff_lng,
    estimated_fare, status, confirmed_at
)
SELECT
    'BK-SEED0006', t.id, p.id, 'seed-idem-bk-0006', 1,
    'Cầu Rồng (Đầu đường Võ Văn Kiệt), Đà Nẵng',   16.0611000, 108.2271000,
    'Bến xe phía Nam Huế, 97 An Dương Vương',      16.4470000, 107.6030000,
    120000.00, 'CONFIRMED', NOW() - INTERVAL '60 minutes'
FROM trips t
JOIN users p ON p.email = 'khach4@gmail.com'
WHERE t.note LIKE '[SEED-01]%'
ON CONFLICT DO NOTHING;

-- Bookings on [SEED-02] (Hoàng Long Đà Nẵng -> Hội An, total 3 seats: 1 + 2)
INSERT INTO bookings (
    booking_code, trip_id, passenger_id, idempotency_key, seat_count,
    pickup_address, pickup_lat, pickup_lng, dropoff_address, dropoff_lat, dropoff_lng,
    estimated_fare, status, confirmed_at
)
SELECT
    'BK-SEED0002', t.id, p.id, 'seed-idem-bk-0002', 1,
    'Sân bay Quốc tế Đà Nẵng (Cổng ga đến)',       16.0539000, 108.2022000,
    'Chùa Cầu, Phố cổ Hội An',                     15.8771000, 108.3260000,
    60000.00, 'CONFIRMED', NOW() - INTERVAL '45 minutes'
FROM trips t
JOIN users p ON p.email = 'khach2@gmail.com'
WHERE t.note LIKE '[SEED-02]%'
ON CONFLICT DO NOTHING;

INSERT INTO bookings (
    booking_code, trip_id, passenger_id, idempotency_key, seat_count,
    pickup_address, pickup_lat, pickup_lng, dropoff_address, dropoff_lat, dropoff_lng,
    estimated_fare, status, confirmed_at
)
SELECT
    'BK-SEED0007', t.id, p.id, 'seed-idem-bk-0007', 2,
    'Biển Mỹ Khê, Võ Nguyên Giáp, Sơn Trà',        16.0600000, 108.2462000,
    'Bến xe Hội An, Hùng Vương',                   15.8842000, 108.3210000,
    120000.00, 'CONFIRMED', NOW() - INTERVAL '25 minutes'
FROM trips t
JOIN users p ON p.email = 'khach5@gmail.com'
WHERE t.note LIKE '[SEED-02]%'
ON CONFLICT DO NOTHING;

-- Booking on [SEED-03] (Hoàng Long Hội An -> Quảng Nam, 1 seat)
INSERT INTO bookings (
    booking_code, trip_id, passenger_id, idempotency_key, seat_count,
    pickup_address, pickup_lat, pickup_lng, dropoff_address, dropoff_lat, dropoff_lng,
    estimated_fare, status, confirmed_at
)
SELECT
    'BK-SEED0008', t.id, p.id, 'seed-idem-bk-0008', 1,
    'Ngã tư trung tâm Hội An',                     15.8801000, 108.3380000,
    'Bến xe Tam Kỳ, Phan Bội Châu, Quảng Nam',     15.5736000, 108.4740000,
    45000.00, 'CONFIRMED', NOW() - INTERVAL '3 hours'
FROM trips t
JOIN users p ON p.email = 'khach6@gmail.com'
WHERE t.note LIKE '[SEED-03]%'
ON CONFLICT DO NOTHING;

-- Booking on [SEED-04] (Hoàng Long Huế -> Đà Nẵng, 2 seats)
INSERT INTO bookings (
    booking_code, trip_id, passenger_id, idempotency_key, seat_count,
    pickup_address, pickup_lat, pickup_lng, dropoff_address, dropoff_lat, dropoff_lng,
    estimated_fare, status, confirmed_at
)
SELECT
    'BK-SEED0003', t.id, p.id, 'seed-idem-bk-0003', 2,
    'Ga Huế, 02 Bùi Thị Xuân, TP. Huế',            16.4577000, 107.5754000,
    'Cầu Rồng, Quận Sơn Trà, Đà Nẵng',             16.0611000, 108.2271000,
    240000.00, 'CONFIRMED', NOW() - INTERVAL '2 hours'
FROM trips t
JOIN users p ON p.email = 'khach1@gmail.com'
WHERE t.note LIKE '[SEED-04]%'
ON CONFLICT DO NOTHING;

-- Bookings on [SEED-06] (Hoàng Long Huế -> Đà Nẵng COMPLETED, 4 seats: 2 + 2)
INSERT INTO bookings (
    booking_code, trip_id, passenger_id, idempotency_key, seat_count,
    pickup_address, pickup_lat, pickup_lng, dropoff_address, dropoff_lat, dropoff_lng,
    estimated_fare, status, confirmed_at, picked_up_at, completed_at
)
SELECT
    'BK-SEED0004', t.id, p.id, 'seed-idem-bk-0004', 2,
    'Bến xe phía Nam Huế, 97 An Dương Vương',      16.4470000, 107.6030000,
    'Trung tâm Hành chính Đà Nẵng, 24 Trần Phú',   16.0777000, 108.2244000,
    240000.00, 'COMPLETED',
    NOW() - INTERVAL '30 hours', NOW() - INTERVAL '24 hours', NOW() - INTERVAL '21 hours'
FROM trips t
JOIN users p ON p.email = 'khach2@gmail.com'
WHERE t.note LIKE '[SEED-06]%'
ON CONFLICT DO NOTHING;

INSERT INTO bookings (
    booking_code, trip_id, passenger_id, idempotency_key, seat_count,
    pickup_address, pickup_lat, pickup_lng, dropoff_address, dropoff_lat, dropoff_lng,
    estimated_fare, status, confirmed_at, picked_up_at, completed_at
)
SELECT
    'BK-SEED0009', t.id, p.id, 'seed-idem-bk-0009', 2,
    'Khách sạn Imperial Huế, 08 Hùng Vương',       16.4648000, 107.5919000,
    'Sân bay Quốc tế Đà Nẵng',                     16.0539000, 108.2022000,
    240000.00, 'COMPLETED',
    NOW() - INTERVAL '29 hours', NOW() - INTERVAL '24 hours', NOW() - INTERVAL '21 hours'
FROM trips t
JOIN users p ON p.email = 'khach1@gmail.com'
WHERE t.note LIKE '[SEED-06]%'
ON CONFLICT DO NOTHING;

-- Bookings on [SEED-07] (Hoàng Long Đà Nẵng -> Huế IN_PROGRESS, 3 seats: 2 PICKED_UP + 1 PICKED_UP)
INSERT INTO bookings (
    booking_code, trip_id, passenger_id, idempotency_key, seat_count,
    pickup_address, pickup_lat, pickup_lng, dropoff_address, dropoff_lat, dropoff_lng,
    estimated_fare, status, confirmed_at, picked_up_at
)
SELECT
    'BK-SEED0010', t.id, p.id, 'seed-idem-bk-0010', 2,
    'Bến xe Trung tâm Đà Nẵng',                    16.0544000, 108.1742000,
    'Bến xe phía Nam Huế',                         16.4470000, 107.6030000,
    270000.00, 'PICKED_UP',
    NOW() - INTERVAL '4 hours', NOW() - INTERVAL '35 minutes'
FROM trips t
JOIN users p ON p.email = 'khach1@gmail.com'
WHERE t.note LIKE '[SEED-07]%'
ON CONFLICT DO NOTHING;

INSERT INTO bookings (
    booking_code, trip_id, passenger_id, idempotency_key, seat_count,
    pickup_address, pickup_lat, pickup_lng, dropoff_address, dropoff_lat, dropoff_lng,
    estimated_fare, status, confirmed_at, picked_up_at
)
SELECT
    'BK-SEED0011', t.id, p.id, 'seed-idem-bk-0011', 1,
    'Ngã ba Hòa Khánh, Liên Chiểu, Đà Nẵng',      16.0748000, 108.1516000,
    'Vịnh Lăng Cô, Phú Lộc, Huế',                  16.2358000, 108.0753000,
    135000.00, 'PICKED_UP',
    NOW() - INTERVAL '3 hours', NOW() - INTERVAL '25 minutes'
FROM trips t
JOIN users p ON p.email = 'khach3@gmail.com'
WHERE t.note LIKE '[SEED-07]%'
ON CONFLICT DO NOTHING;

-- Booking on [SEED-08] (Minh Tâm Đà Nẵng -> Huế Limousine, 2 seats)
INSERT INTO bookings (
    booking_code, trip_id, passenger_id, idempotency_key, seat_count,
    pickup_address, pickup_lat, pickup_lng, dropoff_address, dropoff_lat, dropoff_lng,
    estimated_fare, status, confirmed_at
)
SELECT
    'BK-SEED0012', t.id, p.id, 'seed-idem-bk-0012', 2,
    '201 Tôn Đức Thắng, Liên Chiểu, Đà Nẵng',      16.0570000, 108.1695000,
    '85 Bà Triệu, Phường Phú Hội, TP. Huế',        16.4632000, 107.5934000,
    300000.00, 'CONFIRMED', NOW() - INTERVAL '2 hours'
FROM trips t
JOIN users p ON p.email = 'khach5@gmail.com'
WHERE t.note LIKE '[SEED-08]%'
ON CONFLICT DO NOTHING;

-- Booking on [SEED-10] (Minh Tâm Hội An -> Quảng Nam, 5 seats booked on 7-seat car -> leaves 2 seats)
INSERT INTO bookings (
    booking_code, trip_id, passenger_id, idempotency_key, seat_count,
    pickup_address, pickup_lat, pickup_lng, dropoff_address, dropoff_lat, dropoff_lng,
    estimated_fare, status, confirmed_at
)
SELECT
    'BK-SEED0013', t.id, p.id, 'seed-idem-bk-0013', 5,
    'Bến xe Hội An, Quảng Nam',                    15.8842000, 108.3210000,
    '68 Hùng Vương, TP. Tam Kỳ, Quảng Nam',        15.5680000, 108.4810000,
    250000.00, 'CONFIRMED', NOW() - INTERVAL '90 minutes'
FROM trips t
JOIN users p ON p.email = 'khach7@gmail.com'
WHERE t.note LIKE '[SEED-10]%'
ON CONFLICT DO NOTHING;

-- Booking on [SEED-11] (Hải Vân Đà Nẵng -> Huế, 1 seat + 1 CANCELLED booking for history tab)
INSERT INTO bookings (
    booking_code, trip_id, passenger_id, idempotency_key, seat_count,
    pickup_address, pickup_lat, pickup_lng, dropoff_address, dropoff_lat, dropoff_lng,
    estimated_fare, status, confirmed_at
)
SELECT
    'BK-SEED0014', t.id, p.id, 'seed-idem-bk-0014', 1,
    '120 Điện Biên Phủ, Thanh Khê, Đà Nẵng',       16.0659000, 108.1912000,
    'Bến xe phía Nam Huế',                         16.4470000, 107.6030000,
    130000.00, 'CONFIRMED', NOW() - INTERVAL '80 minutes'
FROM trips t
JOIN users p ON p.email = 'khach4@gmail.com'
WHERE t.note LIKE '[SEED-11]%'
ON CONFLICT DO NOTHING;

INSERT INTO bookings (
    booking_code, trip_id, passenger_id, idempotency_key, seat_count,
    pickup_address, pickup_lat, pickup_lng, dropoff_address, dropoff_lat, dropoff_lng,
    estimated_fare, status, confirmed_at, cancelled_at, cancel_reason
)
SELECT
    'BK-SEED0015', t.id, p.id, 'seed-idem-bk-0015', 1,
    'Sân bay Quốc tế Đà Nẵng',                     16.0539000, 108.2022000,
    'Ga Huế, 02 Bùi Thị Xuân',                     16.4577000, 107.5754000,
    130000.00, 'CANCELLED',
    NOW() - INTERVAL '3 hours', NOW() - INTERVAL '1 hour', 'Hành khách thay đổi lịch trình công tác'
FROM trips t
JOIN users p ON p.email = 'khach1@gmail.com'
WHERE t.note LIKE '[SEED-11]%'
ON CONFLICT DO NOTHING;

-- Booking on [SEED-12] (Hải Vân Huế -> Đà Nẵng COMPLETED, unrated by khach1 so Rating Modal can be tested)
INSERT INTO bookings (
    booking_code, trip_id, passenger_id, idempotency_key, seat_count,
    pickup_address, pickup_lat, pickup_lng, dropoff_address, dropoff_lat, dropoff_lng,
    estimated_fare, status, confirmed_at, picked_up_at, completed_at
)
SELECT
    'BK-SEED0016', t.id, p.id, 'seed-idem-bk-0016', 2,
    '85 Bà Triệu, Phường Phú Hội, TP. Huế',        16.4632000, 107.5934000,
    'Bến xe Trung tâm Đà Nẵng',                    16.0544000, 108.1742000,
    260000.00, 'COMPLETED',
    NOW() - INTERVAL '52 hours', NOW() - INTERVAL '48 hours', NOW() - INTERVAL '45 hours'
FROM trips t
JOIN users p ON p.email = 'khach1@gmail.com'
WHERE t.note LIKE '[SEED-12]%'
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 8. ROUTE PROPOSALS & ROUTE PROPOSAL STOPS (Sprint 3 Optimizer Demo Data)
-- =============================================================================

-- 8.1 Accepted proposal on [SEED-01] (Hoàng Long Đà Nẵng -> Huế, 3 bookings = 6 stops)
INSERT INTO route_proposals (
    trip_id, status, solver_engine, solver_status,
    total_distance_km, baseline_distance_km, distance_saved_km,
    total_duration_minutes, max_seats_on_board, vehicle_capacity,
    created_by_user_id, reviewed_by_user_id, reviewed_at
)
SELECT
    t.id, 'ACCEPTED', 'OR-Tools VRPPD + Haversine Road Factor', 'OPTIMAL',
    98.40, 112.80, 14.40,
    172, 5, 9,
    owner.id, owner.id, NOW() - INTERVAL '45 minutes'
FROM trips t
JOIN users owner ON owner.email = 'nhaxe@hoanglong.vn'
WHERE t.note LIKE '[SEED-01]%'
  AND NOT EXISTS (
      SELECT 1 FROM route_proposals rp WHERE rp.trip_id = t.id AND rp.status = 'ACCEPTED'
  );

-- 8.2 Proposed (pending company review) proposal on [SEED-02] (Hoàng Long Đà Nẵng -> Hội An, 2 bookings = 4 stops)
INSERT INTO route_proposals (
    trip_id, status, solver_engine, solver_status,
    total_distance_km, baseline_distance_km, distance_saved_km,
    total_duration_minutes, max_seats_on_board, vehicle_capacity,
    created_by_user_id
)
SELECT
    t.id, 'PROPOSED', 'OR-Tools VRPPD + Haversine Road Factor', 'OPTIMAL',
    29.60, 35.20, 5.60,
    54, 3, 16,
    owner.id
FROM trips t
JOIN users owner ON owner.email = 'nhaxe@hoanglong.vn'
WHERE t.note LIKE '[SEED-02]%'
  AND NOT EXISTS (
      SELECT 1 FROM route_proposals rp WHERE rp.trip_id = t.id AND rp.status = 'PROPOSED'
  );

-- 8.3 Accepted proposal on [SEED-07] (IN_PROGRESS trip Đà Nẵng -> Huế)
INSERT INTO route_proposals (
    trip_id, status, solver_engine, solver_status,
    total_distance_km, baseline_distance_km, distance_saved_km,
    total_duration_minutes, max_seats_on_board, vehicle_capacity,
    created_by_user_id, reviewed_by_user_id, reviewed_at
)
SELECT
    t.id, 'ACCEPTED', 'OR-Tools VRPPD + Haversine Road Factor', 'OPTIMAL',
    94.10, 106.50, 12.40,
    165, 3, 7,
    owner.id, owner.id, NOW() - INTERVAL '2 hours'
FROM trips t
JOIN users owner ON owner.email = 'nhaxe@hoanglong.vn'
WHERE t.note LIKE '[SEED-07]%'
  AND NOT EXISTS (
      SELECT 1 FROM route_proposals rp WHERE rp.trip_id = t.id AND rp.status = 'ACCEPTED'
  );

-- Route Proposal Stops for [SEED-01] ACCEPTED proposal
INSERT INTO route_proposal_stops (
    proposal_id, booking_id, stop_type, stop_order, address,
    latitude, longitude, seat_delta, cumulative_seats_on_board,
    distance_from_prev_km, eta_offset_minutes, planned_arrival_at
)
SELECT
    rp.id, b.id, s.stop_type, s.stop_order, s.address,
    s.lat, s.lng, s.seat_delta, s.cum_seats,
    s.dist_km, s.eta_min, t.departure_time + (s.eta_min || ' minutes')::INTERVAL
FROM trips t
JOIN route_proposals rp ON rp.trip_id = t.id AND rp.status = 'ACCEPTED'
JOIN (
    VALUES
        ('BK-SEED0001', 'PICKUP',  1, 'Bến xe Trung tâm Đà Nẵng, 185 Tôn Đức Thắng', 16.0544000, 108.1742000,  2, 2,  0.00,   0),
        ('BK-SEED0005', 'PICKUP',  2, '254 Nguyễn Văn Linh, Thanh Khê, Đà Nẵng',     16.0604000, 108.2124000,  2, 4,  4.80,  12),
        ('BK-SEED0006', 'PICKUP',  3, 'Cầu Rồng (Đầu đường Võ Văn Kiệt), Đà Nẵng',   16.0611000, 108.2271000,  1, 5,  2.10,  18),
        ('BK-SEED0005', 'DROPOFF', 4, 'Thị trấn Lăng Cô, Phú Lộc, Thừa Thiên Huế',  16.2358000, 108.0753000, -2, 3, 32.50,  75),
        ('BK-SEED0006', 'DROPOFF', 5, 'Bến xe phía Nam Huế, 97 An Dương Vương',      16.4470000, 107.6030000, -1, 2, 56.20, 160),
        ('BK-SEED0001', 'DROPOFF', 6, 'BigC Huế, 174 Bà Triệu, TP. Huế',             16.4637000, 107.5909000, -2, 0,  2.80, 172)
) AS s(bk_code, stop_type, stop_order, address, lat, lng, seat_delta, cum_seats, dist_km, eta_min)
  ON TRUE
JOIN bookings b ON b.booking_code = s.bk_code AND b.trip_id = t.id
WHERE t.note LIKE '[SEED-01]%'
  AND NOT EXISTS (SELECT 1 FROM route_proposal_stops rps WHERE rps.proposal_id = rp.id);

-- Route Proposal Stops for [SEED-02] PROPOSED proposal
INSERT INTO route_proposal_stops (
    proposal_id, booking_id, stop_type, stop_order, address,
    latitude, longitude, seat_delta, cumulative_seats_on_board,
    distance_from_prev_km, eta_offset_minutes, planned_arrival_at
)
SELECT
    rp.id, b.id, s.stop_type, s.stop_order, s.address,
    s.lat, s.lng, s.seat_delta, s.cum_seats,
    s.dist_km, s.eta_min, t.departure_time + (s.eta_min || ' minutes')::INTERVAL
FROM trips t
JOIN route_proposals rp ON rp.trip_id = t.id AND rp.status = 'PROPOSED'
JOIN (
    VALUES
        ('BK-SEED0002', 'PICKUP',  1, 'Sân bay Quốc tế Đà Nẵng (Cổng ga đến)', 16.0539000, 108.2022000,  1, 1,  0.00,  0),
        ('BK-SEED0007', 'PICKUP',  2, 'Biển Mỹ Khê, Võ Nguyên Giáp, Sơn Trà',  16.0600000, 108.2462000,  2, 3,  5.40, 12),
        ('BK-SEED0007', 'DROPOFF', 3, 'Bến xe Hội An, Hùng Vương',             15.8842000, 108.3210000, -2, 1, 22.40, 48),
        ('BK-SEED0002', 'DROPOFF', 4, 'Chùa Cầu, Phố cổ Hội An',               15.8771000, 108.3260000, -1, 0,  1.80, 54)
) AS s(bk_code, stop_type, stop_order, address, lat, lng, seat_delta, cum_seats, dist_km, eta_min)
  ON TRUE
JOIN bookings b ON b.booking_code = s.bk_code AND b.trip_id = t.id
WHERE t.note LIKE '[SEED-02]%'
  AND NOT EXISTS (SELECT 1 FROM route_proposal_stops rps WHERE rps.proposal_id = rp.id);

-- =============================================================================
-- 9. TRIP STOPS (Active itinerary stops for [SEED-01], [SEED-07], [SEED-06])
-- =============================================================================

-- 9.1 Trip stops for [SEED-01] (Upcoming PUBLISHED trip, all stops PENDING)
INSERT INTO trip_stops (
    trip_id, booking_id, stop_type, stop_order, address,
    latitude, longitude, status, planned_arrival_at, proposal_id
)
SELECT
    t.id, rps.booking_id, rps.stop_type, rps.stop_order, rps.address,
    rps.latitude, rps.longitude, 'PENDING', rps.planned_arrival_at, rp.id
FROM trips t
JOIN route_proposals rp ON rp.trip_id = t.id AND rp.status = 'ACCEPTED'
JOIN route_proposal_stops rps ON rps.proposal_id = rp.id
WHERE t.note LIKE '[SEED-01]%'
ON CONFLICT (booking_id, stop_type) DO NOTHING;

-- 9.2 Trip stops for [SEED-07] (IN_PROGRESS trip: 2 pickups COMPLETED, next dropoff ARRIVED, final dropoff PENDING)
INSERT INTO trip_stops (
    trip_id, booking_id, stop_type, stop_order, address,
    latitude, longitude, status, arrived_at, completed_at, planned_arrival_at, proposal_id
)
SELECT
    t.id, b.id, s.stop_type, s.stop_order, s.address,
    s.lat, s.lng, s.status,
    CASE WHEN s.status IN ('ARRIVED', 'COMPLETED') THEN NOW() - (s.arr_ago || ' minutes')::INTERVAL ELSE NULL END,
    CASE WHEN s.status = 'COMPLETED'               THEN NOW() - (s.cmp_ago || ' minutes')::INTERVAL ELSE NULL END,
    t.departure_time + (s.eta_min || ' minutes')::INTERVAL,
    rp.id
FROM trips t
LEFT JOIN route_proposals rp ON rp.trip_id = t.id AND rp.status = 'ACCEPTED'
JOIN (
    VALUES
        ('BK-SEED0010', 'PICKUP',  1, 'Bến xe Trung tâm Đà Nẵng',               16.0544000, 108.1742000, 'COMPLETED', 38, 35,   0),
        ('BK-SEED0011', 'PICKUP',  2, 'Ngã ba Hòa Khánh, Liên Chiểu, Đà Nẵng', 16.0748000, 108.1516000, 'COMPLETED', 28, 25,  15),
        ('BK-SEED0011', 'DROPOFF', 3, 'Vịnh Lăng Cô, Phú Lộc, Huế',             16.2358000, 108.0753000, 'ARRIVED',    2,  0,  65),
        ('BK-SEED0010', 'DROPOFF', 4, 'Bến xe phía Nam Huế',                    16.4470000, 107.6030000, 'PENDING',    0,  0, 165)
) AS s(bk_code, stop_type, stop_order, address, lat, lng, status, arr_ago, cmp_ago, eta_min)
  ON TRUE
JOIN bookings b ON b.booking_code = s.bk_code AND b.trip_id = t.id
WHERE t.note LIKE '[SEED-07]%'
ON CONFLICT (booking_id, stop_type) DO NOTHING;

-- 9.3 Trip stops for [SEED-06] (COMPLETED trip: all stops COMPLETED)
INSERT INTO trip_stops (
    trip_id, booking_id, stop_type, stop_order, address,
    latitude, longitude, status, arrived_at, completed_at, planned_arrival_at
)
SELECT
    t.id, b.id, s.stop_type, s.stop_order, s.address,
    s.lat, s.lng, 'COMPLETED',
    t.departure_time + (s.eta_min || ' minutes')::INTERVAL,
    t.departure_time + ((s.eta_min + 3) || ' minutes')::INTERVAL,
    t.departure_time + (s.eta_min || ' minutes')::INTERVAL
FROM trips t
JOIN (
    VALUES
        ('BK-SEED0009', 'PICKUP',  1, 'Khách sạn Imperial Huế, 08 Hùng Vương',     16.4648000, 107.5919000,   0),
        ('BK-SEED0004', 'PICKUP',  2, 'Bến xe phía Nam Huế, 97 An Dương Vương',    16.4470000, 107.6030000,  15),
        ('BK-SEED0009', 'DROPOFF', 3, 'Sân bay Quốc tế Đà Nẵng',                   16.0539000, 108.2022000, 165),
        ('BK-SEED0004', 'DROPOFF', 4, 'Trung tâm Hành chính Đà Nẵng, 24 Trần Phú', 16.0777000, 108.2244000, 180)
) AS s(bk_code, stop_type, stop_order, address, lat, lng, eta_min)
  ON TRUE
JOIN bookings b ON b.booking_code = s.bk_code AND b.trip_id = t.id
WHERE t.note LIKE '[SEED-06]%'
ON CONFLICT (booking_id, stop_type) DO NOTHING;

-- =============================================================================
-- 10. TRIP INCIDENTS (Sprint 4 Operational Monitoring Demo Data)
-- =============================================================================

-- 10.1 OPEN incident on [SEED-07] (IN_PROGRESS trip)
INSERT INTO trip_incidents (
    trip_id, driver_id, reported_by_user_id, incident_type, description,
    latitude, longitude, status, created_at, updated_at
)
SELECT
    t.id, t.driver_id, u.id, 'HEAVY_TRAFFIC',
    'Ùn tắc giao thông cục bộ tại đường dẫn phía Bắc hầm Hải Vân, dự kiến trễ khoảng 10 phút so với ETA.',
    16.2081000, 108.1318000, 'OPEN',
    NOW() - INTERVAL '12 minutes', NOW() - INTERVAL '12 minutes'
FROM trips t
JOIN drivers d ON d.id = t.driver_id
JOIN users u   ON u.id = d.user_id
WHERE t.note LIKE '[SEED-07]%'
  AND NOT EXISTS (
      SELECT 1 FROM trip_incidents ti WHERE ti.trip_id = t.id AND ti.incident_type = 'HEAVY_TRAFFIC'
  );

-- 10.2 RESOLVED incident on [SEED-06] (COMPLETED trip)
INSERT INTO trip_incidents (
    trip_id, driver_id, reported_by_user_id, incident_type, description,
    latitude, longitude, status, resolution_note, resolved_by_user_id, resolved_at,
    created_at, updated_at
)
SELECT
    t.id, t.driver_id, u.id, 'PASSENGER_NO_SHOW',
    'Hành khách tại điểm đón Bến xe phía Nam Huế đến trễ 5 phút so với giờ hẹn.',
    16.4470000, 107.6030000, 'RESOLVED',
    'Đã liên hệ điện thoại và đón khách an toàn, chuyến về đích đúng giờ.',
    owner.id, NOW() - INTERVAL '23 hours',
    NOW() - INTERVAL '24 hours', NOW() - INTERVAL '23 hours'
FROM trips t
JOIN drivers d ON d.id = t.driver_id
JOIN users u   ON u.id = d.user_id
JOIN users owner ON owner.email = 'nhaxe@hoanglong.vn'
WHERE t.note LIKE '[SEED-06]%'
  AND NOT EXISTS (
      SELECT 1 FROM trip_incidents ti WHERE ti.trip_id = t.id AND ti.incident_type = 'PASSENGER_NO_SHOW'
  );

-- =============================================================================
-- 11. RATINGS (Sprint 4 Passenger Reviews on Completed Bookings)
-- =============================================================================
INSERT INTO ratings (
    booking_id, trip_id, company_id, driver_id, passenger_id,
    score, trip_score, driver_score, company_score, comment, created_at
)
SELECT
    b.id, t.id, t.company_id, t.driver_id, b.passenger_id,
    5, 5, 5, 5,
    'Xe Limousine sạch sẽ, tài xế Lê Minh Tuấn lái xe êm và đón đúng giờ tại Huế.',
    NOW() - INTERVAL '20 hours'
FROM bookings b
JOIN trips t ON t.id = b.trip_id
WHERE b.booking_code = 'BK-SEED0004'
ON CONFLICT (booking_id) DO NOTHING;

INSERT INTO ratings (
    booking_id, trip_id, company_id, driver_id, passenger_id,
    score, trip_score, driver_score, company_score, comment, created_at
)
SELECT
    b.id, t.id, t.company_id, t.driver_id, b.passenger_id,
    5, 5, 5, 4,
    'Đón tận sảnh khách sạn rất tiện, giá vé hợp lý, sẽ tiếp tục ủng hộ nhà xe.',
    NOW() - INTERVAL '18 hours'
FROM bookings b
JOIN trips t ON t.id = b.trip_id
WHERE b.booking_code = 'BK-SEED0009'
ON CONFLICT (booking_id) DO NOTHING;

COMMIT;
