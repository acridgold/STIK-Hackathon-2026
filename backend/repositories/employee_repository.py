import uuid
from typing import Dict, List, Optional

from repositories.base import EmployeeRepositoryInterface


class EmployeeRepository(EmployeeRepositoryInterface):
    def __init__(self):
        self.employees: Dict[str, Dict] = {}

    def get_all(self) -> List[Dict]:
        return list(self.employees.values())

    def get_by_id(self, employee_id: str) -> Optional[Dict]:
        return self.employees.get(employee_id)

    def create(self, data: Dict) -> Dict:
        employee_id = str(uuid.uuid4())

        employee = {
            "id": employee_id,
            "full_name": data.get("full_name"),
            "company_id": data.get("company_id"),
            "email": data.get("email"),
        }

        self.employees[employee_id] = employee
        return employee

    def update(self, employee_id: str, data: Dict) -> Optional[Dict]:
        employee = self.employees.get(employee_id)
        if not employee:
            return None

        for key, value in data.items():
            if value is not None:
                employee[key] = value

        return employee

    def delete(self, employee_id: str) -> bool:
        return self.employees.pop(employee_id, None) is not None


# Singleton
employee_repository: EmployeeRepositoryInterface = EmployeeRepository()
