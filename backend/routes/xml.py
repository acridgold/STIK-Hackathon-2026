from flask import Blueprint, request, jsonify
import xmltodict

from repositories.database.course_repository import course_repository
from repositories.database.employee_repository  import employee_repository
from utils.xml_parser import XMLParser, XMLValidationError, ForeignKeyValidationError, detect_xml_type

xml_bp = Blueprint("xml", __name__)


@xml_bp.route('/upload', methods=['POST'])
def upload_xml():
    """
    Загрузка одного XML файла.

    Поддерживаемые типы:
      - courses   — Курсы (Edu_Course)
      - employees — Участники обучения (Edu_Participant)
    """
    file = request.files.get('file')
    data_type = request.form.get('type')

    if not file:
        return jsonify({"error": "Файл не передан"}), 400

    if not file.filename.endswith('.xml'):
        return jsonify({"error": "Ожидается файл с расширением .xml"}), 400

    try:
        xml_data = xmltodict.parse(file.read(), encoding='utf-8')
    except Exception as e:
        return jsonify({"error": f"Не удалось распарсить XML: {str(e)}"}), 400

    if not data_type:
        data_type = detect_xml_type(xml_data)
        if data_type == 'unknown':
            return jsonify({
                "error": "Не удалось определить тип XML. "
                         "Передайте параметр type: courses | employees"
            }), 400

    try:
        if data_type == 'courses':
            count, warnings = XMLParser.save_courses_from_xml(xml_data, course_repository)
        elif data_type == 'employees':
            count, warnings = XMLParser.save_employees_from_xml(xml_data, employee_repository)
        else:
            return jsonify({
                "error": f"Неверный тип '{data_type}'. Ожидается: courses | employees"
            }), 400

    except ForeignKeyValidationError as e:
        return jsonify({"error": str(e)}), 400
    except XMLValidationError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Ошибка сохранения в БД: {str(e)}"}), 500

    response = {"success": True, "count": count}
    if warnings:
        response["warnings"] = warnings

    return jsonify(response), 200


@xml_bp.route('/sync', methods=['POST'])
def sync_xml():
    courses_file = request.files.get('courses')
    employees_file = request.files.get('employees')

    if not any([courses_file, employees_file]):
        return jsonify({"error": "Не передан ни один файл"}), 400

    imported = {"courses": 0, "employees": 0}
    all_warnings = []
    errors = []

    if courses_file:
        try:
            data = xmltodict.parse(courses_file.read(), encoding='utf-8')
            count, warnings = XMLParser.save_courses_from_xml(data, course_repository)
            imported["courses"] = count
            all_warnings.extend(warnings)
        except XMLValidationError as e:
            errors.append(f"courses: {str(e)}")
        except Exception as e:
            errors.append(f"courses: ошибка обработки — {str(e)}")

    if employees_file:
        try:
            data = xmltodict.parse(employees_file.read(), encoding='utf-8')
            count, warnings = XMLParser.save_employees_from_xml(data, employee_repository)
            imported["employees"] = count
            all_warnings.extend(warnings)
        except XMLValidationError as e:
            errors.append(f"employees: {str(e)}")
        except Exception as e:
            errors.append(f"employees: ошибка обработки — {str(e)}")

    response = {
        "success": len(errors) == 0,
        "imported": imported,
    }
    if all_warnings:
        response["warnings"] = all_warnings
    if errors:
        response["errors"] = errors

    status_code = 200 if len(errors) == 0 else 207
    return jsonify(response), status_code