
-- ========================================================
-- 1. Таблица компаний
-- ========================================================
CREATE TABLE companies (
    company_id SERIAL PRIMARY KEY,
    company_code VARCHAR(4) NOT NULL UNIQUE,
    company_name VARCHAR(255) NOT NULL
);

-- ========================================================
-- 2. Таблица участников обучения (employees)
-- ========================================================
CREATE TABLE employees (
    employee_id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    company_id INT REFERENCES companies(company_id) ON DELETE SET NULL,
    email VARCHAR(255),
    code VARCHAR(10),
    external_id VARCHAR(50)
);

-- ========================================================
-- 3. Таблица курсов
-- ========================================================
CREATE TABLE courses (
    course_id SERIAL PRIMARY KEY,
    course_name VARCHAR(255) NOT NULL,
    description TEXT,
    duration_days INT NOT NULL CHECK (duration_days > 0),
    price_per_person NUMERIC(12, 2) NOT NULL CHECK (price_per_person > 0)
);

-- ========================================================
-- 4. История изменения цен курсов
-- ========================================================
CREATE TABLE course_price_history (
    id SERIAL PRIMARY KEY,
    course_id INT REFERENCES courses(course_id) ON DELETE CASCADE,
    price NUMERIC(12,2) NOT NULL,
    valid_from DATE NOT NULL,
    valid_to DATE
);

-- ========================================================
-- 5. Спецификации
-- ========================================================
CREATE TABLE specifications (
    document_id SERIAL PRIMARY KEY,
    doc_date DATE NOT NULL DEFAULT CURRENT_DATE,
    doc_number VARCHAR(50) NOT NULL UNIQUE,
    company_id INT REFERENCES companies(company_id) ON DELETE RESTRICT
);

