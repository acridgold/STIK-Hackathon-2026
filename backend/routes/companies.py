from flask import Blueprint, request, jsonify
from repositories.database.company_repository import company_repository
from schemas.company_schema import CompanyCreate, CompanyUpdate
from pydantic import ValidationError

companies_bp = Blueprint("companies", __name__)


@companies_bp.route("", methods=["GET"])
def get_companies():
    companies = company_repository.get_all()
    return jsonify(companies)


@companies_bp.route("", methods=["POST"])
def create_company():
    try:
        data = CompanyCreate.model_validate(request.json)
        company = company_repository.create(data.model_dump())
        return jsonify(company), 201
    except ValidationError as e:
        return jsonify({
            "error": "Validation error",
            "details": e.errors(include_url=False, include_context=False)
        }), 400


@companies_bp.route("/<company_id>", methods=["PUT"])
def update_company(company_id: str):
    try:
        data = CompanyUpdate.model_validate(request.json)
        company = company_repository.update(company_id, data.model_dump(exclude_unset=True))

        if not company:
            return jsonify({"message": "Company not found"}), 404

        return jsonify(company)
    except ValidationError as e:
        return jsonify({
            "error": "Validation error",
            "details": e.errors(include_url=False, include_context=False)
        }), 400


@companies_bp.route("/<company_id>", methods=["DELETE"])
def delete_company(company_id: str):
    result = company_repository.delete(company_id)

    if not result:
        return jsonify({"message": "Company not found"}), 404

    return jsonify({"message": "Company successfully deleted"}), 200