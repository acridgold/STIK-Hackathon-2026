"""
xml_parser.py

Парсер XML файлов из системы Global ERP.

Поддерживаемые форматы:

1. Курс (Edu_Course):
   <?xml version="1.0" encoding="UTF-8"?>
   <Edu_Course>
       <id>4217</id>
       <sCode>0001</sCode>
       <sCourseHL>Базовый курс бизнес-аналитика</sCourseHL>
       <sDescription>Курс для бизнес-аналитиков...</sDescription>
       <nDurationInDays>3</nDurationInDays>
       <nPricePerPerson>10000</nPricePerPerson>
   </Edu_Course>

2. Сотрудник (Edu_Participant):
   <?xml version="1.0" encoding="UTF-8"?>
   <Edu_Participant>
       <id>1203</id>
       <sCode>0048</sCode>
       <sFIO>Иванов Иван Иванович</sFIO>
       <idOrganization>162362</idOrganization>
       <idOrganizationHL>ООО "Ромашка"</idOrganizationHL>
   </Edu_Participant>

Также поддерживаются файлы с несколькими записями внутри корневого тега:
   <Edu_Courses>
       <Edu_Course>...</Edu_Course>
       <Edu_Course>...</Edu_Course>
   </Edu_Courses>
"""
from __future__ import annotations

from typing import Dict, Any, List, Tuple
from repositories.base import (
    CourseRepositoryInterface,
    EmployeeRepositoryInterface,
    GroupRepositoryInterface,
)


# ─── Исключения для понятных сообщений об ошибках ──────────────────────────

class XMLValidationError(Exception):
    """Ошибка валидации XML — возвращается пользователю как 400."""
    pass


# ─── Вспомогательные функции ────────────────────────────────────────────────

def _get_text(node: Dict, key: str) -> str | None:
    """Безопасно достаёт текст из тега, возвращает None если тег отсутствует."""
    val = node.get(key)
    if val is None:
        return None
    return str(val).strip() or None


def _require(node: Dict, key: str, label: str) -> str:
    """Достаёт обязательное поле. Бросает XMLValidationError если пусто."""
    val = _get_text(node, key)
    if not val:
        raise XMLValidationError(f"Обязательное поле <{key}> ({label}) отсутствует или пустое")
    return val


def _require_int(node: Dict, key: str, label: str, min_val: int = 1) -> int:
    """Достаёт обязательное целое число с проверкой минимального значения."""
    raw = _require(node, key, label)
    try:
        val = int(raw)
    except ValueError:
        raise XMLValidationError(f"Поле <{key}> ({label}) должно быть целым числом, получено: '{raw}'")
    if val < min_val:
        raise XMLValidationError(f"Поле <{key}> ({label}) должно быть >= {min_val}, получено: {val}")
    return val


def _require_float(node: Dict, key: str, label: str, min_val: float = 0.01) -> float:
    """Достаёт обязательное число с плавающей точкой."""
    raw = _require(node, key, label)
    try:
        val = float(raw)
    except ValueError:
        raise XMLValidationError(f"Поле <{key}> ({label}) должно быть числом, получено: '{raw}'")
    if val < min_val:
        raise XMLValidationError(f"Поле <{key}> ({label}) должно быть > 0, получено: {val}")
    return val


def _normalize_to_list(data: Any) -> List[Dict]:
    """
    xmltodict возвращает dict если запись одна, list если несколько.
    Приводим всегда к списку.
    """
    if isinstance(data, dict):
        return [data]
    if isinstance(data, list):
        return data
    return []


# ─── Определение типа XML файла ─────────────────────────────────────────────

def detect_xml_type(parsed: Dict) -> str:
    """
    Определяет тип XML по корневому тегу.
    Возвращает: 'courses' | 'employees' | 'groups' | 'unknown'
    """
    root_key = next(iter(parsed), None)
    if root_key is None:
        return 'unknown'

    key_lower = root_key.lower()

    if 'edu_course' in key_lower:
        return 'courses'
    if 'edu_participant' in key_lower or 'employee' in key_lower:
        return 'employees'
    if 'traininggroup' in key_lower or 'group' in key_lower:
        return 'groups'

    return 'unknown'


# ─── Основной класс парсера ──────────────────────────────────────────────────

