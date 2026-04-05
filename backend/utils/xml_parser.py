"""
xml_parser.py

Парсер XML файлов из системы Global ERP.

Поддерживаемые форматы:

1. Курс (Edu_Course)
2. Участник обучения (Edu_Participant)
"""
from __future__ import annotations

from typing import Dict, Any, List, Tuple
from repositories.base import (
    CourseRepositoryInterface,
    EmployeeRepositoryInterface,
)


# ─── Исключения для понятных сообщений об ошибках ──────────────────────────

class XMLValidationError(Exception):
    """Ошибка валидации XML — возвращается пользователю как 400."""
    pass


class ForeignKeyValidationError(XMLValidationError):
    """Ошибка внешней ссылки — сущность не найдена."""
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
    Возвращает: 'courses' | 'employees' | 'unknown'
    """
    root_key = next(iter(parsed), None)
    if root_key is None:
        return 'unknown'

    key_lower = root_key.lower()

    if 'edu_course' in key_lower:
        return 'courses'
    if 'edu_participant' in key_lower or 'employee' in key_lower:
        return 'employees'

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
        """Валидирует одну запись курса из XML."""
        prefix = f"Курс #{index + 1}"

        course_name = _require(node, 'sCourseHL', f"{prefix}: название курса")
        if len(course_name) > 255:
            raise XMLValidationError(f"{prefix}: название курса не должно превышать 255 символов")

        duration_days = _require_int(node, 'nDurationInDays', f"{prefix}: длительность в днях", min_val=1)
        price = _require_float(node, 'nPricePerPerson', f"{prefix}: цена за человека", min_val=0.01)

        return {
            "course_name": course_name,
            "description": _get_text(node, 'sDescription'),
            "duration_days": duration_days,
            "price_per_person": price,
            "external_id": _get_text(node, 'id'),
        }

    @staticmethod
    def save_courses_from_xml(parsed: Dict[str, Any], repo: CourseRepositoryInterface) -> Tuple[int, List[str]]:
        """Сохраняет курсы из распарсенного XML в БД."""
        root_key = next(iter(parsed), None)
        if root_key is None:
            raise XMLValidationError("XML файл пустой или не содержит данных")

        root = parsed[root_key]

        if root_key == 'Edu_Course':
            nodes = [root]
        elif 'Edu_Course' in root:
            nodes = _normalize_to_list(root['Edu_Course'])
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

    # ── Участники обучения (Сотрудники) ─────────────────────────────────────

    @staticmethod
    def _validate_employee(node: Dict, index: int) -> Dict:
        """Валидирует одну запись участника обучения из XML."""
        prefix = f"Участник обучения #{index + 1}"

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
            "full_name": full_name,
            "company_id": company_id,
            "email": email,
            "external_id": _get_text(node, 'id'),
            "code": _get_text(node, 'sCode'),
        }

    @staticmethod
    def save_employees_from_xml(parsed: Dict[str, Any], repo: EmployeeRepositoryInterface) -> Tuple[int, List[str]]:
        """Сохраняет участников обучения из распарсенного XML в БД."""
        root_key = next(iter(parsed), None)
        if root_key is None:
            raise XMLValidationError("XML файл пустой")

        root = parsed[root_key]

        if root_key == 'Edu_Participant':
            nodes = [root]
        elif 'Edu_Participant' in root:
            nodes = _normalize_to_list(root['Edu_Participant'])
        elif 'employee' in root:
            nodes = _normalize_to_list(root['employee'])
        else:
            raise XMLValidationError(
                f"Неизвестная структура XML для участников обучения. "
                f"Ожидается корневой тег <Edu_Participant> или <Edu_Participants>. "
                f"Получен: <{root_key}>"
            )

        if not nodes:
            raise XMLValidationError("XML не содержит ни одной записи участника обучения")

        warnings = []
        count = 0

        for i, node in enumerate(nodes):
            employee_data = XMLParser._validate_employee(node, i)
            repo.create(employee_data)
            count += 1

        return count, warnings