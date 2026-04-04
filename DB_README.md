# База данных Global ERP

Этот компонент содержит SQL-схему и скрипт инициализации для базы данных учебного портала Global ERP.  
Проект разработан в рамках хакатона «Визуализация обучения в Global ERP: от данных к решениям».

---

## 📌 Структура базы данных

База данных реализована в **PostgreSQL 15** и включает следующие основные таблицы.

### 1. `companies` — Компании
| Колонка        | Тип                | Описание                    |
|----------------|--------------------|-----------------------------|
| company_id     | SERIAL (PK)        | Уникальный ID компании      |
| company_code   | VARCHAR(4) NOT NULL| Код компании (2–4 символа)  |
| company_name   | VARCHAR(255) NOT NULL| Полное название компании  |

### 2. `employees` — Участники обучения
| Колонка        | Тип                | Описание                    |
|----------------|--------------------|-----------------------------|
| employee_id    | SERIAL (PK)        | ID сотрудника               |
| full_name      | VARCHAR(255) NOT NULL| ФИО                       |
| company_id     | INT (FK → companies)| Компания сотрудника        |
| email          | VARCHAR(255)       | Электронная почта           |

### 3. `courses` — Курсы обучения
| Колонка         | Тип                     | Описание                     |
|----------------|-------------------------|------------------------------|
| course_id      | SERIAL (PK)             | ID курса                     |
| course_name    | VARCHAR(255) NOT NULL   | Название курса               |
| description    | TEXT                    | Описание                     |
| duration_days  | INT NOT NULL            | Длительность в днях          |
| price_per_person| NUMERIC(12,2) NOT NULL | Цена за человека (руб)       |

### 4. `specifications` — Спецификации (документы на оплату)
| Колонка        | Тип                     | Описание                     |
|----------------|-------------------------|------------------------------|
| document_id    | SERIAL (PK)             | ID документа                 |
| doc_date       | DATE DEFAULT CURRENT_DATE| Дата спецификации           |
| doc_number     | VARCHAR(50) NOT NULL UNIQUE| Номер документа          |
| company_id     | INT (FK → companies)    | Компания-плательщик          |

### 5. `study_groups` — Учебные группы
| Колонка                 | Тип                         | Описание                             |
|-------------------------|-----------------------------|--------------------------------------|
| group_id                | SERIAL (PK)                 | ID группы                            |
| course_id               | INT (FK → courses)          | Курс обучения                        |
| start_date              | DATE NOT NULL               | Дата начала                          |
| end_date                | DATE NOT NULL               | Дата окончания                       |
| actual_price_per_person | NUMERIC(12,2) NOT NULL      | Фиксированная цена на момент создания|
| status                  | VARCHAR(50) DEFAULT 'Планируется'| Статус группы                     |
| specification_id        | INT (FK → specifications)   | Привязка к спецификации              |

### 6. `group_participants` — Участники группы (связь сотрудника с группой)
| Колонка             | Тип                          | Описание                          |
|---------------------|------------------------------|-----------------------------------|
| participant_id      | SERIAL (PK)                  | ID записи                         |
| group_id            | INT (FK → study_groups)      | Группа обучения                   |
| employee_id         | INT (FK → employees)         | Сотрудник                         |
| completion_percentage| NUMERIC(5,2) DEFAULT 0.00   | Прогресс (0–100%)                 |
| UNIQUE(group_id, employee_id) |                         | Один сотрудник — одна группа      |

---

## 📊 Представления (VIEWS)

### `v_study_groups_summary`
Агрегирует данные по каждой учебной группе:
- количество участников;
- общая стоимость группы (`участники × actual_price_per_person`);
- средний прогресс обучения.

### `v_specifications_summary`
Рассчитывает итоги спецификации:
- сумма без НДС;
- сумма НДС (22%);
- итого с НДС.

---

## 🐳 Развёртывание через Docker

### Предварительные требования
- Установленный **Docker** и **Docker Compose**
- Свободный порт `5432` (можно изменить в `docker-compose.yaml`)

### Запуск базы данных

1. Клонируйте репозиторий (или поместите файлы в одну папку):
                            ваш_проект/
                            ├── docker-compose.yaml
                            ├── create_global_erp.sql
                            └── README.md
2. Из папки с файлами выполните:
        ```
        bash
        docker-compose up -d
        ```

3. Проверьте, что контейнер запущен: 
                    ```
                    docker ps
                    ```
                    
Параметры подключения
Параметр	Значение
Хост	 localhost
Порт	5432
Имя БД	global_erp_db
Пользователь	postgres
Пароль	postgres

Пример подключения через psql:
                ```
                docker exec -it erp_db_container psql -U postgres -d global_erp_db
                ```
                
Остановка и удаление:
                ```
                docker-compose down          # остановка контейнера
                docker-compose down -v       # остановка + удаление тома с данными
                ```
