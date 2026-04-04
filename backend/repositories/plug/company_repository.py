import uuid
from typing import Dict, List, Optional
from repositories.base import CompanyRepositoryInterface


class CompanyRepository(CompanyRepositoryInterface):
    def __init__(self):
        self.companies: Dict[str, Dict] = {}

    def get_all(self) -> List[Dict]:
        return list(self.companies.values())

    def create(self, data: Dict) -> Dict:
        company_id = str(uuid.uuid4())

        company = {
            "id": company_id,
            "code": data.get("code"),
            "name": data.get("name"),
        }

        self.companies[company_id] = company
        return company

    def update(self, company_id: str, data: Dict) -> Optional[Dict]:
        if company_id not in self.companies:
            return None

        # Обновляем только те поля, которые пришли (не перезаписываем None)
        company = self.companies[company_id]
        for key, value in data.items():
            if value is not None:  # важно для частичного обновления
                company[key] = value

        return company

    def delete(self, company_id: str) -> bool:
        return self.companies.pop(company_id, None) is not None


# Singleton
company_repository: CompanyRepositoryInterface = CompanyRepository()