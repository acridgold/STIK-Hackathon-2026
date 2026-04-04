import uuid
from typing import Dict, List, Optional

VAT_RATE = 0.22  # 22%


class DocumentRepository:
    def __init__(self):
        self.specifications: Dict[str, Dict] = {}

    def _enrich(self, spec: Dict) -> Dict:
        """
        Вычисляет суммы по спецификации на основе стоимости привязанных групп.
        Импорт group_repository делается внутри метода, чтобы избежать
        циклических импортов (group_repository импортирует course_repository).
        """
        from repositories.group_repository import group_repository

        group_ids: List[str] = spec.get("group_ids", [])
        subtotal = 0.0

        for gid in group_ids:
            group = group_repository.get_by_id(gid)
            if group:
                subtotal += group.get("group_cost", 0)

        vat = round(subtotal * VAT_RATE, 2)
        total = round(subtotal + vat, 2)

        return {
            **spec,
            "subtotal": round(subtotal, 2),   # Сумма без НДС
            "vat": vat,                        # Сумма НДС (22%)
            "total": total,                    # Итого с НДС
        }

    def get_all(self) -> List[Dict]:
        return [self._enrich(s) for s in self.specifications.values()]

    def get_by_id(self, spec_id: str) -> Optional[Dict]:
        spec = self.specifications.get(spec_id)
        if not spec:
            return None
        return self._enrich(spec)

    def create(self, data: Dict) -> Dict:
        spec_id = str(uuid.uuid4())

        spec = {
            "id": spec_id,
            "spec_date": str(data.get("spec_date", "")),
            "spec_number": data.get("spec_number"),
            "company_id": data.get("company_id"),
            "group_ids": data.get("group_ids", []),
        }

        self.specifications[spec_id] = spec
        return self._enrich(spec)

    def update(self, spec_id: str, data: Dict) -> Optional[Dict]:
        spec = self.specifications.get(spec_id)
        if not spec:
            return None

        for key, value in data.items():
            if value is not None:
                spec[key] = str(value) if key == "spec_date" else value

        return self._enrich(spec)

    def delete(self, spec_id: str) -> bool:
        return self.specifications.pop(spec_id, None) is not None


# Singleton
document_repository: DocumentRepositoryInterface = DocumentRepository()
