from flask import Flask, request
from flask_cors import CORS

from routes.companies import companies_bp
from routes.courses import courses_bp
from routes.employees import employees_bp
from routes.groups import groups_bp
from routes.specifications import specifications_bp
from routes.xml import xml_bp

app = Flask(__name__)
CORS(app, origins=["https://acridgold.github.io"])

app.json.ensure_ascii = False

# Роуты
app.register_blueprint(companies_bp,      url_prefix="/api/companies")
app.register_blueprint(courses_bp,        url_prefix="/api/courses")
app.register_blueprint(employees_bp,      url_prefix="/api/employees")
app.register_blueprint(groups_bp,         url_prefix="/api/groups")
app.register_blueprint(specifications_bp, url_prefix="/api/specifications")
app.register_blueprint(xml_bp,            url_prefix="/api/xml")

@app.before_request
def log_request():
    print(f"{request.method} {request.path}")


if __name__ == "__main__":
    app.run(debug=True, port=8080)