class XMLParser:
    """
    Парсер XML из системы Global ERP.
    Все методы статические — экземпляр не нужен.
    """

    # ── Курсы ────────────────────────────────────────────────────────────────

    @staticmethod
    def _validate_course(node: Dict, index: int) -> Dict:
        """
        Валидирует одну запись курса из XML.
        Бросает XMLValidationError если данные некорректны.

        Маппинг полей Global ERP → БД:
          sCourseHL       → course_name      (обязательное)
          nDurationInDays → duration_days    (обязательное, >= 1)
          nPricePerPerson → price_per_person (обязательное, > 0)
          sDescription    → description      (необязательное)
          id              → external_id      (необязательное, для дедупликации)
        """
        prefix = f"Курс #{index + 1}"

        course_name = _require(node, 'sCourseHL', f"{prefix}: название курса")
        if len(course_name) > 255:
            raise XMLValidationError(f"{prefix}: название курса не должно превышать 255 символов")

        duration_days = _require_int(node, 'nDurationInDays', f"{prefix}: длительность в днях", min_val=1)
        price = _require_float(node, 'nPricePerPerson', f"{prefix}: цена за человека", min_val=0.01)

        return {
            "course_name":     course_name,
            "description":     _get_text(node, 'sDescription'),
            "duration_days":   duration_days,
            "price_per_person": price,
        }

    @staticmethod
    def save_courses_from_xml(parsed: Dict[str, Any], repo: CourseRepositoryInterface) -> Tuple[int, List[str]]:
        """
        Сохраняет курсы из распарсенного XML в БД.

        Поддерживает форматы:
          - <Edu_Course>...</Edu_Course>           — одна запись
          - <Edu_Courses><Edu_Course>...</Edu_Course></Edu_Courses> — несколько

        Возвращает: (количество сохранённых, список предупреждений)
        Бросает: XMLValidationError при некорректных данных
        """
        root_key = next(iter(parsed), None)
        if root_key is None:
            raise XMLValidationError("XML файл пустой или не содержит данных")

        root = parsed[root_key]

        # Один курс: корневой тег = <Edu_Course>
        if root_key == 'Edu_Course':
            nodes = [root]
        # Несколько курсов: корневой тег = <Edu_Courses> с вложенными <Edu_Course>
        elif 'Edu_Course' in root:
            nodes = _normalize_to_list(root['Edu_Course'])
        # Старый формат: <root><course>...</course></root>
        elif 'course' in root:
            nodes = _normalize_to_list(root['course'])
        else:
            raise XMLValidationError(
                f"Неизвестная структура XML для курсов. "
                f"Ожидается корневой тег <Edu_Course> или <Edu_Courses>. "
                f"Получен: <{root_key}>"
            )

        if not nodes:
            raise XMLValidationError("XML не содержит ни одной записи курса")

        warnings = []
        count = 0

        for i, node in enumerate(nodes):
            course_data = XMLParser._validate_course(node, i)
            repo.create(course_data)
            count += 1

        return count, warnings

    # ── Сотрудники ───────────────────────────────────────────────────────────

    @staticmethod
    def _validate_employee(node: Dict, index: int) -> Dict:
        """
        Валидирует одну запись сотрудника из XML.

        Маппинг полей Global ERP → БД:
          sFIO            → full_name   (обязательное)
          idOrganization  → company_id  (обязательное)
          email           → email       (необязательное)
        """
        prefix = f"Сотрудник #{index + 1}"

        full_name = _require(node, 'sFIO', f"{prefix}: ФИО")
        if len(full_name) > 255:
            raise XMLValidationError(f"{prefix}: ФИО не должно превышать 255 символов")

        company_id_raw = _require(node, 'idOrganization', f"{prefix}: ID организации")
        try:
            company_id = int(company_id_raw)
        except ValueError:
            raise XMLValidationError(
                f"{prefix}: idOrganization должен быть числом, получено: '{company_id_raw}'"
            )

        email = _get_text(node, 'email')
        if email and '@' not in email:
            raise XMLValidationError(f"{prefix}: некорректный email '{email}'")

        return {
            "full_name":  full_name,
            "company_id": company_id,
            "email":      email,
        }

    @staticmethod
    def save_employees_from_xml(parsed: Dict[str, Any], repo: EmployeeRepositoryInterface) -> Tuple[int, List[str]]:
        """
        Сохраняет сотрудников из распарсенного XML в БД.

        Поддерживает форматы:
          - <Edu_Participant>...</Edu_Participant>  — одна запись
          - <Edu_Participants><Edu_Participant>...</Edu_Participant></Edu_Participants>

        Возвращает: (количество сохранённых, список предупреждений)
        """
        root_key = next(iter(parsed), None)
        if root_key is None:
            raise XMLValidationError("XML файл пустой")

        root = parsed[root_key]

        if root_key == 'Edu_Participant':
            nodes = [root]
        elif 'Edu_Participant' in root:
            nodes = _normalize_to_list(root['Edu_Participant'])
        # Старый формат
        elif 'employee' in root:
            nodes = _normalize_to_list(root['employee'])
        else:
            raise XMLValidationError(
                f"Неизвестная структура XML для сотрудников. "
                f"Ожидается корневой тег <Edu_Participant> или <Edu_Participants>. "
                f"Получен: <{root_key}>"
            )

        if not nodes:
            raise XMLValidationError("XML не содержит ни одной записи сотрудника")

        warnings = []
        count = 0

        for i, node in enumerate(nodes):
            employee_data = XMLParser._validate_employee(node, i)
            repo.create(employee_data)
            count += 1

        return count, warnings

    # ── Группы ───────────────────────────────────────────────────────────────

    @staticmethod
    def _validate_group(node: Dict, index: int) -> Dict:
        """
        Валидирует одну запись группы из XML.

        Маппинг полей:
          course_id  / CourseID  → course_id  (обязательное)
          start_date / StartDate → start_date (обязательное, формат YYYY-MM-DD)
          end_date   / EndDate   → end_date   (обязательное, формат YYYY-MM-DD)
          status     / Status    → status     (необязательное, default: planned)
        """
        import re
        prefix = f"Группа #{index + 1}"
        date_pattern = re.compile(r'^\d{4}-\d{2}-\d{2}$')

        # Поддерживаем оба варианта именования
        course_id_raw = _get_text(node, 'course_id') or _get_text(node, 'CourseID')
        if not course_id_raw:
            raise XMLValidationError(f"{prefix}: обязательное поле course_id / CourseID отсутствует")
        try:
            course_id = int(course_id_raw)
        except ValueError:
            raise XMLValidationError(f"{prefix}: course_id должен быть числом, получено: '{course_id_raw}'")

        start_date = _get_text(node, 'start_date') or _get_text(node, 'StartDate')
        if not start_date:
            raise XMLValidationError(f"{prefix}: обязательное поле start_date отсутствует")
        if not date_pattern.match(start_date):
            raise XMLValidationError(f"{prefix}: start_date должен быть в формате YYYY-MM-DD, получено: '{start_date}'")

        end_date = _get_text(node, 'end_date') or _get_text(node, 'EndDate')
        if not end_date:
            raise XMLValidationError(f"{prefix}: обязательное поле end_date отсутствует")
        if not date_pattern.match(end_date):
            raise XMLValidationError(f"{prefix}: end_date должен быть в формате YYYY-MM-DD, получено: '{end_date}'")

        if end_date < start_date:
            raise XMLValidationError(f"{prefix}: end_date ({end_date}) не может быть раньше start_date ({start_date})")

        status = _get_text(node, 'status') or _get_text(node, 'Status') or 'planned'
        valid_statuses = {'planned', 'in_progress', 'completed', 'cancelled'}
        if status not in valid_statuses:
            raise XMLValidationError(
                f"{prefix}: недопустимый статус '{status}'. "
                f"Допустимые значения: {', '.join(sorted(valid_statuses))}"
            )

        return {
            "course_id":        course_id,
            "start_date":       start_date,
            "end_date":         end_date,
            "status":           status,
            "specification_id": None,
        }

    @staticmethod
    def save_groups_from_xml(parsed: Dict[str, Any], repo: GroupRepositoryInterface) -> Tuple[int, List[str]]:
        """
        Сохраняет группы из распарсенного XML в БД.

        Возвращает: (количество сохранённых, список предупреждений)
        """
        root_key = next(iter(parsed), None)
        if root_key is None:
            raise XMLValidationError("XML файл пустой")

        root = parsed[root_key]

        if root_key == 'TrainingGroup':
            nodes = [root]
        elif 'TrainingGroup' in root:
            nodes = _normalize_to_list(root['TrainingGroup'])
        elif 'group' in root:
            nodes = _normalize_to_list(root['group'])
        else:
            raise XMLValidationError(
                f"Неизвестная структура XML для групп. "
                f"Ожидается корневой тег <TrainingGroup>. "
                f"Получен: <{root_key}>"
            )

        if not nodes:
            raise XMLValidationError("XML не содержит ни одной записи группы")

        warnings = []
        count = 0

        for i, node in enumerate(nodes):
            group_data = XMLParser._validate_group(node, i)
            repo.create(group_data)
            count += 1

        return count, warnings
