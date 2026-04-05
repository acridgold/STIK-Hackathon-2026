from typing import Dict, Any, List, Callable
from repositories.base import (
    CourseRepositoryInterface,
    EmployeeRepositoryInterface,
    GroupRepositoryInterface,
)

class XMLParser:
    """
    Универсальный класс для парсинга XML и сохранения данных в БД.
    Все методы — статические, экземпляр класса не требуется.
    """

    @staticmethod
    def save_courses_from_xml(data: Dict[str, Any], repo: CourseRepositoryInterface) -> int:
        """Сохраняет курсы из XML в базу данных"""
        if not data or 'root' not in data or 'course' not in data['root']:
            return 0

        courses = data['root']['course']
        # Если в XML только один курс — xmltodict возвращает dict, а не list
        if isinstance(courses, dict):
            courses = [courses]

        count = 0
        for course in courses:
            repo.create({
                "course_name": course['course_name'],
                "description": course.get('description'),
                "duration_days": int(course['duration_days']),
                "price_per_person": float(course['price_per_person']),
            })
            count += 1
        return count

    @staticmethod
    def save_employees_from_xml(data: Dict[str, Any], repo: EmployeeRepositoryInterface) -> int:
        """Сохраняет сотрудников из XML в базу данных"""
        if not data or 'root' not in data or 'employee' not in data['root']:
            return 0

        employees = data['root']['employee']
        if isinstance(employees, dict):
            employees = [employees]

        count = 0
        for employee in employees:
            repo.create({
                "full_name": employee['full_name'],
                "company_id": employee['company_id'],
                "email": employee.get('email'),
            })
            count += 1
        return count

    @staticmethod
    def save_groups_from_xml(data: Dict[str, Any], repo: GroupRepositoryInterface) -> int:
        """Сохраняет группы из XML в базу данных"""
        if not data or 'root' not in data or 'group' not in data['root']:
            return 0

        groups = data['root']['group']
        if isinstance(groups, dict):
            groups = [groups]

        count = 0
        for group in groups:
            repo.create({
                "course_id": group['course_id'],
                "start_date": group['start_date'],
                "end_date": group['end_date'],
                "status": group['status'],
                "specification_id": group.get('specification_id'),
            })
            count += 1
        return count

    @staticmethod
    def fetch_to_xml(repo, data_key: str = "item") -> List[Dict]:
        """Универсальный метод для получения данных для экспорта в XML"""
        return repo.get_all()