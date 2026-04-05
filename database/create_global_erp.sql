-- ========================================================
-- SQL Скрипт инициализации БД для Хакатона "Global ERP"
-- Данный файл предназначен для папки /docker-entrypoint-initdb.d/
-- ========================================================

-- 1. Таблица "Компания" (п. 2.2.6)
CREATE TABLE companies (
                           company_id SERIAL PRIMARY KEY,
                           company_code VARCHAR(4) NOT NULL,
                           company_name VARCHAR(255) NOT NULL
);

-- 2. Таблица "Участник обучения" (п. 2.2.1)
CREATE TABLE employees (
                           employee_id SERIAL PRIMARY KEY,
                           full_name VARCHAR(255) NOT NULL,
                           company_id INT REFERENCES companies(company_id) ON DELETE SET NULL,
                           email VARCHAR(255)
);

-- 3. Таблица "Курс обучения" (п. 2.2.2)
CREATE TABLE courses (
                         course_id SERIAL PRIMARY KEY,
                         course_name VARCHAR(255) NOT NULL,
                         description TEXT,
                         duration_days INT NOT NULL,
                         price_per_person NUMERIC(12, 2) NOT NULL
);

CREATE TABLE course_price_history (
                                      id SERIAL PRIMARY KEY,
                                      course_id INT REFERENCES courses(course_id) ON DELETE CASCADE,
                                      price NUMERIC(12,2) NOT NULL,
                                      valid_from DATE NOT NULL,
                                      valid_to DATE
);

-- 4. Таблица "Спецификация" (п. 2.2.5)
CREATE TABLE specifications (
                                document_id SERIAL PRIMARY KEY,
                                doc_date DATE NOT NULL DEFAULT CURRENT_DATE,
                                doc_number VARCHAR(50) NOT NULL UNIQUE,
                                company_id INT REFERENCES companies(company_id) ON DELETE RESTRICT
);

-- 5. Таблица "Учебная группа" (п. 2.2.3)
CREATE TABLE study_groups (
                              group_id SERIAL PRIMARY KEY,
                              course_id INT REFERENCES courses(course_id) ON DELETE RESTRICT,
                              start_date DATE NOT NULL,
                              end_date DATE NOT NULL,
                              actual_price_per_person NUMERIC(12, 2) NOT NULL, -- Фиксация цены на момент создания
                              status VARCHAR(50) DEFAULT 'Планируется',
                              specification_id INT REFERENCES specifications(document_id) ON DELETE SET NULL
);

-- 6. Таблица "Участник группы" (п. 2.2.4)
CREATE TABLE group_participants (
                                    participant_id SERIAL PRIMARY KEY,
                                    group_id INT REFERENCES study_groups(group_id) ON DELETE CASCADE,
                                    employee_id INT REFERENCES employees(employee_id) ON DELETE CASCADE,
                                    completion_percentage NUMERIC(5, 2) DEFAULT 0.00 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
                                    UNIQUE(group_id, employee_id)
);

---- ========================================================
---- ПРЕДСТАВЛЕНИЯ (VIEWS) ДЛЯ АВТОМАТИЧЕСКИХ ВЫЧИСЛЕНИЙ
---- ========================================================
--
---- Расчет агрегатов по группам (кол-во человек, стоимость, средний прогресс)
--CREATE OR REPLACE VIEW v_study_groups_summary AS
--SELECT
--    sg.group_id,
--    c.course_name,
--    sg.start_date,
--    sg.end_date,
--    sg.status,
--    sg.actual_price_per_person,
--    COUNT(gp.participant_id) AS participants_count,
--    (COUNT(gp.participant_id) * sg.actual_price_per_person) AS total_group_cost,
--    COALESCE(AVG(gp.completion_percentage), 0) AS average_progress,
--    sg.specification_id
--FROM
--    study_groups sg
--        JOIN
--    courses c ON sg.course_id = c.course_id
--        LEFT JOIN
--    group_participants gp ON sg.group_id = gp.group_id
--GROUP BY
--    sg.group_id, c.course_name, sg.start_date, sg.end_date, sg.status, sg.actual_price_per_person;
--

CREATE OR REPLACE VIEW v_employees_full AS
SELECT
    e.employee_id AS id,
    e.full_name,
    e.company_id,
    c.company_name,
    e.email
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
    sg.specification_id,
    sg.actual_price_per_person,
    COUNT(gp.participant_id) AS participant_count,
    COALESCE(JSON_AGG(
                     JSON_BUILD_OBJECT(
                             'id', gp.participant_id,
                             'employee_id', gp.employee_id,
                             'progress', gp.completion_percentage
                     )
             ) FILTER (WHERE gp.participant_id IS NOT NULL), '[]') AS participants
FROM study_groups sg
         JOIN courses c ON sg.course_id = c.course_id
         LEFT JOIN group_participants gp ON sg.group_id = gp.group_id
GROUP BY sg.group_id, sg.course_id, c.course_name, sg.start_date, sg.end_date, sg.status, sg.specification_id, sg.actual_price_per_person;

--
---- Расчет итогов Спецификации (Сумма без НДС, НДС 22%, Итого)
--CREATE OR REPLACE VIEW v_specifications_summary AS
--SELECT
--    s.document_id,
--    s.doc_number,
--    s.doc_date,
--    comp.company_name,
--    COALESCE(SUM(vsg.total_group_cost), 0) AS total_without_vat,
--    COALESCE(SUM(vsg.total_group_cost), 0) * 0.22 AS vat_amount,
--    COALESCE(SUM(vsg.total_group_cost), 0) * 1.22 AS total_with_vat
--FROM
--    specifications s
--        JOIN
--    companies comp ON s.company_id = comp.company_id
--        LEFT JOIN
--    v_study_groups_summary vsg ON s.document_id = vsg.specification_id
--GROUP BY
--    s.document_id, s.doc_number, s.doc_date, comp.company_name;