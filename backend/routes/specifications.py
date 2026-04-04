from flask import Blueprint, request, jsonify
from repositories.plug.specification_repository import specification_repository
from schemas.specification_schema import SpecificationCreate, SpecificationUpdate
from pydantic import ValidationError

specifications_bp = Blueprint("specifications", __name__)


@specifications_bp.route("", methods=["GET"])
def get_specifications():
    """Получить все спецификации"""
    specs = specification_repository.get_all()
    return jsonify(specs)


@specifications_bp.route("/<spec_id>", methods=["GET"])
def get_specification(spec_id: str):
    """Получить конкретную спецификацию"""
    spec = specification_repository.get_by_id(spec_id)

    if not spec:
        return jsonify({"message": "Specification not found"}), 404

    return jsonify(spec)


@specifications_bp.route("", methods=["POST"])
def create_specification():
    """Создать спецификацию"""
    try:
        data = SpecificationCreate.model_validate(request.json)
        spec = specification_repository.create(data.model_dump())
        return jsonify(spec), 201
    except ValidationError as e:
        return jsonify({
            "error": "Validation error",
            "details": e.errors(include_url=False, include_context=False)
        }), 400


@specifications_bp.route("/<spec_id>", methods=["PUT"])
def update_specification(spec_id: str):
    """Обновить спецификацию"""
    try:
        data = SpecificationUpdate.model_validate(request.json)
        spec = specification_repository.update(spec_id, data.model_dump(exclude_unset=True))

        if not spec:
            return jsonify({"message": "Specification not found"}), 404

        return jsonify(spec)
    except ValidationError as e:
        return jsonify({
            "error": "Validation error",
            "details": e.errors(include_url=False, include_context=False)
        }), 400


@specifications_bp.route("/<spec_id>", methods=["DELETE"])
def delete_specification(spec_id: str):
    """Удалить спецификацию"""
    result = specification_repository.delete(spec_id)

    if not result:
        return jsonify({"message": "Specification not found"}), 404

    return jsonify({"message": "Specification successfully deleted"}), 200
