from typing import Dict, List, Any
from utils.db_connection import get_connection


# Репозиторий для работы с курсами в формате XML
class XMLCourseRepository:

    # Метод для сохранения курсов из XML в базу данных
    def save_from_xml(self, data: Dict[str, Any]) -> None:
        with get_connection() as conn:
            with conn.cursor() as cursor:
                for course in data['root']['course']:
                    cursor.execute(
                        """INSERT INTO courses 
                           (course_name,
                            description,
                            duration_days,
                            price_per_person)
                           VALUES (%s, %s, %s, %s)""",
                        (course['course_name'], course.get('description'), course['duration_days'], course['price_per_person'])
                    )

    # Метод для извлечения курсов из БД в формате словаря для XML
    def fetch_to_xml(self) -> List[Dict]:
        with get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT * FROM courses")
                return [dict(row) for row in cursor.fetchall()]


# Репозиторий для работы с сотрудниками в формате XML
class XMLEmployeeRepository:

    # Метод для сохранения сотрудников из XML в базу данных
    def save_from_xml(self, data: Dict[str, Any]) -> None:
        with get_connection() as conn:
            with conn.cursor() as cursor:
                for employee in data['root']['employee']:
                    cursor.execute(
                        "INSERT INTO employees (full_name, company_id, email) VALUES (%s, %s, %s)",
                        (employee['full_name'], employee['company_id'], employee.get('email'))
                    )

    # Метод для извлечения сотрудников из БД в формате словаря для XML
    def fetch_to_xml(self) -> List[Dict]:
        with get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT * FROM employees")
                return [dict(row) for row in cursor.fetchall()]


# Репозиторий для работы с учебными группами в формате XML
class XMLGroupRepository:

    # Метод для сохранения групп из XML в базу данных
    def save_from_xml(self, data: Dict[str, Any]) -> None:
        with get_connection() as conn:
            with conn.cursor() as cursor:
                # Итерация по каждой группе в XML и вставка её в БД
                for group in data['root']['group']:
                    cursor.execute(
                        """INSERT INTO groups 
                               (course_id,
                                start_date,
                                end_date,
                                status,
                                specification_id)
                           VALUES (%s, %s, %s, %s, %s)""",
                        (group['course_id'], group['start_date'], group['end_date'], group['status'], group.get('specification_id'))
                    )

    # Метод для извлечения групп из БД в формате словаря для XML
    def fetch_to_xml(self) -> List[Dict]:
        with get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT * FROM groups")
                return [dict(row) for row in cursor.fetchall()]


xml_course_repository = XMLCourseRepository()
xml_employee_repository = XMLEmployeeRepository()
xml_group_repository = XMLGroupRepository()
