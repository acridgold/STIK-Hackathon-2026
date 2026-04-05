
from __future__ import annotations

from typing import Dict, Any, List, Tuple
from repositories.base import (
    CourseRepositoryInterface,
    EmployeeRepositoryInterface,
)


# ─── Исключения для понятных сообщений об ошибках ──────────────────────────

class XMLValidationError(Exception):
    pass


class ForeignKeyValidationError(XMLValidationError):
    pass


# ─── Вспомогательные функции ────────────────────────────────────────────────

def _get_text(node: Dict, key: str) -> str | None:
    val = node.get(key)
    if val is None:
        return None
    return str(val).strip() or None


def _require(node: Dict, key: str, label: str) -> str:
    val = _get_text(node, key)
    if not val:
        raise XMLValidationError(f"Обязательное поле <{key}> ({label}) отсутствует или пустое")
    return val


def _require_int(node: Dict, key: str, label: str, min_val: int = 1) -> int:
    raw = _require(node, key, label)
    try:
        val = int(raw)
    except ValueError:
        raise XMLValidationError(f"Поле <{key}> ({label}) должно быть целым числом, получено: '{raw}'")
    if val < min_val:
        raise XMLValidationError(f"Поле <{key}> ({label}) должно быть >= {min_val}, получено: {val}")
    return val


def _require_float(node: Dict, key: str, label: str, min_val: float = 0.01) -> float:
    raw = _require(node, key, label)
    try:
        val = float(raw)
    except ValueError:
        raise XMLValidationError(f"Поле <{key}> ({label}) должно быть числом, получено: '{raw}'")
    if val < min_val:
        raise XMLValidationError(f"Поле <{key}> ({label}) должно быть > 0, получено: {val}")
    return val


def _normalize_to_list(data: Any) -> List[Dict]:
    if isinstance(data, dict):
        return [data]
    if isinstance(data, list):
        return data
    return []



def detect_xml_type(parsed: Dict) -> str:
    root_key = next(iter(parsed), None)
    if root_key is None:
        return 'unknown'

    key_lower = root_key.lower()

    if 'edu_course' in key_lower:
        return 'courses'
    if 'edu_participant' in key_lower or 'employee' in key_lower:
        return 'employees'

    return 'unknown'



class XMLParser:

    @staticmethod
    def _validate_course(node: Dict, index: int) -> Dict:
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

    @staticmethod
    def _validate_employee(node: Dict, index: int) -> Dict:
        """Валидирует одного участника обучения из XML (Edu_Participant)"""
        prefix = f"Участник #{index + 1}"

        # Основные обязательные поля
        last_name = _require(node, 'sLastName', f"{prefix}: фамилия")
        first_name = _require(node, 'sFirstName', f"{prefix}: имя")
        middle_name = _get_text(node, 'sMiddleName')

        # Формируем полное ФИО
        full_name_parts = [last_name, first_name]
        if middle_name:
            full_name_parts.append(middle_name)
        full_name = " ".join(full_name_parts)

        # ID организации
        organization_id_raw = _require(node, 'idOrganization', f"{prefix}: idOrganization")
        try:
            company_id = int(organization_id_raw)
        except ValueError:
            raise XMLValidationError(
                f"{prefix}: idOrganization должен быть числом, получено: '{organization_id_raw}'"
            )

        # Дополнительные поля
        code = _get_text(node, 'sCode')
        external_id = _get_text(node, 'id')
        organization_name = _get_text(node, 'idOrganizationHL')  # название организации из XML

        # Проверка длины ФИО
        if len(full_name) > 255:
            raise XMLValidationError(f"{prefix}: ФИО слишком длинное (максимум 255 символов)")

        return {
            "full_name": full_name,
            "last_name": last_name,
            "first_name": first_name,
            "middle_name": middle_name,
            "company_id": company_id,
            "company_name_from_xml": organization_name,  # временно сохраняем, чтобы потом денормализовать
            "email": None,  # в твоём примере email отсутствует
            "external_id": external_id,
            "code": code,
        }

    @staticmethod
    def save_employees_from_xml(parsed: Dict[str, Any], repo: EmployeeRepositoryInterface) -> Tuple[int, List[str]]:
        """Сохраняет участников обучения из XML"""
        root_key = next(iter(parsed), None)
        if root_key is None:
            raise XMLValidationError("XML файл пустой")

        # Поддержка как одиночного элемента, так и списка
        if root_key == 'Edu_Participant':
            nodes = [parsed[root_key]]
        else:
            root = parsed[root_key]
            nodes = _normalize_to_list(root.get('Edu_Participant') or root.get('employee'))

        if not nodes:
            raise XMLValidationError("XML не содержит записей Edu_Participant")

        warnings: List[str] = []
        count = 0

        for i, node in enumerate(nodes):
            try:
                employee_data = XMLParser._validate_employee(node, i)
                repo.create(employee_data)  # ← здесь создаётся объект в БД
                count += 1
            except XMLValidationError as e:
                warnings.append(str(e))
                continue  # можно продолжить обработку остальных записей

        return count, warnings