-- ========================================================
-- 6. Учебные группы
-- ========================================================
CREATE TABLE study_groups (
    group_id SERIAL PRIMARY KEY,
    course_id INT REFERENCES courses(course_id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL CHECK (end_date > start_date),
    actual_price_per_person NUMERIC(12, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Планируется',
    specification_id INT REFERENCES specifications(document_id) ON DELETE SET NULL
);

-- ========================================================
-- 7. Участники групп
-- ========================================================
CREATE TABLE group_participants (
    participant_id SERIAL PRIMARY KEY,
    group_id INT REFERENCES study_groups(group_id) ON DELETE CASCADE,
    employee_id INT REFERENCES employees(employee_id) ON DELETE CASCADE,
    completion_percentage NUMERIC(5, 2) DEFAULT 0.00
        CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    UNIQUE(group_id, employee_id)
);

-- ========================================================
-- ЗАПОЛНЕНИЕ ТЕСТОВЫМИ ДАННЫМИ
-- ========================================================

-- 1. Компании
INSERT INTO companies (company_code, company_name) VALUES
('0001', 'ООО "Ромашка"'),
('0002', 'АО "Тюльпан"'),
('0003', 'ИП Иванов И.И.'),
('0004', 'ООО "Василёк"'),
('0005', 'АО "Глобус"')
ON CONFLICT DO NOTHING;

-- 2. Участники обучения (employees)
INSERT INTO employees (full_name, company_id, email, code, external_id) VALUES
('Иванов Иван Иванович', 1, 'ivanov.ii@romashka.ru', '0048', '1203'),
('Петров Сергей Александрович', 1, 'petrov.sa@romashka.ru', '0051', '1204'),
('Сидорова Анна Петровна', 2, 'sidorova.ap@tulpan.ru', '0072', '1301'),
('Козлов Дмитрий Сергеевич', 1, NULL, '0089', '1205'),
('Морозова Екатерина Викторовна', 3, 'morozova.ev@ipivanov.ru', '0105', '1402'),
('Васильев Олег Николаевич', 4, 'vasilev.on@vasilek.ru', '0112', '1501'),
('Фёдорова Ольга Андреевна', 2, 'fedorova.oa@tulpan.ru', '0123', '1302')
ON CONFLICT DO NOTHING;

-- 3. Курсы обучения
INSERT INTO courses (course_name, description, duration_days, price_per_person) VALUES
('Основы делового общения', 'Развитие навыков эффективной коммуникации в бизнес-среде', 2, 8500.00),
('Управление проектами', 'Методики планирования и контроля проектов (PMBOK)', 5, 24500.00),
('1С: Предприятие для пользователей', 'Работа с конфигурациями 1С: Бухгалтерия и ЗУП', 3, 12000.00),
('Охрана труда и техника безопасности', 'Обязательное обучение по охране труда', 1, 4500.00),
('Продажи и работа с возражениями', 'Техники активных продаж и работы с клиентами', 3, 15800.00),
('Excel для аналитики и отчётности', 'Продвинутый уровень: формулы, сводные таблицы, Power Query', 2, 9800.00)
ON CONFLICT DO NOTHING;

-- 4. История цен (пример для первых двух курсов)
INSERT INTO course_price_history (course_id, price, valid_from, valid_to) VALUES
(1, 8500.00, '2025-01-01', NULL),
(2, 24500.00, '2025-01-01', NULL),
(5, 15800.00, '2025-01-01', NULL);

-- 5. Спецификации (документы-основания)
INSERT INTO specifications (doc_date, doc_number, company_id) VALUES
('2026-03-01', 'SPEC-2026/001', 1),
('2026-03-15', 'SPEC-2026/002', 2),
('2026-04-01', 'SPEC-2026/003', 1);

-- 6. Учебные группы
INSERT INTO study_groups (course_id, start_date, end_date, actual_price_per_person, status, specification_id) VALUES
(1, '2026-04-10', '2026-04-11', 8500.00, 'Планируется', 1),
(2, '2026-05-05', '2026-05-09', 24500.00, 'Планируется', 1),
(5, '2026-04-20', '2026-04-22', 15800.00, 'В процессе', 3),
(6, '2026-06-01', '2026-06-02', 9800.00, 'Планируется', 2);

-- 7. Участники групп (привязка сотрудников к группам)
INSERT INTO group_participants (group_id, employee_id, completion_percentage) VALUES
(1, 1, 0.00),   -- Иванов в группу "Деловое общение"
(1, 2, 0.00),   -- Петров в группу "Деловое общение"
(2, 3, 0.00),   -- Сидорова в "Управление проектами"
(3, 1, 45.00),  -- Иванов в "Продажи" (уже началась)
(3, 4, 30.00),  -- Козлов в "Продажи"
(4, 6, 0.00);   -- Васильев в Excel

-- ========================================================
-- ПРЕДСТАВЛЕНИЯ (Views)
-- ========================================================


CREATE OR REPLACE VIEW v_employees_full AS
SELECT
    e.employee_id AS id,
    e.full_name,
    e.company_id,
    c.company_name,
    e.email,
    e.code,
    e.external_id
FROM employees e
LEFT JOIN companies c ON e.company_id = c.company_id;

CREATE OR REPLACE VIEW v_study_groups_full AS
SELECT
    sg.group_id AS id,
    sg.course_id,
    c.course_name,
    sg.start_date,
    sg.end_date,
    sg.status,
    sg.actual_price_per_person,
    sg.specification_id,

    -- Атрибут 6: Количество участников обучения
    COUNT(gp.participant_id) AS participant_count,

    -- Атрибут 7: Стоимость за группу, руб
    -- Комментарий к расчету:
    -- Общая стоимость формируется умножением цены за одного сотрудника
    -- на фактическое количество записей в таблице участников.
    -- COALESCE используется для обработки случая, если цена не указана (считаем как 0).
    (COALESCE(sg.actual_price_per_person, 0) * COUNT(gp.participant_id)) AS total_group_cost,

    -- Атрибут 9: Средний прогресс по группе, в %
    -- Комментарий к расчету:
    -- Вычисляется как среднее арифметическое (AVG) поля completion_percentage
    -- из таблицы участников. Если участников нет, прогресс считается равным 0.
    COALESCE(AVG(gp.completion_percentage), 0) AS average_progress,

    -- Детализация участников (JSON)
    COALESCE(
        JSON_AGG(
            JSON_BUILD_OBJECT(
                'participant_id', gp.participant_id,
                'employee_id', gp.employee_id,
                'full_name', e.full_name,
                'progress', gp.completion_percentage
            )
        ) FILTER (WHERE gp.participant_id IS NOT NULL),
    '[]') AS participants
FROM study_groups sg
JOIN courses c ON sg.course_id = c.course_id
LEFT JOIN group_participants gp ON sg.group_id = gp.group_id
LEFT JOIN employees e ON gp.employee_id = e.employee_id
GROUP BY sg.group_id, c.course_name, sg.start_date, sg.end_date,
         sg.status, sg.actual_price_per_person, sg.specification_id;